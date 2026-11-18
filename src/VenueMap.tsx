import mapImage from '../images/optimized/map-naver.webp';

export function VenueMap() {
 return <a className="map" href="https://map.naver.com/p/entry/place/1634613412" target="_blank" rel="noreferrer" aria-label="네이버지도에서 노블발렌티 대치점 보기 (새 창)">
  <img className="map-image" src={mapImage} alt="노블발렌티 대치점 위치와 휘문고등학교·대현초등학교·영동대로 주변 네이버지도" loading="lazy" decoding="async" width="1606" height="996"/>
  <span className="map-credit">© NAVER 지도 ↗</span>
 </a>;
}
