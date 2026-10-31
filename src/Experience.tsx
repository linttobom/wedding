import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
const musicFiles=import.meta.glob('../audio/*.{mp3,m4a,ogg,wav,MP3,M4A,OGG,WAV}',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const musicUrl=Object.entries(musicFiles).sort(([a],[b])=>a.localeCompare(b)).find(([file])=>!file.endsWith('placeholder.wav'))?.[1];
export function Intro(){
 const [finished,setFinished]=useState(false);
 useEffect(()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const timer=setTimeout(()=>setFinished(true),reduced?0:3000);return()=>clearTimeout(timer)},[]);
 return <><div className={`intro-dim ${finished?'finished':''}`} aria-hidden="true"><div className="intro-writing"><p className="intro-message">저희 둘 결혼합니다.</p></div></div>{finished&&<div className="petals" aria-hidden="true">{Array.from({length:20},(_,i)=><i key={i} style={{'--left':`${(i*37)%100}%`,'--delay':`${i*.19}s`,'--duration':`${6+i%5}s`,'--size':`${8+i%7}px`,'--drift':`${(i%2?1:-1)*(45+i*3)}px`} as CSSProperties}/>)}</div>}</>;
}
export function Music(){
 const audio=useRef<HTMLAudioElement>(null);const [playing,setPlaying]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{if(!musicUrl)return;const start=()=>{audio.current?.play().then(()=>setPlaying(true)).catch(()=>{});document.removeEventListener('pointerdown',start)};document.addEventListener('pointerdown',start,{once:true});return()=>document.removeEventListener('pointerdown',start)},[]);
 async function toggle(){if(!musicUrl)return;if(playing){audio.current?.pause();setPlaying(false)}else{try{await audio.current?.play();setPlaying(true);setError(false)}catch{setError(true)}}}
 return <><audio ref={audio} src={musicUrl} loop preload="none" onError={()=>setError(true)}/><button className="music-toggle" onClick={e=>{e.stopPropagation();void toggle()}} disabled={!musicUrl} aria-label={!musicUrl?'음악 파일을 넣으면 재생할 수 있습니다':playing?'배경 음악 끄기':'배경 음악 켜기'} aria-pressed={playing} title={!musicUrl?'audio 폴더에 노래를 넣어주세요':error?'음악 파일을 확인해주세요':playing?'음악 끄기':'음악 켜기'}><span aria-hidden="true">♪</span><small>{playing?'ON':'OFF'}</small></button></>;
}
