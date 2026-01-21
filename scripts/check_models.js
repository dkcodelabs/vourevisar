
import fs from 'fs';
import path from 'path';

async function listModels() {
    // Manually read .env file
    let apiKey = '';
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/VITE_GOOGLE_API_KEY=(.*)/);
            if (match && match[1]) {
                apiKey = match[1].trim().replace(/['"]/g, '');
            }
        }
    } catch (e) {
        console.error("Error reading .env:", e);
    }

    if (!apiKey) {
        console.error("❌ VITE_GOOGLE_API_KEY not found in .env");
        process.exit(1);
    }

    console.log(`🔑 Using API Key: ${apiKey.substring(0, 10)}...`);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        console.log(`📡 Fetching models from: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`❌ API Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        const models = data.models || [];

        console.log("\n✅ Available Models:");
        const generateModels = models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name);

        generateModels.forEach(name => console.log(`- ${name}`));

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    }
}

listModels();
