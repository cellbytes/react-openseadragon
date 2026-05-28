import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import clsx from 'clsx';

export default function Home(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Home" description={siteConfig.tagline}>
      <header
        className={clsx('hero', 'hero--primary')}
        style={{ padding: '4rem 1rem', textAlign: 'center' }}
      >
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <Link className="button button--secondary button--lg" to="/examples/getting-started">
              Get started
            </Link>
            <Link className="button button--secondary button--lg" to="/api/">
              API reference
            </Link>
          </div>
        </div>
      </header>
      <main className="container" style={{ padding: '3rem 1rem' }}>
        <section style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2>Install</h2>
          <pre>
            <code>npm install @cellbytes/react-openseadragon openseadragon react</code>
          </pre>
          <p>
            <code>react</code> and <code>openseadragon</code> are peer dependencies. Install the
            versions your app already uses (React 19 or newer, OpenSeadragon 6 or newer).
          </p>
          <h2>Features</h2>
          <ul>
            <li>
              <code>useOpenseadragon</code> initializes OpenSeadragon using React. Pass its state to{' '}
              <code>ViewerStateProvider</code> to share it with descendants.
            </li>
            <li>
              <code>&lt;TiledImage&gt;</code> adds, positions, and removes a tile source
              declaratively. Render one per image you want in the world.
            </li>
            <li>
              Hooks for common use cases: <code>useWorld</code>, <code>useTiledImage</code>,{' '}
              <code>useViewerState</code>, <code>useViewer</code>, <code>useCoordinates</code>,{' '}
              <code>useMouseTracker</code>, <code>useViewerEvent</code>.
            </li>
            <li>
              <code>createPrototypePlugin</code> and <code>createInstancePlugin</code> wrap OSD
              prototype plugin or per-instance extensions.
            </li>
          </ul>
          <p>
            The <Link to="/examples/getting-started">Getting started</Link> page has a live viewer.
            The <Link to="/examples/multi-image">Multiple images</Link> page shows two tiled images
            with a runtime toggle.
          </p>
        </section>
      </main>
    </Layout>
  );
}
