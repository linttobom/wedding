import {execFileSync} from 'node:child_process';
import {readdir, readFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvedAccounts, inspectCsp, inspectText, privateFile} from './security-rules.mjs';

const failures = [];
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
let publicNumbers = [];
try {
  const approval = approvedAccounts(JSON.parse(await readFile(join(root, 'src/accounts.public.json'), 'utf8')));
  publicNumbers = approval.numbers;
  failures.push(...approval.findings.map(kind => `src/accounts.public.json: ${kind}`));
} catch {
  failures.push('src/accounts.public.json: unable to validate explicitly approved public accounts');
}
let privateNumbers = [];
try {
  const groups = JSON.parse(await readFile(join(root, 'src/accounts.local.json'), 'utf8'));
  privateNumbers = groups.flatMap(group => group.accounts.map(account => account.number))
    .filter(number => typeof number === 'string' && number.replace(/\D/g, '').length >= 10);
} catch (error) {
  if (error.code !== 'ENOENT') failures.push('src/accounts.local.json: unable to validate local financial information');
}

const tracked = execFileSync('git', ['ls-files', '-z', '--', 'src/accounts.local.json', '.env', '.env.*'], {cwd: root, encoding: 'utf8'});
if (tracked) failures.push('Git index: local account or environment file must not be tracked');

async function inspect(directory) {
  for (const item of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, item.name), label = relative(root, path);
    if (item.isSymbolicLink()) { failures.push(`${label}: symbolic link in deployment`); continue; }
    if (item.isDirectory()) {
      if (/^\.|^(?:node_modules|sites-backend)$/i.test(item.name)) failures.push(`${label}: private/source directory in deployment`);
      await inspect(path);
      continue;
    }
    if (privateFile(item.name)) failures.push(`${label}: private/source file in deployment`);
    if (!/\.(?:html|js|css|json|svg|txt)$/i.test(item.name)) continue;
    const text = await readFile(path, 'utf8');
    failures.push(...inspectText(item.name, text, privateNumbers, publicNumbers).map(kind => `${label}: ${kind}`));
  }
}
await inspect(dist);
const html = await readFile(join(dist, 'index.html'), 'utf8');
failures.push(...inspectCsp(html).map(kind => `dist/index.html: ${kind}`));
const workflow = await readFile(join(root, '.github/workflows/pages.yml'), 'utf8');
if ([...workflow.matchAll(/uses:\s*([^\s#]+)/g)].some(([, action]) => !/@[a-f0-9]{40}$/.test(action))) failures.push('.github/workflows/pages.yml: action must use a full commit identifier');
if (!workflow.includes('persist-credentials: false')) failures.push('.github/workflows/pages.yml: checkout credentials must not persist');
const sdk = await readFile(join(root, 'src/kakao.ts'), 'utf8');
if (!/script\.integrity="sha384-[A-Za-z0-9+/=]+"/.test(sdk) || !sdk.includes('script.crossOrigin="anonymous"')) failures.push('src/kakao.ts: external SDK must use integrity verification');

// Any new parent-page SDK loader needs an explicit integrity/policy review.
for (const file of await readdir(join(root, 'src'), {recursive: true})) {
  if (!/\.(?:ts|tsx)$/.test(file) || file === 'kakao.ts' || file.startsWith('generated/')) continue;
  const source = await readFile(join(root, 'src', file), 'utf8');
  if (/createElement\s*\(\s*['"]script['"]\s*\)|youtube\.com\/iframe_api/.test(source)) failures.push(`src/${file}: unreviewed parent-page script loader`);
}
if (failures.length) {
  // Only paths and finding categories are reported; never print matched values.
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else console.log('Security artifact checks passed: six approved public accounts validated; other private data excluded; CSP, SDK integrity and pinned workflow verified.');
