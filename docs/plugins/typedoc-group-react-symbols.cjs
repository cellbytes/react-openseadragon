// TypeDoc plugin: re-buckets the auto-generated "Functions" group so that
// React components and hooks appear in their own sidebar sections.
//
// TypeDoc groups every callable export under "Functions" by default. For a
// React library this lumps hooks, components, and plain helpers together.
// We split that one group into three by naming convention:
//
//   - Hooks       -> name matches /^use[A-Z]/
//   - Components  -> name starts uppercase and does not end with "Context"
//   - Functions   -> everything else
//
// Group titles are then sorted so the order is Components, Hooks, Functions
// regardless of how the package's sidebar renderer orders them.

const { Converter, ReflectionGroup } = require('typedoc');

const HOOK_RE = /^use[A-Z]/;
const COMPONENT_RE = /^[A-Z]/;

function load(app) {
  // GroupPlugin runs at EVENT_RESOLVE_END, so `project.groups` only exists
  // afterwards. EVENT_END is fired right before JSON serialization, which
  // is the right place to re-bucket.
  app.converter.on(Converter.EVENT_END, (context) => {
    const project = context.project;
    if (!project) return;
    rebucket(project);
    for (const child of project.children ?? []) {
      if (Array.isArray(child.groups)) rebucket(child);
    }
  });
}

function rebucket(owner) {
  const groups = owner.groups;
  if (!Array.isArray(groups)) return;

  const functionsGroup = groups.find((g) => g.title === 'Functions');
  if (!functionsGroup || !functionsGroup.children?.length) return;

  const hooks = [];
  const components = [];
  const functions = [];
  for (const refl of functionsGroup.children) {
    const name = typeof refl === 'object' ? refl.name : undefined;
    if (!name) {
      functions.push(refl);
    } else if (HOOK_RE.test(name)) {
      hooks.push(refl);
    } else if (COMPONENT_RE.test(name) && !name.endsWith('Context')) {
      components.push(refl);
    } else {
      functions.push(refl);
    }
  }

  // Drop the original Functions bucket and slot the new ones in its place.
  const idx = groups.indexOf(functionsGroup);
  const replacements = [];
  if (components.length) replacements.push(makeGroup('Components', components));
  if (hooks.length) replacements.push(makeGroup('Hooks', hooks));
  if (functions.length) replacements.push(makeGroup('Functions', functions));
  groups.splice(idx, 1, ...replacements);
}

function makeGroup(title, children) {
  const group = new ReflectionGroup(title);
  group.children = children;
  return group;
}

module.exports = { load };
