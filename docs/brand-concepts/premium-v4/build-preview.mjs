import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('.', import.meta.url));
const r = 'M98 32H119C140 32 150 43 147 61C145 74 137 81 124 84L144 112Q145 114 143 114L122 110L105 88H93L75 117H53L81 72H115C124 72 130 67 131 61C132 54 126 50 117 50H87Z';
const v = 'M11 63L20 57Q22 56 24 58L42 78L86 12Q87.5 10 89.5 11.3L99 17.2Q101 18.5 99.6 20.8L53 94Q49 100 43 100Q39 100 35 96L10 71Q7 67.5 11 63Z';
const defs = '<linearGradient id="lime" x1="25" y1="100" x2="92" y2="11" gradientUnits="userSpaceOnUse"><stop stop-color="#63DF16"/><stop offset=".6" stop-color="#A8F900"/><stop offset="1" stop-color="#D5FF45"/></linearGradient>';
const shape = color => `<path d="${r}" fill="${color}"/><path d="${v}" fill="url(#lime)"/>`;
for (const [theme, color] of [['light', '#172033'], ['dark', '#F8FAFC']]) {
  writeFileSync(`${dir}mark-${theme}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="990" viewBox="0 0 160 132" role="img" aria-label="vouRevisar — conceito premium"><defs>${defs}</defs>${shape(color)}</svg>\n`);
}
const current = readFileSync(new URL('../../../public/brand/vourevisar-mark.svg', import.meta.url), 'utf8').replace(/<svg[^>]*>/, '<symbol id="current" viewBox="0 0 128 112">').replace('</svg>', '</symbol>').replaceAll('id="lime"', 'id="old-lime"').replaceAll('url(#lime)', 'url(#old-lime)');
const board = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1000">
<defs>${defs}${current}<symbol id="new-light" viewBox="0 0 160 132">${shape('#172033')}</symbol><symbol id="new-dark" viewBox="0 0 160 132">${shape('#F8FAFC')}</symbol></defs>
<rect width="1400" height="1000" fill="#F8FAFC"/>
<rect x="700" width="700" height="670" fill="#111722"/>
<text x="64" y="74" font-family="Helvetica Neue, Arial, sans-serif" font-size="27" font-weight="600" fill="#172033">vouRevisar / proposta premium</text>
<text x="64" y="107" font-family="Helvetica Neue, Arial, sans-serif" font-size="16" fill="#657080">Exploração de marca · versão 04</text>
<text x="764" y="76" font-family="Helvetica Neue, Arial, sans-serif" font-size="17" fill="#AAB5C5">Aplicação no escuro</text>
<use href="#new-light" x="120" y="204" width="470" height="388"/>
<use href="#new-dark" x="820" y="204" width="470" height="388"/>
<line x1="64" x2="1336" y1="670" y2="670" stroke="#D9DFE8"/>
<text x="64" y="725" font-family="Helvetica Neue, Arial, sans-serif" font-size="20" font-weight="600" fill="#172033">Comparação com a marca atual</text>
<use href="#current" x="80" y="778" width="150" height="132"/>
<use href="#new-light" x="322" y="778" width="160" height="132"/>
<text x="155" y="948" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="15" fill="#657080">ATUAL</text>
<text x="402" y="948" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="15" fill="#657080">PROPOSTA</text>
<line x1="554" x2="554" y1="772" y2="950" stroke="#D9DFE8"/>
<text x="620" y="809" font-family="Helvetica Neue, Arial, sans-serif" font-size="19" font-weight="600" fill="#172033">Mais precisão. Mais movimento.</text>
<text x="620" y="841" font-family="Helvetica Neue, Arial, sans-serif" font-size="16" fill="#657080">Check contínuo, R sólido e recorte diagonal entre as letras.</text>
<use href="#new-light" x="620" y="883" width="40" height="33"/>
<use href="#new-light" x="696" y="874" width="60" height="50"/>
<use href="#new-light" x="792" y="865" width="80" height="66"/>
<text x="954" y="915" font-family="Helvetica Neue, Arial, sans-serif" font-size="15" fill="#657080">Conceito para avaliação</text>
</svg>`;
writeFileSync(`${dir}preview.svg`, board);
