#!/usr/bin/env python3
"""Make a tsgo language server usable by a push-only, pull-unaware LSP client.

tsgo is multi-project on its own: it walks to each file's nearest tsconfig.json,
so one instance serves every TypeScript project in the workspace with the right
compiler options and the right node_modules. What it does not do is hand a
client like Claude Code anything it can read.

Two mismatches sit between them, and this bridge closes both:

* tsgo reports through the pull model. It answers `textDocument/diagnostic` on
  request and pushes only empty `publishDiagnostics` notifications, while the
  client listens for pushed diagnostics and never asks. The bridge pulls after
  every edit and republishes the result as a push.
* tsgo sends `client/registerCapability` during startup and waits for a reply.
  The client has no handler for it, so an unbridged session hangs before the
  first file is even opened. The bridge answers it.

Everything else is passed through untouched, so navigation (definitions,
references, hover, rename) is whatever tsgo natively supports.
"""

import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

# How long to let edits settle before asking tsgo to re-check a file. Keystroke
# level debouncing is pointless here - edits arrive as whole-file writes from a
# tool - but a burst of writes across several files should still collapse.
DEBOUNCE_SECONDS = 0.35

# A pull that takes longer than this is treated as a miss rather than being
# waited on, so one wedged request cannot stall every later refresh.
DIAGNOSTIC_TIMEOUT_SECONDS = 20.0

REFRESH_TRIGGERS = frozenset(
    {"textDocument/didOpen", "textDocument/didChange", "textDocument/didSave"},
)

# Server requests the client cannot answer. Anything absent from this map is
# forwarded up, so a genuinely new request is visible rather than silently eaten.
UNANSWERABLE_SERVER_REQUESTS = frozenset(
    {"client/registerCapability", "client/unregisterCapability"}
)

# tsgo narrates snapshot cloning and cache statistics at info level; only real
# problems are worth putting in the client's log.
LOG_LEVEL_WARNING = 2


def log(message: str) -> None:
    """Write a bridge diagnostic to stderr, where the LSP client collects it."""
    print(f"[tsgo-bridge] {message}", file=sys.stderr, flush=True)


def read_frame(stream: Any) -> dict[str, Any] | None:
    """Read one `Content-Length` framed JSON-RPC message, or None at EOF."""
    length = 0
    while True:
        line = stream.readline()
        if not line:
            return None
        if line in (b"\r\n", b"\n"):
            break
        name, _, value = line.decode("ascii", "replace").partition(":")
        if name.strip().lower() == "content-length":
            length = int(value.strip())
    if length == 0:
        return None
    body = b""
    while len(body) < length:
        chunk = stream.read(length - len(body))
        if not chunk:
            return None
        body += chunk
    return json.loads(body)


def write_frame(stream: Any, lock: threading.Lock, message: dict[str, Any]) -> None:
    """Write one framed JSON-RPC message, serialized against other writers."""
    body = json.dumps(message).encode()
    with lock:
        stream.write(b"Content-Length: %d\r\n\r\n%s" % (len(body), body))
        stream.flush()


def find_tsgo(workspace: Path) -> list[str]:
    """Locate the tsgo binary, preferring the one a project here pins.

    Repos pin different native-preview builds, and the point of using tsgo at
    all is that a file is checked the way its own `npm run typecheck` checks it.
    """
    override = os.environ.get("TSGO_BIN")
    if override:
        return [override, "--lsp", "--stdio"]
    candidates = [workspace / "node_modules" / ".bin" / "tsgo"]
    candidates += sorted(workspace.glob("*/node_modules/.bin/tsgo"))
    for candidate in candidates:
        if candidate.is_file():
            return [str(candidate), "--lsp", "--stdio"]
    found = shutil.which("tsgo")
    if found:
        return [found, "--lsp", "--stdio"]
    message = f"no tsgo binary found under {workspace}"
    raise RuntimeError(message)


def client_capabilities(params: dict[str, Any]) -> dict[str, Any]:
    """Add pull-diagnostic support to what the client declared.

    The bridge, not the client, is the one that consumes pull diagnostics, so it
    has to advertise them or tsgo leaves its diagnostic provider off.
    """
    capabilities = dict(params.get("capabilities") or {})
    text_document = dict(capabilities.get("textDocument") or {})
    text_document["diagnostic"] = {
        "dynamicRegistration": False,
        "relatedDocumentSupport": False,
    }
    capabilities["textDocument"] = text_document
    return {**params, "capabilities": capabilities}


def send_to_server(state: dict[str, Any], message: dict[str, Any]) -> None:
    write_frame(state["server"].stdin, state["server_lock"], message)


def send_upstream(state: dict[str, Any], message: dict[str, Any]) -> None:
    write_frame(state["stdout"], state["stdout_lock"], message)


def request_server(
    state: dict[str, Any], method: str, params: dict[str, Any]
) -> dict[str, Any] | None:
    """Issue a bridge-owned request to tsgo and wait for its reply.

    Ids are namespaced so they can never collide with the client's own, which
    are forwarded verbatim.
    """
    with state["request_lock"]:
        request_id = f"tsgo-bridge:{state['next_request_id']}"
        state["next_request_id"] += 1
        waiter: dict[str, Any] = {"event": threading.Event(), "response": None}
        state["waiters"][request_id] = waiter
    send_to_server(
        state, {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}
    )
    if not waiter["event"].wait(DIAGNOSTIC_TIMEOUT_SECONDS):
        with state["request_lock"]:
            state["waiters"].pop(request_id, None)
        log(f"timed out waiting for {method}")
        return None
    return waiter["response"]


