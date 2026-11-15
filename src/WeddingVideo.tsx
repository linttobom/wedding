import {useEffect,useRef,useState} from 'react';
import {stopBackgroundMusic} from './backgroundMusic';
import {activateWeddingVideo,stopMusicForVideoFocus,weddingVideoUrl} from './youtube';

export function WeddingVideo(){
 const container=useRef<HTMLDivElement>(null);
 const iframe=useRef<HTMLIFrameElement|null>(null);
 const [activated,setActivated]=useState(false);
 useEffect(()=>{
  if(!container.current)return;
  // Keep YouTube code inside its cross-origin iframe, outside the invitation DOM.
  const frame=document.createElement('iframe');
  frame.title='성진과 서린의 웨딩 영상';
  // Until activation, keyboard/screen-reader users enter through the play button.
  frame.tabIndex=-1;
  frame.setAttribute('aria-hidden','true');
  frame.src=weddingVideoUrl(window.location.origin);
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  container.current.appendChild(frame);
  iframe.current=frame;
  let disposed=false;
  let focusCheck:ReturnType<typeof setTimeout>|undefined;
  const focused=()=>{if(!disposed)stopMusicForVideoFocus(frame)};
  const blurred=()=>{clearTimeout(focusCheck);focusCheck=setTimeout(focused,0)};
  frame.addEventListener('focus',focused);
  window.addEventListener('blur',blurred);
  return()=>{disposed=true;clearTimeout(focusCheck);frame.removeEventListener('focus',focused);window.removeEventListener('blur',blurred);if(iframe.current===frame)iframe.current=null;frame.remove()};
 },[]);
 return <div className="wedding-video"><div ref={container}/>{!activated&&<button type="button" className="video-start" aria-label="웨딩 영상 재생" onPointerDown={event=>{event.stopPropagation();stopBackgroundMusic()}} onClick={event=>{event.stopPropagation();if(!iframe.current)return;activateWeddingVideo(iframe.current,window.location.origin);setActivated(true)}}/>}</div>;
}
