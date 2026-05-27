import OpenSeadragon, { TiledImage, Viewer } from 'openseadragon';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ViewerContext } from '../context/ViewerContext';
import { createMockContext } from '../testUtils';
import { useCoordinates } from './useCoordinates';

const mockViewport = {
  pointFromPixel: vi.fn((p) => p),
  pixelFromPoint: vi.fn((p) => p),
  getZoom: vi.fn(() => 2.5),
};

const mockViewer = { viewport: mockViewport } as unknown as Viewer;

const mockTiledImage = {
  imageToViewportCoordinates: vi.fn((x, y) => ({ x, y })),
  viewportToImageCoordinates: vi.fn((x, y) => ({ x, y })),
  imageToViewportRectangle: vi.fn((r) => r),
  viewportToImageRectangle: vi.fn((r) => r),
} as unknown as TiledImage;

const worldItems = [{ key: 'slide', tiledImage: mockTiledImage }];

describe('useCoordinates without imageKey', () => {
  test('pixelToViewport delegates to viewport.pointFromPixel', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates(), { wrapper });
    const point = new OpenSeadragon.Point(10, 20);
    result.current.pixelToViewport(point);
    expect(mockViewport.pointFromPixel).toHaveBeenCalledWith(point);
  });

  test('viewportToPixel delegates to viewport.pixelFromPoint', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates(), { wrapper });
    const point = new OpenSeadragon.Point(5, 15);
    result.current.viewportToPixel(point);
    expect(mockViewport.pixelFromPoint).toHaveBeenCalledWith(point);
  });

  test('tiledImage property is undefined', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates(), { wrapper });
    expect(result.current.tiledImage).toBeUndefined();
  });

  test('zoom returns viewport.getZoom(true) value', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates(), { wrapper });
    expect(result.current.zoom).toBe(2.5);
  });
});

describe('useCoordinates with imageKey="slide"', () => {
  test('imageToViewport delegates to tiledImage.imageToViewportCoordinates', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer, worldItems })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates('slide'), { wrapper });
    result.current.imageToViewport(100, 200);
    expect(mockTiledImage.imageToViewportCoordinates).toHaveBeenCalledWith(100, 200);
  });

  test('viewportToImage delegates to tiledImage.viewportToImageCoordinates', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer, worldItems })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates('slide'), { wrapper });
    const point = new OpenSeadragon.Point(0.5, 0.3);
    result.current.viewportToImage(point);
    expect(mockTiledImage.viewportToImageCoordinates).toHaveBeenCalledWith(0.5, 0.3);
  });

  test('imageToViewportRect delegates to tiledImage.imageToViewportRectangle', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer, worldItems })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates('slide'), { wrapper });
    result.current.imageToViewportRect(10, 20, 30, 40);
    expect(mockTiledImage.imageToViewportRectangle).toHaveBeenCalled();
  });

  test('viewportToImageRect delegates to tiledImage.viewportToImageRectangle', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer, worldItems })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates('slide'), { wrapper });
    const rect = new OpenSeadragon.Rect(0, 0, 1, 1);
    result.current.viewportToImageRect(rect);
    expect(mockTiledImage.viewportToImageRectangle).toHaveBeenCalledWith(rect);
  });

  test('pixelToImage composes pixel->viewport->image conversions', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer, worldItems })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates('slide'), { wrapper });
    const point = new OpenSeadragon.Point(50, 80);
    result.current.pixelToImage(point);
    expect(mockViewport.pointFromPixel).toHaveBeenCalledWith(point);
    expect(mockTiledImage.viewportToImageCoordinates).toHaveBeenCalled();
  });
});

describe('useCoordinates error cases', () => {
  test('imageToViewport throws when imageKey is provided but TiledImage is not in worldItems', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer, worldItems: [] })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates('missing'), { wrapper });
    expect(() => result.current.imageToViewport(0, 0)).toThrow(
      'useCoordinates: TiledImage with imageKey "missing" is not mounted.'
    );
  });

  test('imageToViewport throws when called without any imageKey', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result } = await renderHook(() => useCoordinates(), { wrapper });
    expect(() => result.current.imageToViewport(0, 0)).toThrow(
      'useCoordinates: image-specific methods require an imageKey.'
    );
  });
});

describe('useCoordinates memoization', () => {
  test('adapter is memoized: same reference returned across two renders when viewer/tiledImage unchanged', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer, worldItems })}>
        {children}
      </ViewerContext.Provider>
    );
    const { result, rerender } = await renderHook(() => useCoordinates('slide'), { wrapper });
    const firstAdapter = result.current;
    await rerender();
    expect(result.current).toBe(firstAdapter);
  });
});
