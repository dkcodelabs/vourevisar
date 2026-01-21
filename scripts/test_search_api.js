import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
    }
});

const API_KEY = env.VITE_GOOGLE_API_KEY;
const CX = env.VITE_GOOGLE_SEARCH_ENGINE_ID;

console.log('🔍 Testing Google Custom Search API...');
console.log(`🔑 API Key: ${API_KEY ? 'Presente (' + API_KEY.substring(0, 10) + '...)' : 'MISSING'}`);
console.log(`🔎 ID CX: ${CX}`);

if (!API_KEY || !CX) {
    console.error('❌ Falta API Key ou Search Engine ID no .env');
    process.exit(1);
}

// Simple query to test access
const query = "teste";
const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${query}`;

async function testSearch() {
    try {
        // Native fetch (Node 21+)
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCESSO! A API retornou resultados.');
            console.log(`📄 Total Results: ${data.searchInformation?.totalResults || 'N/A'}`);
            console.log('🎉 A chave está configurada corretamente para Busca!');
        } else {
            console.error('❌ ERRO NA API:');
            console.error(JSON.stringify(data, null, 2));

            if (data.error && data.error.code === 403) {
                console.error('\n⚠️ Diagnóstico: PERMISSÃO NEGADA.');
                console.error('Provavelmente a "Custom Search API" ainda não está ativada na chave ou no projeto.');
            }
        }
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
    }
}

testSearch();
