import {context} from 'esbuild';
import {access} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const directory=join(root,'dist');
let server;
try{
 await access(join(directory,'index.html'));
 server=await context({absWorkingDir:root,logLevel:'silent'});
 await server.serve({servedir:directory,host:'127.0.0.1',port:4173});
 console.log('Invitation preview: http://127.0.0.1:4173/');
 const shutdown=async()=>{await server.dispose();process.exit(0)};
 process.once('SIGINT',shutdown);
 process.once('SIGTERM',shutdown);
}catch{
 await server?.dispose();
 console.error('Preview could not start. Build the site first and check that port 4173 is available.');
 process.exitCode=1;
}
