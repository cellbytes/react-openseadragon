import { useState } from 'react';

import {
  TiledImage,
  ViewerStateProvider,
  useOpenseadragon,
  useWorld,
} from '@cellbytes/react-openseadragon';

const VIEWER_OPTIONS = {
  id: 'multi-image-viewer',
  prefixUrl: '/react-openseadragon/openseadragon-images/',
  showNavigator: true,
  navigatorPosition: 'BOTTOM_RIGHT' as const,
};

const PRIMARY = 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi';
const SECONDARY = 'https://openseadragon.github.io/example-images/duomo/duomo.dzi';

export default function MultiImageViewerDemo() {
  const [showSecondary, setShowSecondary] = useState(false);
  const [opacity, setOpacity] = useState(1);

  const state = useOpenseadragon({ options: VIEWER_OPTIONS });

  return (
    <ViewerStateProvider state={state}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setShowSecondary((v) => !v)}>
          {showSecondary ? 'Remove second image' : 'Add second image'}
        </button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Opacity of second image:
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            disabled={!showSecondary}
            onChange={(e) => setOpacity(Number(e.target.value))}
            aria-label="Opacity of second image"
          />
          <span>{opacity.toFixed(2)}</span>
        </label>
      </div>

      <div
        ref={state.setContainerElement}
        style={{ width: '100%', height: 480, background: '#111', borderRadius: 8 }}
      />

      <TiledImage imageKey="primary" tileSource={PRIMARY} />
      {showSecondary && (
        <TiledImage
          imageKey="secondary"
          tileSource={SECONDARY}
          x={1.05}
          width={1}
          opacity={opacity}
        />
      )}

      <WorldReadout />
    </ViewerStateProvider>
  );
}

function WorldReadout() {
  const world = useWorld();
  return (
    <p style={{ marginTop: 12 }}>
      Images in the world:{' '}
      {world.items.length > 0 ? world.items.map((entry) => entry.key).join(', ') : 'none yet'}
    </p>
  );
}
