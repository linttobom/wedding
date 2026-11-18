import {useRef, useState} from 'react';
import type {KeyboardEvent, PointerEvent} from 'react';
import mapImage from '../images/optimized/map-naver.webp';
import {initialMapView, maxMapScale, minMapScale, panMap, zoomMap} from './mapViewport';

const naverMapUrl = 'https://map.naver.com/p/entry/place/1634613412';
type DragPoint = {id: number; x: number; y: number};

export function VenueMap() {
 const [view, setView] = useState(initialMapView);
 const [interacting, setInteracting] = useState(false);
 const drag = useRef<DragPoint | null>(null);
 const zoom = (step: number) => setView(current => zoomMap(current, current.scale + step));
 const reset = () => setView({...initialMapView});
 const start = (event: PointerEvent<HTMLDivElement>) => {
  if (event.button !== 0 || view.scale <= minMapScale || drag.current) return;
  drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY};
  event.currentTarget.setPointerCapture(event.pointerId);
  setInteracting(true);
 };
 const move = (event: PointerEvent<HTMLDivElement>) => {
  const previous = drag.current;
  if (!previous || previous.id !== event.pointerId) return;
  drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY};
  const bounds = event.currentTarget.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  event.preventDefault();
  setView(current => panMap(current, (event.clientX - previous.x) / bounds.width, (event.clientY - previous.y) / bounds.height));
 };
 const end = (event: PointerEvent<HTMLDivElement>) => {
  if (drag.current?.id !== event.pointerId) return;
  drag.current = null;
  setInteracting(false);
 };
 const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === '+' || event.key === '=') zoom(.5);
  else if (event.key === '-') zoom(-.5);
  else if (event.key === '0') reset();
  else if (view.scale > minMapScale && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
   setView(current => panMap(current, event.key === 'ArrowLeft' ? .1 : event.key === 'ArrowRight' ? -.1 : 0,
    event.key === 'ArrowUp' ? .1 : event.key === 'ArrowDown' ? -.1 : 0));
  } else return;
  event.preventDefault();
 };
 return <div className="map" role="group" aria-label="노블발렌티 대치점 주변 네이버지도">
  <div className="map-canvas" tabIndex={0} role="group" aria-label="지도 이미지. 더하기와 빼기로 확대·축소, 확대 후 방향키로 이동, 0으로 원래 크기"
   data-zoomed={view.scale > minMapScale} data-interacting={interacting}
   onKeyDown={keyboard} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
   <img className="map-image" src={mapImage} alt="노블발렌티 대치점 위치와 휘문고등학교·대현초등학교·영동대로 주변 네이버지도" loading="lazy" decoding="async" width="1606" height="996" draggable={false}
    style={{transform: `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.scale})`}}/>
  </div>
  <div className="map-zoom-controls" role="group" aria-label="지도 이미지 확대·축소">
   <button type="button" aria-label="지도 확대" disabled={view.scale >= maxMapScale} onClick={() => zoom(.5)}>+</button>
   <button type="button" aria-label="지도 축소" disabled={view.scale <= minMapScale} onClick={() => zoom(-.5)}>−</button>
  </div>
  <button type="button" className="map-reset" aria-label="지도 원래 크기로" onClick={reset}>원래 크기</button>
  <span className="map-zoom-status" role="status" aria-live="polite">{Math.round(view.scale * 100)}%</span>
  <a className="map-credit" href={naverMapUrl} target="_blank" rel="noreferrer" aria-label="네이버지도에서 노블발렌티 대치점 보기">© NAVER 지도 ↗</a>
 </div>;
}
