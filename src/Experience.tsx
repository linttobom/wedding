import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,FormEvent} from 'react';
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
export function RsvpForm({fallbackUrl}:{fallbackUrl:string}){
 const [side,setSide]=useState('groom'),[attendance,setAttendance]=useState('yes'),[meal,setMeal]=useState('yes'),[name,setName]=useState(''),[count,setCount]=useState('1'),[notice,setNotice]=useState(false);
 const valid=!!name.trim()&&name.trim().length<=50&&!!side&&!!attendance&&!!meal&&(attendance==='no'||Number(count)>=1);
 const star=<span className="required-mark" aria-hidden="true"> *</span>;
 function choice(label:string,value:string,selected:string,set:(v:string)=>void){return <button type="button" className={selected===value?'selected':''} aria-pressed={selected===value} onClick={()=>set(value)}>{label}</button>}
 function submit(e:FormEvent){e.preventDefault();if(!valid)return;if(import.meta.env.DEV)setNotice(true);else window.location.assign(fallbackUrl)}
 return <><h2 id="rsvp-title">참석 의사 전달하기</h2><p className="subtitle">모든 분들을 소중히 모실 수 있도록 전해주세요:)</p><form onSubmit={submit}>
 <fieldset><legend>신랑 / 신부측{star}</legend><div className="choices">{choice('신랑측','groom',side,setSide)}{choice('신부측','bride',side,setSide)}</div></fieldset>
 <fieldset><legend>참석 여부{star}</legend><div className="choices">{choice('참석할게요','yes',attendance,setAttendance)}{choice('어려워요','no',attendance,setAttendance)}</div></fieldset>
 <label>성함{star}<input value={name} onChange={e=>{setName(e.target.value);setNotice(false)}} placeholder="성함을 입력해주세요" required maxLength={50} autoComplete="name"/></label>
 <fieldset disabled={attendance==='no'}><legend>식사 여부{star}</legend><div className="choices">{choice('식사할게요','yes',meal,setMeal)}{choice('안 할게요','no',meal,setMeal)}</div></fieldset>
 <label>참석 인원 (본인 포함){star}<select value={attendance==='no'?'0':count} onChange={e=>setCount(e.target.value)} disabled={attendance==='no'} required>{attendance==='no'?<option value="0">0명</option>:Array.from({length:20},(_,i)=><option value={i+1} key={i}>{i+1}명</option>)}</select></label>
 <button className="primary-button" disabled={!valid} type="submit">참석 의사 전달하기</button>
 {notice&&<div className="preview-notice" role="status">현재는 디자인 미리보기입니다. 답변은 저장되지 않습니다.<a href={fallbackUrl}>실제 참석 의사는 기존 청첩장에서 전달하기</a></div>}
 </form></>;
}
