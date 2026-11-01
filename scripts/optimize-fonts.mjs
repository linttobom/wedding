import {mkdir, readdir, readFile, rm, writeFile} from 'node:fs/promises';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';

const output = 'src/generated';
await rm(`${output}/fonts`, {recursive: true, force: true});
await mkdir(`${output}/fonts`, {recursive: true});
const files = (await readdir('src', {recursive: true}))
  .filter(file => !file.startsWith('generated/') && /\.(tsx?|css)$/.test(file));
const source = (await Promise.all(files.map(file => readFile(`src/${file}`, 'utf8')))).join('\n');
const primaryCharacters = new Set([...source, ...Array.from({length: 95}, (_, i) => String.fromCodePoint(i + 32))].map(char => char.codePointAt(0)));
const rules = [];

function unicodeRange(codes) {
  const ranges = [];
  for (let i = 0; i < codes.length; i++) {
    const first = codes[i];
    while (codes[i + 1] === codes[i] + 1) i++;
    ranges.push(`U+${first.toString(16)}${codes[i] === first ? '' : `-${codes[i].toString(16)}`}`);
  }
  return ranges.join(',');
}

async function generate(font, codes, family, name, weight) {
  const buffer = await subsetFont(font, String.fromCodePoint(...codes), {
    targetFormat: 'woff2', preserveNameIds: [0, 13, 14],
  });
  const included = new Set(fontkit.create(buffer).characterSet);
  if (codes.some(code => !included.has(code))) {
    throw new Error(`Font subset ${name} is missing required characters.`);
  }
  await writeFile(`${output}/fonts/${name}.woff2`, buffer);
  rules.push(`@font-face{font-family:${family};src:url('./fonts/${name}.woff2') format('woff2');font-weight:${weight};font-style:normal;font-display:swap;unicode-range:${unicodeRange(codes)}}`);
  return buffer.length;
}

const pretendard = await readFile('public/fonts/PretendardVariable.woff2');
const supported = fontkit.create(pretendard).characterSet.sort((a, b) => a - b);
const primary = supported.filter(code => primaryCharacters.has(code));
const primarySize = await generate(pretendard, primary, 'Pretendard', 'pretendard-primary', '45 920');
// Every visible string is defined in src and the subset is rebuilt before dev/build.
// Keep the full font in public/fonts as the source, without shipping unused glyphs.

const experience = await readFile('src/Experience.tsx', 'utf8');
const introText = [...experience.matchAll(/className="intro-message">([^<]+)</g)].map(match => match[1]).join('');
const nanum = await readFile('public/fonts/NanumPenScript-Regular.ttf');
const introCharacters = new Set([...introText].map(char => char.codePointAt(0)));
const intro = fontkit.create(nanum).characterSet.filter(code => introCharacters.has(code)).sort((a, b) => a - b);
const introSize = await generate(nanum, intro, 'NanumPen', 'nanum-intro', '400');
await writeFile(`${output}/fonts.css`, rules.join('\n') + '\n');
console.log(`Font subsets: Pretendard ${primarySize} bytes, NanumPen ${introSize} bytes. Original fonts are preserved locally.`);
