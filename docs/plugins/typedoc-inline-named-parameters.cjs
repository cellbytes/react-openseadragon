// TypeDoc plugin: replaces destructured-props parameters with their inlined
// shape so the generated API pages show every prop directly instead of just
// linking out to the interface page.
//
// Why this exists
// ---------------
// When library code is written as `function TiledImage({ a, b }: SomeProps)`,
// TypeScript represents the parameter as a single anonymous binding. TypeDoc
// faithfully records this as `name: "__namedParameters", type: <reference
// to SomeProps>`. The Docusaurus API plugin renders that as a one-line
// signature with a link to the SomeProps page; readers have to click through
// to see what props the function actually accepts.
//
// What this plugin does
// ---------------------
// After TypeDoc finishes resolving, we walk every signature in the project.
// For each parameter whose name is `__namedParameters` (or numeric: `__0`)
// and whose type is a reference to an interface or type alias, we:
//
//   1. Rename the parameter to `props` (the conventional name in React).
//   2. Replace its type with an inline reflection that carries the same
//      properties as the referenced interface. The Docusaurus API renderer
//      already special-cases `type === 'reflection'` parameters and lists
//      their children inline, so one mutation gets us a full inline prop
//      table on every function and hook page.
//
// The interface is resolved in two ways:
//   - If TypeDoc has it in its reflection map (e.g. it's re-exported from
//     the package entry point), we point at that reflection directly.
//   - If TypeDoc has no reflection for it (e.g. a non-exported local
//     interface), we use the `symbolId` that the ReferenceType carries to
//     find the original TypeScript declaration, then ask TypeDoc's own
//     converter to turn that declaration's type into a reflection.
//
// No library source changes are required. The plugin uses TypeDoc's
// documented `Converter` events and the TypeScript compiler API that
// TypeDoc itself runs against; nothing patches third-party code.

const ts = require('typescript');
const {
  Comment,
  DeclarationReflection,
  ReflectionFlag,
  ReflectionKind,
  ReflectionType,
  Converter,
} = require('typedoc');

const NAMED_RE = /^(__namedParameters|__\d+)$/;

function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    const project = context.project;
    if (!project) return;

    for (const reflection of Object.values(project.reflections)) {
      for (const sig of collectSignatures(reflection)) {
        for (const param of sig.parameters ?? []) {
          if (!param.name || !NAMED_RE.test(param.name)) continue;
          const declaration = resolveParamDeclaration(param.type, context);
          if (!declaration) continue;
          param.name = 'props';
          param.type = new ReflectionType(declaration);
        }
      }
    }
  });
}

function collectSignatures(reflection) {
  const result = [];
  if (reflection.signatures) result.push(...reflection.signatures);
  if (reflection.type && reflection.type.declaration?.signatures) {
    result.push(...reflection.type.declaration.signatures);
  }
  return result;
}

function resolveParamDeclaration(type, context) {
  if (!type || type.type !== 'reference') return undefined;

  // Direct hit: target reflection is in the project.
  const refl = type.reflection;
  if (refl && typeof refl === 'object' && typeof refl.kindOf === 'function') {
    if (refl.kindOf(ReflectionKind.Interface) && refl.children?.length) {
      return refl;
    }
    if (
      refl.kindOf(ReflectionKind.TypeAlias) &&
      refl.type?.type === 'reflection' &&
      refl.type.declaration?.children?.length
    ) {
      return refl.type.declaration;
    }
  }

  // Fallback: ReferenceType carries a `symbolId` pointing at the original
  // TypeScript declaration even when no reflection exists. Use it to find
  // the source file and ask TypeDoc's converter to convert the type.
  if (type.symbolId?.fileName && type.symbolId.qualifiedName) {
    return resolveViaTypeScript(type.symbolId, context);
  }
  return undefined;
}

function findDeclarationNode(sourceFile, name) {
  let found;
  function visit(node) {
    if (found) return;
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      node.name.text === name
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(sourceFile, visit);
  return found;
}

function resolveViaTypeScript(symbolId, context) {
  // At EVENT_RESOLVE_END the active per-file program is gone, but the
  // converter still holds every program it ran against via `context.programs`.
  const programs = context.programs ?? [];
  let program;
  let sourceFile;
  for (const p of programs) {
    const sf = p.getSourceFile(symbolId.fileName);
    if (sf) {
      program = p;
      sourceFile = sf;
      break;
    }
  }
  if (!program || !sourceFile) return undefined;

  const declarationNode = findDeclarationNode(sourceFile, symbolId.qualifiedName);
  if (!declarationNode) return undefined;

  const checker = program.getTypeChecker();
  const symbol = checker.getSymbolAtLocation(declarationNode.name);
  if (!symbol) return undefined;
  const tsType = checker.getDeclaredTypeOfSymbol(symbol);
  if (!tsType) return undefined;

  // Build a synthetic ReflectionType declaration matching the JSON shape the
  // Docusaurus API renderer reads. We walk the interface's own properties
  // (ignoring inherited / never-emitted ones) and convert each property's
  // type via TypeDoc, so generics and complex unions resolve correctly.
  //
  // `setActiveProgram` is needed because convertType reads `context.checker`,
  // which asserts an active program. We restore it after each conversion so
  // the rest of the resolve pipeline behaves as before.
  context.setActiveProgram(program);
  let children;
  try {
    children = checker
      .getPropertiesOfType(tsType)
      .map((prop) => buildChild(prop, declarationNode, context, checker))
      .filter(Boolean);
  } finally {
    context.setActiveProgram(undefined);
  }
  if (!children.length) return undefined;

  const parent = new DeclarationReflection(
    symbolId.qualifiedName,
    ReflectionKind.TypeLiteral,
    context.project
  );
  for (const child of children) {
    child.parent = parent;
    context.project.registerReflection(child);
  }
  parent.children = children;
  context.project.registerReflection(parent);
  return parent;
}

function buildChild(propSymbol, locationNode, context, checker) {
  const valueDecl = propSymbol.valueDeclaration || propSymbol.declarations?.[0];
  const propType = valueDecl
    ? checker.getTypeOfSymbolAtLocation(propSymbol, valueDecl)
    : checker.getTypeOfSymbolAtLocation(propSymbol, locationNode);
  if (!propType) return undefined;
  const tdType = context.converter.convertType(context, propType);
  if (!tdType) return undefined;

  const child = new DeclarationReflection(
    propSymbol.name,
    ReflectionKind.Property,
    context.project
  );
  if (propSymbol.flags & ts.SymbolFlags.Optional) {
    child.flags.setFlag(ReflectionFlag.Optional, true);
  }
  child.type = tdType;
  child.comment = extractComment(valueDecl);
  return child;
}

function extractComment(declaration) {
  if (!declaration) return undefined;
  // Pull the leading JSDoc summary text via TypeScript so the comment shape
  // matches what TypeDoc emits for normal interface properties.
  const jsDocs = ts.getJSDocCommentsAndTags(declaration).filter((d) => ts.isJSDoc(d));
  const text = jsDocs
    .map((d) =>
      typeof d.comment === 'string' ? d.comment : (d.comment?.map((c) => c.text).join('') ?? '')
    )
    .filter(Boolean)
    .join('\n\n')
    .trim();
  if (!text) return undefined;
  const comment = new Comment([{ kind: 'text', text }]);
  return comment;
}

module.exports = { load };
