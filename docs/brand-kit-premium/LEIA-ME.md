# vouRevisar — kit aprovado

## Qual arquivo usar

- **R-escuro:** logo transparente para anúncios e materiais com fundo claro.
- **R-claro:** logo transparente para anúncios e materiais com fundo escuro.
- **perfil-claro / perfil-escuro:** imagens 1080 × 1080 com fundo e margem segura para recorte circular de Instagram e outras redes.

O símbolo não inclui o nome vouRevisar.

## Tamanhos

PNGs transparentes quadrados: 64, 128, 256, 512, 1024, 2048 e 4096 pixels.
Para anúncios e Canva, prefira 2048 ou 4096. Para perfil, use as imagens da pasta `perfil`.
Os SVGs da pasta `vetores` podem ser ampliados sem perder qualidade.

Não estique a imagem; mantenha a proporção. Use a variante apropriada ao fundo.

## Fonte e reprodução

Geometria aprovada: `src/components/brand/brand-geometry.json`, compartilhada pelo aplicativo e pelo gerador `scripts/generate-brand-assets.mjs`.
Execute o gerador com Node e `sharp` disponível no caminho de módulos (`NODE_PATH`, se fornecido pelo ambiente). O gerador não depende dos esboços em `docs/brand-concepts`.
