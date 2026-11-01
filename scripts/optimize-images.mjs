import {mkdir, readdir, rm} from 'node:fs/promises';
import sharp from 'sharp';

const output = 'images/optimized';
await rm(output, {recursive: true, force: true});
await mkdir(`${output}/gallery`, {recursive: true});
await mkdir(`${output}/thumbnails`, {recursive: true});

const totals = {sections: 0, gallery: 0, thumbnails: 0, share: 0};

async function convert(input, destination, resize, category, quality = 85) {
  const {size} = await sharp(input)
    .rotate()
    .resize({...resize, withoutEnlargement: true})
    .keepIccProfile()
    .webp({quality, effort: 6, smartSubsample: true})
    .toFile(destination);
  totals[category] += size;
}

// The page is at most 440 CSS pixels wide: 1320px also covers 3x mobile screens.
for (const name of ['hero', 'greeting', 'attendance']) {
  await convert(`images/${name}.png`, `${output}/${name}.webp`, {width: 1320}, 'sections');
}

const files = (await readdir('images/gallery'))
  .filter(file => /\.(png|jpe?g|webp|avif)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
for (const file of files) {
  await convert(`images/gallery/${file}`, `${output}/gallery/${file}.webp`, {width: 2400, height: 2400, fit: 'inside'}, 'gallery');
  await convert(`images/gallery/${file}`, `${output}/thumbnails/${file}.webp`, {width: 480, height: 480, fit: 'cover'}, 'thumbnails', 82);
}

// Social preview services receive a broadly compatible JPEG, never the large PNG original.
const share = await sharp('images/greeting.png')
  .rotate()
  .resize({width: 1200, withoutEnlargement: true})
  .keepIccProfile()
  .jpeg({quality: 85, mozjpeg: true})
  .toFile(`${output}/share.jpg`);
totals.share = share.size;
console.log(`Optimized 3 section photos and ${files.length} gallery photos with thumbnails. Bytes: ${JSON.stringify(totals)}`);
