import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {createBackgroundMusic,STOP_BACKGROUND_MUSIC} from './backgroundMusic';
import {createMusicVolume} from './musicVolume';
const musicFiles=import.meta.glob(['../audio/*.{mp3,m4a,ogg,wav,MP3,M4A,OGG,WAV}','!../audio/placeholder.wav'],{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const musicUrl=Object.entries(musicFiles).sort(([a],[b])=>a.localeCompare(b)).find(([file])=>!file.endsWith('placeholder.wav'))?.[1];
export function Intro(){
 const [finished,setFinished]=useState(false);
 useEffect(()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const timer=setTimeout(()=>setFinished(true),reduced?0:3000);return()=>clearTimeout(timer)},[]);
 return <><div className={`intro-dim ${finished?'finished':''}`} aria-hidden="true"><div className="intro-writing"><p className="intro-message">저희 둘 결혼합니다.</p></div></div>{finished&&<div className="petals" aria-hidden="true">{Array.from({length:20},(_,i)=><i key={i} style={{'--left':`${(i*37)%100}%`,'--delay':`${i*.19}s`,'--duration':`${6+i%5}s`,'--size':`${8+i%7}px`,'--drift':`${(i%2?1:-1)*(45+i*3)}px`} as CSSProperties}/>)}</div>}</>;
}
export function Music(){
 const audio=useRef<HTMLAudioElement>(null);const [playing,setPlaying]=useState(false),[error,setError]=useState(false);
 const playback=useRef<ReturnType<typeof createBackgroundMusic>|null>(null);
 useEffect(()=>{
  if(!musicUrl||!audio.current)return;
  const volume=createMusicVolume(audio.current);
  const music=createBackgroundMusic(audio.current,state=>{setPlaying(state.playing);setError(state.error)},volume.prepare);
  playback.current=music;
  const start=()=>{void music.startAutomatically()};
  const stop=()=>{document.removeEventListener('pointerdown',start);music.stopForVideo()};
  document.addEventListener('pointerdown',start,{once:true});
  window.addEventListener(STOP_BACKGROUND_MUSIC,stop);
  return()=>{document.removeEventListener('pointerdown',start);window.removeEventListener(STOP_BACKGROUND_MUSIC,stop);music.dispose();volume.dispose();playback.current=null};
 },[]);
 return <><audio ref={audio} src={musicUrl} loop preload="none" onError={()=>setError(true)}/><button className="music-toggle" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();void playback.current?.toggle()}} disabled={!musicUrl} aria-label={!musicUrl?'음악 파일을 넣으면 재생할 수 있습니다':playing?'배경 음악 끄기':'배경 음악 켜기'} aria-pressed={playing} title={!musicUrl?'audio 폴더에 노래를 넣어주세요':error?'음악 파일을 확인해주세요':playing?'음악 끄기':'음악 켜기'}><span aria-hidden="true">♪</span><small>{playing?'ON':'OFF'}</small></button></>;
}
