import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ScalebarViewer(): React.ReactElement {
  return (
    <BrowserOnly
      fallback={<div style={{ width: '100%', height: 480, background: '#111', borderRadius: 8 }} />}
    >
      {() => {
        const Demo = require('./ScalebarViewerDemo').default;
        return <Demo />;
      }}
    </BrowserOnly>
  );
}
