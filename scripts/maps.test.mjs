import test from 'node:test';
import assert from 'node:assert/strict';
import {getTmapHref,tmapPlatform,prepareTmapOpen} from '../src/maps.ts';

test('Android opens the exact venue with a package-scoped intent and store fallback',()=>{
 const link=getTmapHref('Mozilla/5.0 (Linux; Android 15) Chrome/130.0',0);
 const [route,intent]=link.split('#Intent;');
 const destination=new URL(route);
 assert.equal(destination.protocol,'intent:');
 assert.equal(destination.hostname,'route');
 assert.equal(destination.searchParams.get('goalname'),'노블발렌티 대치점');
 assert.equal(Number(destination.searchParams.get('goalx')),127.06556320330435);
 assert.equal(Number(destination.searchParams.get('goaly')),37.503307206862);
 assert.match(intent,/scheme=tmap;package=com\.skt\.tmap\.ku;/);
 assert.ok(intent.includes(`S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.skt.tmap.ku')};end`));
});

test('iPhone and desktop-mode iPad use the iOS destination parameters',()=>{
 for(const [agent,touches] of [['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)',5],['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',5]]){
  const link=new URL(getTmapHref(agent,touches));
  assert.equal(link.protocol,'tmap:');
  assert.equal(link.hostname,'route');
  assert.equal(link.searchParams.get('rGoName'),'노블발렌티 대치점');
  assert.equal(Number(link.searchParams.get('rGoX')),127.06556320330435);
  assert.equal(Number(link.searchParams.get('rGoY')),37.503307206862);
 }
});

test('desktop browsers do not receive an unsupported application scheme',()=>{
 assert.equal(tmapPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',0),'desktop');
 assert.equal(new URL(getTmapHref('Mozilla/5.0 (Windows NT 10.0)',0)).protocol,'https:');
});

function iosBrowser(t){
 const document=new EventTarget();
 document.hidden=false;
 const window=new EventTarget();
 const navigations=[];
 window.location={assign:url=>navigations.push(url)};
 for(const [name,value] of Object.entries({navigator:{userAgent:'iPhone',maxTouchPoints:5},document,window})){
  const previous=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,name,{configurable:true,value});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name]});
 }
 t.mock.timers.enable({apis:['setTimeout']});
 return {document,window,navigations};
}

test('iOS offers the official App Store when no app takes over',t=>{
 const {navigations}=iosBrowser(t);
 assert.equal(prepareTmapOpen(()=>assert.fail('mobile should not receive a desktop notice')),true);
 t.mock.timers.tick(2200);
 assert.deepEqual(navigations,['https://apps.apple.com/kr/app/id431589174']);
});

test('switching into Tmap cancels iOS installation fallback, including after returning',t=>{
 const {document,navigations}=iosBrowser(t);
 prepareTmapOpen(()=>{});
 document.hidden=true;
 document.dispatchEvent(new Event('visibilitychange'));
 document.hidden=false;
 t.mock.timers.tick(4000);
 assert.deepEqual(navigations,[]);
});

test('leaving the invitation also cancels the pending iOS installation fallback',t=>{
 const {window,navigations}=iosBrowser(t);
 prepareTmapOpen(()=>{});
 window.dispatchEvent(new Event('pagehide'));
 t.mock.timers.tick(4000);
 assert.deepEqual(navigations,[]);
});
