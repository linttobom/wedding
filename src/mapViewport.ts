export type MapView = {scale: number; x: number; y: number};
export const initialMapView: MapView = {scale: 1, x: 0, y: 0};
export const minMapScale = 1;
export const maxMapScale = 3;

// Positions are fractions of the viewport, so resizing preserves the view.
export function constrainMapView(view: MapView): MapView {
 const scale = Math.min(maxMapScale, Math.max(minMapScale, view.scale));
 if (scale === minMapScale) return {...initialMapView};
 const limit = (scale - 1) / 2;
 return {scale, x: Math.min(limit, Math.max(-limit, view.x)), y: Math.min(limit, Math.max(-limit, view.y))};
}

export function panMap(view: MapView, x: number, y: number): MapView {
 return constrainMapView({...view, x: view.x + x, y: view.y + y});
}

export function zoomMap(view: MapView, scale: number): MapView {
 const nextScale = Math.min(maxMapScale, Math.max(minMapScale, scale));
 const ratio = nextScale / view.scale;
 return constrainMapView({scale: nextScale, x: view.x * ratio, y: view.y * ratio});
}