def publish(state: dict[str, Any], uri: str, diagnostics: list[dict[str, Any]]) -> None:
    send_upstream(
        state,
        {
            "jsonrpc": "2.0",
            "method": "textDocument/publishDiagnostics",
            "params": {"uri": uri, "diagnostics": diagnostics},
        },
    )


def refresh_diagnostics(state: dict[str, Any], uri: str) -> None:
    """Pull diagnostics for one document and push them to the client."""
    response = request_server(
        state, "textDocument/diagnostic", {"textDocument": {"uri": uri}}
    )
    if response is None or "result" not in response:
        return
    report = response["result"] or {}
    if report.get("kind") == "unchanged":
        return
    publish(state, uri, report.get("items") or [])


def debounce_worker(state: dict[str, Any]) -> None:
    """Coalesce edit notifications into one pull per document."""
    while True:
        with state["pending_lock"]:
            while not state["pending"]:
                state["pending_ready"].wait()
            due = min(state["pending"].values())
            delay = due - time.monotonic()
            if delay > 0:
                state["pending_ready"].wait(delay)
                continue
            now = time.monotonic()
            ready = [
                uri for uri, deadline in state["pending"].items() if deadline <= now
            ]
            for uri in ready:
                del state["pending"][uri]
        for uri in ready:
            refresh_diagnostics(state, uri)


def schedule_refresh(state: dict[str, Any], uri: str) -> None:
    with state["pending_lock"]:
        state["pending"][uri] = time.monotonic() + DEBOUNCE_SECONDS
        state["pending_ready"].notify_all()


def pump_server(state: dict[str, Any]) -> None:
    """Forward tsgo's output upstream, answering what the client cannot."""
    while True:
        message = read_frame(state["server"].stdout)
        if message is None:
            log("tsgo closed its output")
            return
        method = message.get("method")
        if method is not None and "id" in message:
            if method in UNANSWERABLE_SERVER_REQUESTS:
                send_to_server(
                    state, {"jsonrpc": "2.0", "id": message["id"], "result": None}
                )
                continue
            send_upstream(state, message)
            continue
        if method == "textDocument/publishDiagnostics":
            # tsgo pushes these empty; the real ones come from the pull worker,
            # and forwarding these would clear what the pull just published.
            continue
        if method == "window/logMessage":
            if (message.get("params") or {}).get(
                "type", LOG_LEVEL_WARNING
            ) <= LOG_LEVEL_WARNING:
                send_upstream(state, message)
            continue
        if method is None and "id" in message:
            waiter = None
            with state["request_lock"]:
                waiter = state["waiters"].pop(message["id"], None)
            if waiter is not None:
                waiter["response"] = message
                waiter["event"].set()
                continue
        send_upstream(state, message)


def document_uri(message: dict[str, Any]) -> str | None:
    params = message.get("params")
    if not isinstance(params, dict):
        return None
    holder = params.get("textDocument")
    if not isinstance(holder, dict):
        return None
    uri = holder.get("uri")
    return uri if isinstance(uri, str) else None


def handle_client_message(state: dict[str, Any], message: dict[str, Any]) -> None:
    method = message.get("method")
    if method == "exit":
        send_to_server(state, message)
        state["server"].terminate()
        sys.exit(0)
    send_to_server(state, message)
    if method in REFRESH_TRIGGERS:
        uri = document_uri(message)
        if uri is not None:
            schedule_refresh(state, uri)
    elif method == "textDocument/didClose":
        uri = document_uri(message)
        if uri is not None:
            with state["pending_lock"]:
                state["pending"].pop(uri, None)
            publish(state, uri, [])


def main() -> None:
    stdin = sys.stdin.buffer
    initialize = read_frame(stdin)
    if initialize is None or initialize.get("method") != "initialize":
        message = "expected an initialize request first"
        raise RuntimeError(message)

    params = initialize.get("params") or {}
    workspace = Path(params.get("rootPath") or Path.cwd())
    command = find_tsgo(workspace)
    log(f"workspace {workspace}, server {command[0]}")

    server = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=None,
        cwd=str(workspace),
    )
    pending_lock = threading.Lock()
    state: dict[str, Any] = {
        "stdout": sys.stdout.buffer,
        "stdout_lock": threading.Lock(),
        "server": server,
        "server_lock": threading.Lock(),
        "request_lock": threading.Lock(),
        "waiters": {},
        "next_request_id": 1,
        "pending": {},
        "pending_lock": pending_lock,
        "pending_ready": threading.Condition(pending_lock),
    }

    threading.Thread(target=pump_server, args=(state,), daemon=True).start()
    threading.Thread(target=debounce_worker, args=(state,), daemon=True).start()
    send_to_server(state, {**initialize, "params": client_capabilities(params)})

    while True:
        message = read_frame(stdin)
        if message is None:
            return
        handle_client_message(state, message)


if __name__ == "__main__":
    main()
