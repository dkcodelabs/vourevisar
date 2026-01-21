import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa a SDK com sua chave
// Certifique-se de que a variável de ambiente está acessível no front-end (Vite usa import.meta.env.VITE_API_KEY geralmente)
const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

export async function getStudyInsight(topic: string, difficulty: number, timeSpent: number) {
  try {
    // 1. Definição do Modelo
    // Usamos 'gemini-1.5-flash-001' pois é a versão estável, rápida e barata.
    // Evita o erro 404 que acontece com aliases genéricos.
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-001",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });

    // 2. Montagem do Prompt
    const prompt = `O estudante revisou o tópico "${topic}". 
    Dificuldade relatada: ${difficulty}/5 (1=Fácil, 5=Difícil). 
    Tempo gasto: ${timeSpent} minutos.
    
    Forneça um insight curto (máximo 2 frases) com uma estratégia de revisão específica para este nível de dificuldade. 
    Responda em Português do Brasil.`;

    // 3. Chamada da API
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();

  } catch (error) {
    console.error("Error fetching study insight:", error);
    // Fallback elegante em caso de erro (cota excedida ou internet)
    return "Continue focado! A consistência é a chave para o aprendizado a longo prazo.";
  }
}