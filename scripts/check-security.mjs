import {readdir,readFile} from 'node:fs/promises';
import {join,relative} from 'node:path';

const failures=[];
const root=new URL('../',import.meta.url).pathname;
const dist=join(root,'dist');
const patterns=[
 ['private key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
 ['GitHub credential',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/],
 ['AWS access credential',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['OpenAI credential',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}\b/],
 ['Google API credential',/\bAIza[A-Za-z0-9_-]{35}\b/],
 ['Slack credential',/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
];

async function inspect(directory){
 for(const item of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,item.name),label=relative(root,path);
  if(item.isSymbolicLink()){failures.push(`${label}: symbolic link in deployment`);continue}
  if(item.isDirectory()){
   if(/^\.|^(?:node_modules|sites-backend)$/.test(item.name))failures.push(`${label}: private/source directory in deployment`);
   await inspect(path);
   continue;
  }
  if(/^\.|\.(?:map|pem|key|p12|pfx|sqlite|db|ts|tsx|mjs|lock)$/.test(item.name))failures.push(`${label}: private/source file in deployment`);
  if(!/\.(?:html|js|css|json|svg|txt)$/.test(item.name))continue;
  const text=await readFile(path,'utf8');
  for(const [kind,pattern] of patterns)if(pattern.test(text))failures.push(`${label}: ${kind}`);
  if(item.name.endsWith('.css')&&/url\(["']?data:(?:font\/|application\/(?:font|x-font|vnd\.ms-fontobject))/.test(text))failures.push(`${label}: inline font conflicts with font-src policy`);
 }
}
await inspect(dist);
const html=await readFile(join(dist,'index.html'),'utf8');
if(!/http-equiv="Content-Security-Policy"/i.test(html))failures.push('dist/index.html: missing Content Security Policy');
for(const directive of ["object-src 'none'","base-uri 'self'","form-action https://sharer.kakao.com"]){
 if(!html.includes(directive))failures.push(`dist/index.html: missing ${directive}`);
}
const workflow=await readFile(join(root,'.github/workflows/pages.yml'),'utf8');
if([...workflow.matchAll(/uses:\s*([^\s#]+)/g)].some(([,action])=>!/@[a-f0-9]{40}$/.test(action)))failures.push('.github/workflows/pages.yml: action must use a full commit identifier');
if(!workflow.includes('persist-credentials: false'))failures.push('.github/workflows/pages.yml: checkout credentials must not persist');
const sdk=await readFile(join(root,'src/kakao.ts'),'utf8');
if(!/script\.integrity="sha384-[A-Za-z0-9+/=]+"/.test(sdk)||!sdk.includes('script.crossOrigin="anonymous"'))failures.push('src/kakao.ts: external SDK must use integrity verification');
if(failures.length){
 // Only paths and finding categories are reported; never print matched values.
 for(const failure of failures)console.error(failure);
 process.exitCode=1;
}else console.log('Security artifact checks passed: no recognized credentials/private files, CSP and pinned workflow verified.');
