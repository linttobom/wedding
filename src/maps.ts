// Venue coordinates from the existing Kakao place (863978973) map metadata.
const venue={name:"노블발렌티 대치점",longitude:127.06556320330435,latitude:37.503307206862};
const androidStore="https://play.google.com/store/apps/details?id=com.skt.tmap.ku";
const iosStore="https://apps.apple.com/kr/app/id431589174";

export function tmapPlatform(userAgent:string,touchPoints=0):"android"|"ios"|"desktop"{
 if(/Android/i.test(userAgent))return "android";
 if(/iPhone|iPad|iPod/i.test(userAgent)||(/Macintosh/i.test(userAgent)&&touchPoints>1))return "ios";
 return "desktop";
}

export function getTmapHref(userAgent=navigator.userAgent,touchPoints=navigator.maxTouchPoints):string{
 const platform=tmapPlatform(userAgent,touchPoints);
 const name=encodeURIComponent(venue.name);
 if(platform==="android"){
  const route=`route?goalname=${name}&goalx=${venue.longitude}&goaly=${venue.latitude}`;
  return `intent://${route}#Intent;scheme=tmap;package=com.skt.tmap.ku;S.browser_fallback_url=${encodeURIComponent(androidStore)};end`;
 }
 if(platform==="ios")return `tmap://route?rGoName=${name}&rGoX=${venue.longitude}&rGoY=${venue.latitude}`;
 return "https://www.tmap.co.kr/";
}

// Keep the Android intent as a real clicked anchor so Chrome can launch it.
// iOS has no intent fallback: only offer installation while the page stays visible.
export function prepareTmapOpen(notify:(message:string)=>void):boolean{
 const platform=tmapPlatform(navigator.userAgent,navigator.maxTouchPoints);
 if(platform==="desktop"){
  notify("티맵 길안내는 휴대폰에서 이용해주세요.");
  return false;
 }
 if(platform==="ios"){
  const cancel=()=>{clearTimeout(timer);document.removeEventListener("visibilitychange",hidden);window.removeEventListener("pagehide",cancel)};
  const hidden=()=>{if(document.hidden)cancel()};
  const timer=setTimeout(()=>{
   cancel();
   if(!document.hidden)window.location.assign(iosStore);
  },2200);
  document.addEventListener("visibilitychange",hidden);
  window.addEventListener("pagehide",cancel,{once:true});
 }
 return true;
}
