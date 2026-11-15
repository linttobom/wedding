import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundMusic,STOP_BACKGROUND_MUSIC} from '../src/backgroundMusic.ts';
import {activateWeddingVideo,stopMusicForVideoFocus,weddingVideoUrl} from '../src/youtube.ts';
import {createMusicVolume} from '../src/musicVolume.ts';

function setup(play=()=>Promise.resolve()){
 const states=[];
 const audio={volume:1,playCalls:0,pauseCalls:0,play(){this.playCalls++;return play()},pause(){this.pauseCalls++}};
 const music=createBackgroundMusic(audio,state=>states.push(state));
 return {audio,music,states};
}

test('BGM starts at half volume and reports ON only once playback succeeds',async()=>{
 const {audio,music,states}=setup();
 assert.equal(audio.volume,.5);
 await music.startAutomatically();
 assert.deepEqual(states,[{playing:true,error:false}]);
});

test('video stops BGM immediately, displays OFF and disables later first-tap autoplay',async()=>{
 const {audio,music,states}=setup();
 music.stopForVideo();
 await music.startAutomatically();
 assert.equal(audio.playCalls,0);
 assert.equal(audio.pauseCalls,1);
 assert.deepEqual(states,[{playing:false,error:false}]);
});

test('pending first-tap playback cannot restore BGM after video starts',async()=>{
 let finish;
 const {audio,music,states}=setup(()=>new Promise(resolve=>{finish=resolve}));
 const pending=music.startAutomatically();
 music.stopForVideo();
 finish();
 await pending;
 assert.ok(audio.pauseCalls>=2);
 assert.deepEqual(states,[{playing:false,error:false}]);
});

test('an outdated playback rejection does not show an error after a video stop',async()=>{
 let reject;
 const {music,states}=setup(()=>new Promise((_,fail)=>{reject=fail}));
 const pending=music.startAutomatically();
 music.stopForVideo();
 reject(new Error('aborted playback'));
 await pending;
 assert.deepEqual(states,[{playing:false,error:false}]);
});

test('BGM stays OFF until the user explicitly turns it on again',async()=>{
 const {audio,music,states}=setup();
 await music.startAutomatically();
 music.stopForVideo();
 await music.startAutomatically();
 assert.equal(audio.playCalls,1);
 assert.equal(states.at(-1).playing,false);
 await music.toggle();
 assert.equal(audio.playCalls,2);
 assert.deepEqual(states.at(-1),{playing:true,error:false});
 assert.equal(audio.volume,.5);
});

test('first video activation stops BGM before requesting isolated iframe playback',async()=>{
 const {music,states}=setup();
 const events=new EventTarget();
 const order=[];
 const frame={_src:'',tabIndex:-1,hidden:true,set src(value){order.push('navigate');this._src=value},get src(){return this._src},removeAttribute(name){if(name==='aria-hidden')this.hidden=false},focus(){order.push('focus')}};
 events.addEventListener(STOP_BACKGROUND_MUSIC,()=>{order.push('stop');music.stopForVideo()});
 await music.startAutomatically();
 activateWeddingVideo(frame,'https://example.com',events);
 assert.deepEqual(order,['stop','navigate','focus']);
 assert.equal(frame.tabIndex,0);
 assert.equal(frame.hidden,false);
 assert.deepEqual(states.at(-1),{playing:false,error:false});
 const url=new URL(frame.src);
 assert.equal(url.origin,'https://www.youtube-nocookie.com');
 assert.equal(url.pathname,'/embed/frXorvk8V_g');
 assert.equal(url.searchParams.get('autoplay'),'1');
 assert.equal(url.searchParams.get('origin'),'https://example.com');
 await music.startAutomatically();
 assert.deepEqual(states.at(-1),{playing:false,error:false});
});

test('initial native video is paused and does not expose an iframe scripting API',()=>{
 const url=new URL(weddingVideoUrl('https://example.com'));
 assert.equal(url.origin,'https://www.youtube-nocookie.com');
 assert.equal(url.searchParams.get('autoplay'),'0');
 assert.equal(url.searchParams.has('enablejsapi'),false);
});

test('unmounting cancels pending playback without updating React state later',async()=>{
 let finish;
 const {audio,music,states}=setup(()=>new Promise(resolve=>{finish=resolve}));
 const pending=music.startAutomatically();
 music.dispose();
 finish();
 await pending;
 assert.ok(audio.pauseCalls>=2);
 assert.deepEqual(states,[]);
});

test('WebAudio applies one half-volume gain and resumes it on the play gesture',async()=>{
 const audio={volume:1};
 const gain={gain:{value:1},connect(){},disconnect(){}};
 const source={connect(){},disconnect(){}};
 let contexts=0,resumes=0;
 const context={state:'suspended',destination:{},createGain:()=>gain,createMediaElementSource:()=>source,resume:async()=>{resumes++;context.state='running'},close:async()=>{}};
 const volume=createMusicVolume(audio,()=>{contexts++;return context});
 assert.equal(contexts,0);
 assert.equal(audio.volume,.5);
 await volume.prepare();
 await volume.prepare();
 assert.equal(contexts,1);
 assert.equal(resumes,1);
 assert.equal(gain.gain.value,.5);
 assert.equal(audio.volume,1);
 volume.dispose();
});

test('browsers without WebAudio retain the element half-volume fallback',async()=>{
 const audio={volume:1};
 const volume=createMusicVolume(audio,()=>undefined);
 await volume.prepare();
 assert.equal(audio.volume,.5);
 volume.dispose();
});

test('failed WebAudio setup keeps the original audio output usable',async()=>{
 const audio={volume:1};
 const volume=createMusicVolume(audio,()=>{throw new Error('WebAudio unavailable')});
 await volume.prepare();
 assert.equal(audio.volume,.5);
 volume.dispose();
});

test('iframe interaction fallback only stops music when that video actually has focus',async()=>{
 const {music,states}=setup();
 const events=new EventTarget();
 const frame={},otherElement={};
 events.addEventListener(STOP_BACKGROUND_MUSIC,()=>music.stopForVideo());
 await music.startAutomatically();
 stopMusicForVideoFocus(frame,otherElement,events);
 assert.equal(states.at(-1).playing,true);
 stopMusicForVideoFocus(frame,frame,events);
 assert.deepEqual(states.at(-1),{playing:false,error:false});
});
