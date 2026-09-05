// Mechanical exports from the geometry consumed by BrandMark; requires sharp.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const sharp = createRequire(import.meta.url)('sharp');
const root = resolve(import.meta.dirname, '..');
const g = JSON.parse(await readFile(resolve(root, 'src/components/brand/brand-geometry.json'), 'utf8'));
const kit = 'docs/brand-kit-premium';
const defs = `<defs><linearGradient id="lime" ${Object.entries(g.gradient).map(([k,v]) => `${k}="${v}"`).join(' ')} gradientUnits="userSpaceOnUse">${g.stops.map(([offset,color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('')}</linearGradient></defs>`;
const paths = (color, mono = false) => `<path d="${g.r}" fill="${color}"/><path d="${g.check}" fill="${mono ? color : 'url(#lime)'}"/>`;
const svg = (width,height,body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="vouRevisar">${defs}${body}</svg>\n`;
const mark = color => svg(160,132,paths(color));
const square = (color,bg,profile = false) => svg(160,160,`${bg ? `<rect width="160" height="160" fill="${bg}"/>` : ''}<g transform="${profile ? 'translate(24 34) scale(.7)' : 'translate(0 14)'}">${paths(color)}</g>`);
const horizontal = (color,mono = false) => svg(520,128,`<g transform="translate(0 4) scale(.88)">${paths(color,mono)}</g><text x="148" y="80" fill="${color}" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="55" font-weight="800" letter-spacing="-1.6"><tspan font-weight="500" opacity=".65">vou</tspan><tspan>Revisar</tspan></text>`);
const save = async (path, data) => { await mkdir(resolve(root,path,'..'),{recursive:true}); await writeFile(resolve(root,path),data); };
const png = async (path, source, width, height = width) => {
  const buffer = await sharp(Buffer.from(source)).resize(width,height).png().toBuffer();
  await save(path,buffer);
  const meta = await sharp(buffer).metadata();
  if (meta.width !== width || meta.height !== height) throw new Error(`Invalid size: ${path}`);
  return buffer;
};
for (const [theme,color,name] of [['light',g.light,'R-escuro'],['dark',g.dark,'R-claro']]) {
  await save(`public/brand/vourevisar-mark${theme === 'dark' ? '-dark' : ''}.svg`,mark(color));
  await save(`public/brand/vourevisar-logo-horizontal${theme === 'dark' ? '-dark' : ''}.svg`,horizontal(color));
  await save(`${kit}/vetores/vourevisar-${name}.svg`,mark(color));
  for (const size of [64,128,256,512,1024,2048,4096]) await png(`${kit}/transparentes/vourevisar-${name}-${size}.png`,square(color),size);
  await png(`public/brand/vourevisar-mark-${theme}-bg.png`,square(color),1024);
  await png(`${kit}/perfil/vourevisar-perfil-${theme === 'dark' ? 'escuro' : 'claro'}-1080.png`,square(color,theme === 'dark' ? g.background : g.dark,true),1080);
}
await copyFile(resolve(root,'public/brand/vourevisar-mark-light-bg.png'),resolve(root,'public/brand/vourevisar-mark.png'));
await save('public/brand/vourevisar-logo-mono.svg',horizontal(g.light,true));
await png('public/brand/vourevisar-logo-horizontal.png',horizontal(g.light),1560,384);
const icon = svg(160,160,`<rect width="160" height="160" rx="34" fill="${g.background}"/><g transform="translate(8 20) scale(.9)">${paths(g.dark)}</g>`);
await save('public/favicon-vourevisar.svg',icon);
const icoBuffers = [];
for (const size of [16,32,48,180,192,512]) {
  const buffer = await png(`public/icons/vourevisar-${size}.png`,icon,size);
  if (size <= 48) icoBuffers.push({size,buffer});
}
const header = Buffer.alloc(6 + icoBuffers.length * 16);
header.writeUInt16LE(1,2); header.writeUInt16LE(icoBuffers.length,4);
let offset = header.length;
icoBuffers.forEach(({size,buffer},i) => {
  const p = 6 + i * 16; header[p] = size; header[p+1] = size;
  header.writeUInt16LE(1,p+4); header.writeUInt16LE(32,p+6);
  header.writeUInt32LE(buffer.length,p+8); header.writeUInt32LE(offset,p+12);
  offset += buffer.length;
});
await save('public/favicon.ico',Buffer.concat([header,...icoBuffers.map(x=>x.buffer)]));
const social = svg(1200,630,`<rect width="1200" height="630" fill="${g.background}"/><g transform="translate(140 125) scale(2.65)">${paths(g.dark)}</g><text x="620" y="295" fill="${g.dark}" font-family="Arial, sans-serif" font-size="65" font-weight="700">vouRevisar</text><text x="622" y="348" fill="#AAB5C5" font-family="Arial, sans-serif" font-size="24">Revisão inteligente para concursos.</text>`);
await save('public/images/vourevisar-social.svg',social);
await png('public/images/vourevisar-social.png',social,1200,630);
console.log('Exported brand assets, transparent PNGs 64–4096, profile images, favicon and social image.');
