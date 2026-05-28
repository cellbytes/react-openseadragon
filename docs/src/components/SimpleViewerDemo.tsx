import { TiledImage, ViewerStateProvider, useOpenseadragon } from '@cellbytes/react-openseadragon';

const VIEWER_OPTIONS = {
  id: 'simple-viewer',
  prefixUrl: '/react-openseadragon/openseadragon-images/',
  showNavigator: false,
};

const TILE_SOURCE = 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi';

export default function SimpleViewerDemo() {
  const state = useOpenseadragon({ options: VIEWER_OPTIONS });

  return (
    <ViewerStateProvider state={state}>
      <div
        ref={state.setContainerElement}
        style={{ width: '100%', height: 480, background: '#111', borderRadius: 8 }}
      />
      <TiledImage imageKey="primary" tileSource={TILE_SOURCE} />
    </ViewerStateProvider>
  );
}
