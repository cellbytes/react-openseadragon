import 'openseadragon';

declare module 'openseadragon' {
  interface Viewer {
    tileCache: TileCache;
  }
}
