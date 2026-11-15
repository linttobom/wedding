type AudioWindow=Window&{webkitAudioContext?:typeof AudioContext};

export function createMusicVolume(audio:HTMLAudioElement,createContext=()=>{
 const Context=window.AudioContext||(window as AudioWindow).webkitAudioContext;
 return Context?new Context():undefined;
}){
 audio.volume=.5;
 let context:AudioContext|undefined,source:MediaElementAudioSourceNode|undefined,gain:GainNode|undefined,attempted=false;
 return {
  prepare(){
   // Create and resume the graph during the user's play gesture, including iOS.
   if(!attempted){
    attempted=true;
    try{
     context=createContext();
     if(context){
      gain=context.createGain();
      gain.gain.value=.5;
      gain.connect(context.destination);
      source=context.createMediaElementSource(audio);
      source.connect(gain);
      // Attenuate once in the gain stage; do not combine two 50% reductions.
      audio.volume=1;
     }
    }catch{
     void context?.close().catch(()=>{});
     context=undefined;
     audio.volume=.5;
    }
   }
   return context&&context.state!=='running'?context.resume():Promise.resolve();
  },
  dispose(){source?.disconnect();gain?.disconnect();void context?.close().catch(()=>{})},
 };
}
