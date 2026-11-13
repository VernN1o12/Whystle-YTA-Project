// Channel art: renders the profile picture and banner (plus honest crop previews) with the episode engine.
// Run from the studio folder:
//   node <skill>/scripts/channel-art.mjs
// Writes into the channel-art folder beside the studio:
//   avatar-1-happy.png, avatar-2-zoom.png, avatar-3-cool.png   (800 x 800)
//   banner-1-dusk.png, banner-2-night.png                      (2560 x 1440)
//   preview/avatar-N-circle.png                                (how YouTube crops the avatar)
//   preview/banner-N-desktop.png                               (the 1546 x 423 band a browser shows)
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('package.json'));
const { bundle } = require('@remotion/bundler');
const { renderStill, selectComposition } = require('@remotion/renderer');

const OUT = path.resolve('..', 'channel-art');

const serveUrl = await bundle({ entryPoint: path.resolve('src/art/index.tsx'), publicDir: path.resolve('public') });

const jobs = [
  ['Avatar1', 'avatar-1-happy.png'],
  ['Avatar2', 'avatar-2-zoom.png'],
  ['Avatar3', 'avatar-3-cool.png'],
  ['AvatarCircle1', 'preview/avatar-1-circle.png'],
  ['AvatarCircle2', 'preview/avatar-2-circle.png'],
  ['AvatarCircle3', 'preview/avatar-3-circle.png'],
  ['BannerDusk', 'banner-1-dusk.png'],
  ['BannerNight', 'banner-2-night.png'],
  ['BannerDuskDesktop', 'preview/banner-1-desktop.png'],
  ['BannerNightDesktop', 'preview/banner-2-desktop.png'],
];

const started = Date.now();
for (const [id, rel] of jobs) {
  const composition = await selectComposition({ serveUrl, id });
  const output = path.join(OUT, rel);
  await renderStill({ serveUrl, composition, frame: 0, output, overwrite: true });
  process.stdout.write(`${rel} `);
}
console.log(`\ndone (${Math.round((Date.now() - started) / 1000)}s) -> ${OUT}`);
