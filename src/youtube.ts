import {stopBackgroundMusic} from './backgroundMusic.ts';

export function weddingVideoUrl(origin:string,autoplay=false):string{
 const url=new URL('https://www.youtube-nocookie.com/embed/frXorvk8V_g');
 url.search=new URLSearchParams({autoplay:autoplay?'1':'0',playsinline:'1',controls:'1',rel:'0',origin}).toString();
 return url.href;
}

export function activateWeddingVideo(frame:Pick<HTMLIFrameElement,'src'|'focus'|'tabIndex'|'removeAttribute'>,origin:string,target:EventTarget=window){
 // Run from the user's click: stop music before requesting native iframe playback.
 stopBackgroundMusic(target);
 frame.src=weddingVideoUrl(origin,true);
 frame.tabIndex=0;
 frame.removeAttribute('aria-hidden');
 frame.focus();
}

export function stopMusicForVideoFocus(frame:HTMLElement,activeElement:Element|null=document.activeElement,target:EventTarget=window){
 if(activeElement===frame)stopBackgroundMusic(target);
}
