---
description: Baixar e converter tela do Stitch para componente React
---

# Workflow: Stitch → React

Este workflow automatiza o processo de baixar uma tela do Stitch e convertê-la em um componente React.

## Pré-requisitos
- Token OAuth válido configurado em `.vscode/settings.json`
- ID do projeto e ID da tela do Stitch

## Passos

### 1. Obter informações da tela
```bash
# Substitua PROJECT_ID e SCREEN_ID
curl -s -X POST \
  -H "Authorization: Bearer $(cat .vscode/settings.json | jq -r '.mcpServers.stitch.headers.Authorization' | cut -d' ' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_screen", "arguments": {"name": "projects/PROJECT_ID/screens/SCREEN_ID", "projectId": "PROJECT_ID", "screenId": "SCREEN_ID"}}, "id": 1}' \
  https://stitch.googleapis.com/mcp | jq -r '.result.content[0].text' > temp/screen_info.json
```

### 2. Baixar HTML
```bash
# Extrair URL do HTML
HTML_URL=$(cat temp/screen_info.json | jq -r '.htmlCode.downloadUrl')

# Baixar HTML
curl -s "$HTML_URL" -o temp/stitch_design.html
```

### 3. Baixar Screenshot (opcional, para referência)
```bash
# Extrair URL do screenshot
SCREENSHOT_URL=$(cat temp/screen_info.json | jq -r '.screenshot.downloadUrl')

# Baixar screenshot
curl -s "$SCREENSHOT_URL" -o temp/stitch_screenshot.png
```

### 4. Converter para React
Peça ao Antigravity:
> "Converta o arquivo temp/stitch_design.html em um componente React TypeScript. Use os componentes shadcn/ui existentes quando possível. Salve em src/components/[nome-apropriado].tsx"

### 5. Revisar e Ajustar
- Verifique imports
- Adicione lógica de estado se necessário
- Conecte com APIs do Supabase
- Teste o componente

## Exemplo de Uso

```bash
# Listar projetos
curl -s -X POST \
  -H "Authorization: Bearer $(cat .vscode/settings.json | jq -r '.mcpServers.stitch.headers.Authorization' | cut -d' ' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "list_projects", "arguments": {}}, "id": 1}' \
  https://stitch.googleapis.com/mcp | jq -r '.result.content[0].text' | jq '.projects[] | "\(.name) - \(.title)"'

# Listar telas de um projeto
curl -s -X POST \
  -H "Authorization: Bearer $(cat .vscode/settings.json | jq -r '.mcpServers.stitch.headers.Authorization' | cut -d' ' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "list_screens", "arguments": {"projectId": "PROJECT_ID"}}, "id": 1}' \
  https://stitch.googleapis.com/mcp | jq -r '.result.content[0].text' | jq '.screens[] | "\(.name) - \(.title)"'
```

## Notas
- O token OAuth expira em 1 hora. Regenere se necessário.
- Crie o diretório `temp/` se não existir: `mkdir -p temp`
- Mantenha consistência com o design system do projeto
