import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, readdir, realpath, stat} from 'node:fs/promises';
import {basename, extname, join, relative, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const index = join(dist, 'index.html');
const html = await readFile(index, 'utf8');
const label = path => relative(root, path);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const mediaExtension = /\.(?:webp|png|jpe?g|svg|mp3|m4a|ogg|wav|woff2?)(?:[?#].*)?$/i;

async function filesWithin(directory) {
 const files = [];
 for (const entry of await readdir(directory, {withFileTypes: true})) {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) files.push(...await filesWithin(path));
  else files.push(path);
 }
 return files;
}
const files = await filesWithin(dist);
const scriptFiles = files.filter(path => extname(path) === '.js' && path !== join(dist, 'sw.js'));
const cssFiles = files.filter(path => extname(path) === '.css');
const scripts = await Promise.all(scriptFiles.map(async path => ({path, text: await readFile(path, 'utf8')})));
const styles = await Promise.all(cssFiles.map(async path => ({path, text: await readFile(path, 'utf8')})));

function attributes(tag) {
 return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(([, name, , value]) => [name.toLowerCase(), value]));
}
function assertInside(path) {
 const fromDist = relative(dist, path);
 assert.ok(fromDist !== '..' && !fromDist.startsWith(`..${sep}`), `${label(path)}: asset escapes dist`);
}
async function existingAsset(reference, owner) {
 // Callers select the actual browser base: HTML document, stylesheet, or JS
 // module for a new URL(asset, import.meta.url) wrapper.
 assert.ok(reference && !/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(reference), `${label(owner)}: expected a relative asset URL`);
 let path;
 try { path = fileURLToPath(new URL(reference, pathToFileURL(owner))); }
 catch { assert.fail(`${label(owner)}: invalid asset URL`); }
 assertInside(path);
 let actual;
 try { actual = await realpath(path); }
 catch { assert.fail(`${label(path)}: referenced asset is missing`); }
 assertInside(actual);
 const info = await stat(actual);
 assert.ok(info.isFile() && info.size > 0, `${label(path)}: asset must be a nonempty file`);
 return path;
}
function cssReferences(text) {
 return [...text.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/g)].map(([, , quoted, unquoted]) => (quoted ?? unquoted).trim());
}
function javascriptMediaReferences(text, owner) {
 const references = [];
 const moduleRelativeRanges = [];
 // Vite can emit a literal directly; esbuild's file-loader wrapper retains a
 // local asset variable. Inspect both static forms without executing the JS.
 for (const match of text.matchAll(/new\s+URL\(\s*(["'`])([^"'`\\]+)\1\s*,\s*import\.meta\.url\)/g)) {
  if (!mediaExtension.test(match[2])) continue;
  references.push({reference: match[2], owner});
  moduleRelativeRanges.push([match.index, match.index + match[0].length]);
 }
 const wrappedNames = new Set([...text.matchAll(/new\s+URL\(\s*([$A-Z_a-z][$\w]*)\s*,\s*import\.meta\.url\)/g)].map(([, name]) => name));
 for (const match of text.matchAll(/(?<![$\w])([$A-Z_a-z][$\w]*)\s*=\s*(["'`])([^"'`\\]+)\2/g)) {
  if (!wrappedNames.has(match[1]) || !mediaExtension.test(match[3])) continue;
  references.push({reference: match[3], owner});
  moduleRelativeRanges.push([match.index, match.index + match[0].length]);
 }
 // A raw relative string assigned to img/audio src is document-relative, not
 // module-relative. This also catches missing URL wrappers such as ./photo.webp.
 for (const match of text.matchAll(/(["'`])(\.\/[^"'`\\]+)\1/g)) {
  if (!mediaExtension.test(match[2]) || moduleRelativeRanges.some(([start, end]) => match.index >= start && match.index < end)) continue;
  references.push({reference: match[2], owner: index});
 }
 return references;
}
const mediaReferences = scripts.flatMap(({path, text}) => javascriptMediaReferences(text, path));

// These tests check the emitted artifact, independently of the source builder.
// Security policy, credentials, CSP and dependency scanning remain in security:check.
test('HTML loads nonempty local JavaScript and stylesheet entry files', async () => {
 const modules = [...html.matchAll(/<script\b[^>]*>/gi)].map(([tag]) => attributes(tag)).filter(attrs => attrs.type === 'module' && attrs.src);
 const stylesheets = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag)).filter(attrs => attrs.rel === 'stylesheet' && attrs.href);
 assert.ok(modules.length > 0, 'dist/index.html: missing module entry');
 assert.ok(stylesheets.length > 0, 'dist/index.html: missing stylesheet entry');
 for (const {src} of modules) assert.equal(extname(await existingAsset(src, index)), '.js');
 for (const {href} of stylesheets) assert.equal(extname(await existingAsset(href, index)), '.css');
});

test('every CSS url resolves from its stylesheet to an emitted asset inside dist', async () => {
 assert.ok(styles.length > 0, 'dist: no emitted stylesheet');
 let references = 0;
 for (const {path, text} of styles) {
  for (const reference of cssReferences(text)) { await existingAsset(reference, path); references += 1; }
 }
 assert.ok(references > 0, 'dist: stylesheet has no external font or image assets');
});

test('JavaScript media URLs resolve from the document or import.meta.url to real emitted files', async () => {
 assert.ok(mediaReferences.length > 0, 'dist: no emitted JavaScript media references found');
 for (const {reference, owner} of mediaReferences) await existingAsset(reference, owner);
});

test('font subsets remain external files instead of embedded data URLs', async () => {
 const fonts = files.filter(path => /\.woff2?$/.test(path));
 assert.ok(fonts.some(path => basename(path).startsWith('pretendard-primary-')), 'dist/assets: missing Pretendard subset');
 assert.ok(fonts.some(path => basename(path).startsWith('nanum-intro-')), 'dist/assets: missing intro font subset');
 for (const {path, text} of styles) {
  for (const [face] of text.matchAll(/@font-face\s*\{[^}]*\}/g)) {
   assert.ok(!/url\(\s*["']?data:/i.test(face), `${label(path)}: font face contains an inline data URL`);
  }
 }
 for (const {path, text} of [...styles, ...scripts]) {
  assert.ok(!/data:(?:font\/|application\/(?:x-font|font-|vnd\.ms-fontobject))/i.test(text), `${label(path)}: contains an inline font`);
 }
});

test('all 21 gallery photos and 21 thumbnails are emitted unchanged and referenced by JavaScript', async () => {
 const emitted = new Map();
 for (const path of files.filter(path => path.endsWith('.webp'))) {
  const digest = hash(await readFile(path));
  if (!emitted.has(digest)) emitted.set(digest, []);
  emitted.get(digest).push(path);
 }
 const references = new Set(mediaReferences.map(({reference, owner}) => fileURLToPath(new URL(reference, pathToFileURL(owner)))));
 const used = new Set();
 for (const folder of ['gallery', 'thumbnails']) {
  const directory = join(root, 'images/optimized', folder);
  const photos = (await readdir(directory)).filter(name => name.endsWith('.webp')).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  assert.equal(photos.length, 21, `images/optimized/${folder}: expected 21 photos`);
  for (let index = 0; index < photos.length; index += 1) {
   assert.equal(photos[index], `${String(index + 1).padStart(2, '0')}.jpeg.webp`, `images/optimized/${folder}: photo numbering must be consecutive`);
   const source = join(directory, photos[index]);
   const matches = emitted.get(hash(await readFile(source))) ?? [];
   assert.ok(matches.length > 0, `${label(source)}: matching emitted asset is missing`);
   const referenced = matches.find(path => references.has(path));
   assert.ok(referenced, `${label(source)}: emitted asset is not referenced by JavaScript`);
   used.add(referenced);
  }
 }
 assert.equal(used.size, 42, 'dist/assets: expected separate full-size and thumbnail assets for all 21 photos');
});

test('map image, sharing image, service worker and font licenses survive the build', async () => {
 const map = files.find(path => /^map-naver-.+\.webp$/.test(basename(path)));
 assert.ok(map, 'dist/assets: missing map-naver image');
 assert.equal(hash(await readFile(map)), hash(await readFile(join(root, 'images/optimized/map-naver.webp'))), 'dist/assets: map bytes differ from the optimized source');
 for (const reference of ['./images/share.jpg', './sw.js', './fonts/Pretendard-LICENSE.txt', './fonts/NanumPenScript-OFL.txt']) {
  await existingAsset(reference, index);
 }
});

test('map remains a single Naver place link with no removed zoom controls', () => {
 const script = scripts.map(({text}) => text).join('\n');
 assert.ok(script.includes('https://map.naver.com/p/entry/place/1634613412'), 'dist/assets: missing Naver venue link');
 for (const removed of ['map-canvas', 'map-zoom-controls', 'map-reset', 'map-zoom-status', '지도 확대', '지도 축소', '지도 원래 크기로']) {
  assert.ok(!script.includes(removed), 'dist/assets: removed map zoom controls remain in JavaScript');
 }
});
