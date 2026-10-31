import {mkdir, readdir, rm} from 'node:fs/promises';
import sharp from 'sharp';

const output = 'images/optimized';
await rm(output, {recursive: true, force: true});
await mkdir(`${output}/gallery`, {recursive: true});
await mkdir(`${output}/thumbnails`, {recursive: true});

async function convert(input, destination, resize, quality = 90) {
  await sharp(input)
    .rotate()
    .resize({...resize, withoutEnlargement: true})
    .keepIccProfile()
    .webp({quality, effort: 6, smartSubsample: true})
    .toFile(destination);
}

for (const [name, width] of [['hero', 1800], ['greeting', 1320], ['attendance', 1500]]) {
  await convert(`images/${name}.png`, `${output}/${name}.webp`, {width});
}

const files = (await readdir('images/gallery'))
  .filter(file => /\.(png|jpe?g|webp|avif)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
for (const file of files) {
  await convert(`images/gallery/${file}`, `${output}/gallery/${file}.webp`, {width: 3000, height: 3000, fit: 'inside'});
  await convert(`images/gallery/${file}`, `${output}/thumbnails/${file}.webp`, {width: 480, height: 480, fit: 'cover'}, 88);
}
console.log(`Optimized 3 section photos and ${files.length} gallery photos with thumbnails.`);
