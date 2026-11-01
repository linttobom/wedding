type WebLink={mobileWebUrl:string;webUrl:string};
export type KakaoSdk={
 init(key:string):void;
 isInitialized():boolean;
 Share:{sendDefault(message:{objectType:"feed";content:{title:string;description:string;imageUrl:string;link:WebLink};buttons:{title:string;link:WebLink}[]}):void};
};
declare global{interface Window{Kakao?:KakaoSdk}}

let loading:Promise<KakaoSdk>|undefined;
export function loadKakao():Promise<KakaoSdk>{
 if(!loading)loading=new Promise<KakaoSdk>((resolve,reject)=>{
  const key=import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
  if(!key){reject(new Error("Kakao JavaScript key is missing"));return}
  const ready=()=>{
   try{
    const sdk=window.Kakao;
    if(!sdk)throw new Error("Kakao SDK is unavailable");
    if(!sdk.isInitialized())sdk.init(key);
    resolve(sdk);
   }catch(error){reject(error)}
  };
  if(window.Kakao){ready();return}
  const script=document.createElement("script");
  const finish=()=>{clearTimeout(timeout);script.onload=null;script.onerror=null};
  const fail=()=>{finish();script.remove();reject(new Error("Kakao SDK failed to load"))};
  const timeout=setTimeout(fail,12000);
  script.src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";
  script.integrity="sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w";
  script.crossOrigin="anonymous";
  script.async=true;
  script.onload=()=>{finish();ready()};
  script.onerror=fail;
  document.head.appendChild(script);
 }).catch(error=>{loading=undefined;throw error});
 return loading;
}
