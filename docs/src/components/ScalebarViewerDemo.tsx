import { TiledImage, ViewerStateProvider, useOpenseadragon } from '@cellbytes/react-openseadragon';
import { scalebarPlugin } from '@site/src/lib/scalebar';

const VIEWER_OPTIONS = {
  id: 'scalebar-viewer',
  prefixUrl: '/react-openseadragon/openseadragon-images/',
  showNavigator: false,
};

// `location: 4` is BOTTOM_LEFT. The full set of constants lives on
// OpenSeadragon.ScalebarLocation once the plugin has loaded.
const PLUGINS = scalebarPlugin({
  pixelsPerMeter: 1_000_000,
  location: 4,
  color: 'white',
  fontColor: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  barThickness: 3,
});

const TILE_SOURCE = 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi';

export default function ScalebarViewerDemo() {
  const state = useOpenseadragon({ options: VIEWER_OPTIONS, plugins: PLUGINS });

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
