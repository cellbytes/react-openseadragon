import { Viewer } from 'openseadragon';
import { describe, expect, test, vi } from 'vitest';

import { createInstancePlugin, createPrototypePlugin } from './createPlugin';

describe('createPrototypePlugin', () => {
  test('returns an object with kind === "prototype" and the correct name', () => {
    const plugin = createPrototypePlugin('test-proto-name', vi.fn());
    expect(plugin.kind).toBe('prototype');
    expect(plugin.name).toBe('test-proto-name');
  });

  test('apply callback is called exactly once even when plugin.apply() is invoked multiple times', () => {
    const applyFn = vi.fn();
    const plugin = createPrototypePlugin('test-proto-idempotent', applyFn);
    const fakeOsd = {} as typeof import('openseadragon');

    plugin.apply(fakeOsd);
    plugin.apply(fakeOsd);
    plugin.apply(fakeOsd);

    expect(applyFn).toHaveBeenCalledTimes(1);
  });
});

describe('createInstancePlugin', () => {
  test('returns an object with kind === "instance" and the correct name', () => {
    const plugin = createInstancePlugin('test-instance-name', vi.fn());
    expect(plugin.kind).toBe('instance');
    expect(plugin.name).toBe('test-instance-name');
  });

  test('init is called with the viewer when executed', () => {
    const initFn = vi.fn();
    const plugin = createInstancePlugin('test-instance-init', initFn);
    const mockViewer = { destroy: vi.fn() } as unknown as Viewer;

    plugin.init(mockViewer);

    expect(initFn).toHaveBeenCalledOnce();
    expect(initFn).toHaveBeenCalledWith(mockViewer);
  });

  test('destroy is called with the viewer when provided', () => {
    const destroyFn = vi.fn();
    const plugin = createInstancePlugin('test-instance-destroy', vi.fn(), destroyFn);
    const mockViewer = { destroy: vi.fn() } as unknown as Viewer;

    plugin.destroy?.(mockViewer);

    expect(destroyFn).toHaveBeenCalledOnce();
    expect(destroyFn).toHaveBeenCalledWith(mockViewer);
  });

  test('does not throw when destroy is omitted', () => {
    const plugin = createInstancePlugin('test-instance-no-destroy', vi.fn());
    const mockViewer = { destroy: vi.fn() } as unknown as Viewer;

    expect(() => plugin.destroy?.(mockViewer)).not.toThrow();
  });
});
