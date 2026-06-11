/**
 * One-off helper: SVG sources in src/assets → PNG for use in <img>.
 * Run: npm run export-icons
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'src', 'assets');

const exports = [
  { svg: 'coin.svg', png: 'coin.png', width: 64 },
  { svg: 'medal-gold.svg', png: 'medal-gold.png', width: 56 },
  { svg: 'medal-silver.svg', png: 'medal-silver.png', width: 56 },
  { svg: 'medal-bronze.svg', png: 'medal-bronze.png', width: 56 },
];

for (const item of exports) {
  const svgPath = path.join(assets, item.svg);
  const pngPath = path.join(assets, item.png);
  const svg = fs.readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: item.width },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(pngPath, png);
  console.log('wrote', item.png);
}
