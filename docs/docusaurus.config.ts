import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes as prismThemes } from 'prism-react-renderer';

import type * as Preset from '@docusaurus/preset-classic';
import type { Config, PluginModule } from '@docusaurus/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const aliasLibPlugin: PluginModule = () => ({
  name: 'alias-lib-source',
  configureWebpack() {
    return {
      resolve: {
        alias: {
          // Demo components import from the published package name so the
          // shown source matches what a consumer would write. Webpack
          // resolves the alias to the local source tree.
          '@cellbytes/react-openseadragon': path.resolve(REPO_ROOT, 'src/index.ts'),
        },
      },
      module: {
        rules: [
          {
            test: /@docusaurus[\\/]core[\\/]lib[\\/]client[\\/]exports[\\/]ComponentCreator\.js$/,
            use: [
              {
                loader: path.resolve(__dirname, 'loaders/esm-interop-fix.cjs'),
              },
            ],
          },
        ],
      },
    };
  },
});

const config: Config = {
  title: 'react-openseadragon',
  tagline: 'A React wrapper around OpenSeadragon: hooks, components, plugins.',
  favicon: 'img/favicon.ico',

  url: 'https://cellbytes.github.io',
  baseUrl: '/react-openseadragon/',

  organizationName: 'cellbytes',
  projectName: 'react-openseadragon',
  deploymentBranch: 'gh-pages',
  trailingSlash: true,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  future: {
    v4: true,
    // `faster: true` would also enable ssgWorkerThreads, which currently
    // throws inside docusaurus-plugin-typedoc-api's ApiPage component
    // (it mutates a non-writable function property when pickled across
    // workers). Leave that single flag off; keep every other faster flag on.
    // docusaurus-plugin-typedoc-api ships its components as `module.exports =
    // fn` (a function, not a wrapped namespace). SWC's CJS interop attaches
    // the function's own properties (`length`, `name`) to the synthesized
    // module namespace, and Docusaurus's chunk loader then copies every
    // non-`default` key back onto the function. `length` is non-writable on
    // a function, so the assignment throws on both the SSG side and at
    // hydration time. Both webpack's SWC loader and Rspack's built-in SWC
    // hit this, so we have to stay on webpack + babel until the plugin
    // ships proper ESM exports.
    faster: {
      swcJsLoader: false,
      swcJsMinimizer: true,
      swcHtmlMinimizer: true,
      // lightningcss rejects a `::before#anchor` selector shipped by the
      // typedoc-api plugin. cssnano handles it.
      lightningCssMinimizer: false,
      mdxCrossCompilerCache: true,
      rspackBundler: false,
      rspackPersistentCache: false,
      ssgWorkerThreads: false,
      gitEagerVcs: true,
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'examples',
          routeBasePath: 'examples',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/cellbytes/react-openseadragon/edit/main/docs/examples/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    aliasLibPlugin,
    [
      'docusaurus-plugin-typedoc-api',
      {
        projectRoot: REPO_ROOT,
        packages: [
          {
            path: '.',
            entry: 'src/index.ts',
            tsconfig: 'tsconfig.build.json',
          },
        ],
        minimal: false,
        readmes: false,
        debug: false,
        typedocOptions: {
          plugin: [
            path.resolve(__dirname, 'plugins/typedoc-inline-named-parameters.cjs'),
            path.resolve(__dirname, 'plugins/typedoc-group-react-symbols.cjs'),
          ],
        },
      },
    ],
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: false,
        docsDir: ['examples'],
        docsRouteBasePath: ['examples', 'api'],
      },
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'react-openseadragon',
      items: [
        { to: '/examples/getting-started', label: 'Examples', position: 'left' },
        { to: '/api/', label: 'API', position: 'left' },
        {
          href: 'https://github.com/cellbytes/react-openseadragon',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      copyright: `Released under EUPL-1.2. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'tsx', 'jsx', 'json'],
    },
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
