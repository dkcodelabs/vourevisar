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

console.log('🤖 Testing Google Generative Language API (Gemini)...');
console.log(`🔑 API Key: ${API_KEY ? 'Presente (' + API_KEY.substring(0, 10) + '...)' : 'MISSING'}`);

if (!API_KEY) {
    console.error('❌ Falta API Key no .env');
    process.exit(1);
}

// List models endpoint
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        // Native fetch (Node 21+)
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCESSO! A API retornou os modelos disponíveis:');
            if (data.models && data.models.length > 0) {
                console.log('------------------------------------------------');
                data.models.forEach(model => {
                    // Filter for Gemini models to keep output clean
                    if (model.name.includes('gemini')) {
                        console.log(`• ${model.name.replace('models/', '')}`);
                    }
                });
                console.log('------------------------------------------------');
                console.log('💡 DICA: Use um dos nomes acima EXATAMENTE como aparece.');
            } else {
                console.log('⚠️ A lista de modelos veio vazia.');
            }
        } else {
            console.error('❌ ERRO NA API:');
            console.error(JSON.stringify(data, null, 2));

            if (data.error && data.error.code === 404) {
                console.error('\n⚠️ Diagnóstico: 404 NOT FOUND.');
                console.error('Isso geralmente significa que a "Generative Language API" NÃO está ativada neste projeto.');
            }
        }
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
    }
}

listModels();
