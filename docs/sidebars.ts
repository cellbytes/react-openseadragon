import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guide: [
    { type: 'doc', id: 'getting-started', label: 'Getting started' },
    { type: 'doc', id: 'multi-image', label: 'Multiple images' },
    { type: 'doc', id: 'scalebar-plugin', label: 'Custom OSD plugin' },
  ],
};

export default sidebars;
