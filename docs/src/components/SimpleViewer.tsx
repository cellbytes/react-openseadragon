import BrowserOnly from '@docusaurus/BrowserOnly';

// OSD touches `document` at import time, so the demo can only execute in
// the browser. This thin wrapper exists only to skip SSR.
export default function SimpleViewer(): React.ReactElement {
  return (
    <BrowserOnly
      fallback={<div style={{ width: '100%', height: 480, background: '#111', borderRadius: 8 }} />}
    >
      {() => {
        const Demo = require('./SimpleViewerDemo').default;
        return <Demo />;
      }}
    </BrowserOnly>
  );
}
