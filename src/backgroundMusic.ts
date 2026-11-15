export const STOP_BACKGROUND_MUSIC='wedding:stop-background-music';
export function stopBackgroundMusic(target:EventTarget=window){target.dispatchEvent(new Event(STOP_BACKGROUND_MUSIC))}
type MusicAudio=Pick<HTMLAudioElement,'volume'|'play'|'pause'>;
type MusicState={playing:boolean;error:boolean};

export function createBackgroundMusic(audio:MusicAudio,onState:(state:MusicState)=>void,preparePlayback=()=>Promise.resolve()){
 audio.volume=.5;
 let revision=0,wanted=false,automaticAllowed=true,disposed=false;
 const report=(playing:boolean,error=false)=>{if(!disposed)onState({playing,error})};
 async function play(){
  if(disposed)return;
  wanted=true;
  const request=++revision;
  try{
   await Promise.all([preparePlayback(),audio.play()]);
   if(disposed||!wanted){audio.pause();return}
   if(request===revision)report(true);
  }catch{
   if(!disposed&&wanted&&request===revision){wanted=false;audio.pause();report(false,true)}
  }
 }
 function stop(){
  wanted=false;
  revision++;
  audio.pause();
  report(false);
 }
 return {
  startAutomatically(){
   if(!automaticAllowed||disposed)return Promise.resolve();
   automaticAllowed=false;
   return play();
  },
  toggle(){
   automaticAllowed=false;
   if(wanted){stop();return Promise.resolve()}
   return play();
  },
  stopForVideo(){automaticAllowed=false;stop()},
  dispose(){disposed=true;automaticAllowed=false;wanted=false;revision++;audio.pause()},
 };
}
