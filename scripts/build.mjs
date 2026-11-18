import {build,context} from 'esbuild';
import {copyFile,mkdir,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const outdir=join(root,'dist');
const publicDir=join(root,'public');
const entry=join(root,'src/main.tsx');
const excludedFonts=new Set(['fonts/PretendardVariable.woff2','fonts/NanumPenScript-Regular.ttf']);
const posix=path=>path.split(sep).join('/');
let activeContext;

async function copyPublic(directory=publicDir){
 for(const item of await readdir(directory,{withFileTypes:true})){
  const input=join(directory,item.name);
  const name=posix(relative(publicDir,input));
  if(excludedFonts.has(name))continue;
  if(item.isSymbolicLink())throw new Error('Public assets cannot contain symbolic links.');
  if(item.isDirectory()){await copyPublic(input);continue}
  if(!item.isFile())throw new Error('Unsupported public asset type.');
  const output=join(outdir,name);
  await mkdir(dirname(output),{recursive:true});
  await copyFile(input,output);
 }
}

function href(output){
 const name=posix(relative(outdir,resolve(root,output)));
 if(name.startsWith('../')||name==='..')throw new Error('Build output escaped dist.');
 return './'+name;
}

async function finishSite(result){
 if(result.errors.length)return;
 const main=Object.entries(result.metafile.outputs).find(([path,info])=>path.endsWith('.js')&&info.entryPoint&&resolve(root,info.entryPoint)===entry);
 if(!main||!main[1].cssBundle)throw new Error('The application entry or stylesheet is missing.');
 const source=await readFile(join(root,'index.html'),'utf8');
 const sourceEntry=/<script\b(?=[^>]*\btype\s*=\s*["']module["'])(?=[^>]*\bsrc\s*=\s*["']\/src\/main\.tsx["'])[^>]*>\s*<\/script>/gi;
 if([...source.matchAll(sourceEntry)].length!==1||!/<\/head>/i.test(source))throw new Error('Expected one application module and a document head in index.html.');
 const html=source
  .replace(sourceEntry,`<script type="module" src="${href(main[0])}"></script>`)
  .replace(/<\/head>/i,`<link rel="stylesheet" href="${href(main[1].cssBundle)}"/></head>`);
 await copyPublic();
 await mkdir(join(outdir,'images'),{recursive:true});
 await copyFile(join(root,'images/optimized/share.jpg'),join(outdir,'images/share.jpg'));
 await writeFile(join(outdir,'index.html'),html);
 console.log(`Built invitation with ${Object.keys(result.metafile.outputs).length} hashed bundle outputs.`);
}

const fileExtensions=['.webp','.png','.jpeg','.jpg','.svg','.avif','.gif','.ico','.woff2','.woff','.ttf','.otf','.eot','.mp3','.m4a','.ogg','.wav','.aac','.flac','.mp4','.webm'];
const loader=Object.fromEntries(fileExtensions.flatMap(extension=>[[extension,'file'],[extension.toUpperCase(),'file']]));
const fileFilter=new RegExp(`\\.(?:${Object.keys(loader).map(extension=>extension.slice(1)).join('|')})(?:[?#].*)?$`);
const options={
 absWorkingDir:root,
 entryPoints:[entry],
 outdir,
 bundle:true,
 format:'esm',
 platform:'browser',
 target:'es2022',
 jsx:'automatic',
 minify:true,
 charset:'utf8',
 sourcemap:false,
 legalComments:'eof',
 metafile:true,
 entryNames:'assets/[name]-[hash]',
 chunkNames:'assets/chunk-[hash]',
 assetNames:'assets/[name]-[hash]',
 loader,
 define:{
  'process.env.NODE_ENV':'"production"',
  'import.meta.env.BASE_URL':'"./"',
  'import.meta.env.PROD':'true',
  'import.meta.env.DEV':'false',
  'import.meta.env.MODE':'"production"',
  // Deliberately expose only this public SDK identifier, never the environment.
  'import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY':JSON.stringify(process.env.VITE_KAKAO_JAVASCRIPT_KEY||''),
 },
 logLevel:'silent',
 plugins:[{
  name:'module-relative-asset-urls',
  setup(builder){
   builder.onResolve({filter:fileFilter},async args=>{
    if(args.namespace==='asset-url')return {path:args.path,namespace:'file'};
    if(args.pluginData?.nativeAsset||!['import-statement','dynamic-import','require-call'].includes(args.kind))return;
    const resolved=await builder.resolve(args.path,{
     kind:args.kind,importer:args.importer,namespace:args.namespace,
     resolveDir:args.resolveDir,pluginData:{nativeAsset:true},
    });
    if(resolved.errors.length)return {errors:resolved.errors};
    return {path:resolved.path,namespace:'asset-url'};
   });
   builder.onLoad({filter:/.*/,namespace:'asset-url'},args=>({
    // File-loader exports are relative to the generated JS. HTML image/audio
    // attributes need an absolute URL so GitHub Pages subpaths also work.
    contents:`import asset from ${JSON.stringify(args.path)};export default new URL(asset,import.meta.url).href;`,
    loader:'js',resolveDir:dirname(args.path),watchFiles:[args.path],
   }));
  },
 },{
  name:'public-css-icons',
  setup(builder){
   builder.onResolve({filter:/^\/icons\//},async args=>{
    if(args.kind!=='url-token')return;
    const file=resolve(publicDir,args.path.slice(1));
    if(posix(relative(publicDir,file)).startsWith('../')||!(await stat(file)).isFile())throw new Error('Missing public CSS icon.');
    // The emitted CSS lives in dist/assets; icons remain in dist/icons.
    return {path:'../'+args.path.slice(1),external:true,watchFiles:[file]};
   });
  },
 },{
  name:'invitation-html-and-public-assets',
  setup(builder){builder.onEnd(finishSite)},
 }],
};

try{
 const args=process.argv.slice(2);
 if(args.some(arg=>arg!=='--serve'))throw new Error('Only --serve is supported.');
 await rm(outdir,{recursive:true,force:true});
 await mkdir(outdir,{recursive:true});
 if(args.includes('--serve')){
  activeContext=await context(options);
  await activeContext.rebuild();
  await activeContext.watch();
  await activeContext.serve({servedir:outdir,host:'127.0.0.1',port:5173});
  console.log('Local invitation: http://127.0.0.1:5173/ (reload after source edits).');
  const shutdown=async()=>{await activeContext.dispose();process.exit(0)};
  process.once('SIGINT',shutdown);
  process.once('SIGTERM',shutdown);
 }else await build(options);
}catch(error){
 await activeContext?.dispose();
 // Compiler source lines can contain private values. Report locations only.
 console.error('Invitation build failed; check source syntax and generated assets locally.');
 for(const diagnostic of error.errors||[]){
  const location=diagnostic.location;
  if(location?.file)console.error(`${location.file}:${location.line}:${location.column}`);
 }
 process.exitCode=1;
}
