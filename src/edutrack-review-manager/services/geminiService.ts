import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Subject } from "../../types";

// Prefer using various Vite env variable names or fallback
const apiKey = 
  (import.meta as any).env?.VITE_GEMINI_API_KEY || 
  (import.meta as any).env?.VITE_GOOGLE_API_KEY || 
  "";
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://ebghgbzvdiytxuxmnvvt.supabase.co";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function getStudyInsight(topic: string, difficulty: number, timeSpent: number) {
  if (!apiKey) {
    console.warn("Gemini API Key missing. Returning fallback.");
    return "Continue focado! A consistência é a chave para o aprendizado a longo prazo.";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });

    const prompt = `O estudante revisou o tópico "${topic}". 
    Dificuldade relatada: ${difficulty}/5 (1=Fácil, 5=Difícil). 
    Tempo gasto: ${timeSpent} minutos.
    
    Forneça um insight curto (máximo 2 frases) com uma estratégia de revisão específica para este nível de dificuldade. 
    Responda em Português do Brasil.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();

  } catch (error) {
    console.error("Error fetching study insight:", error);
    return "Continue focado! A consistência é a chave para o aprendizado a longo prazo.";
  }
}

/**
 * Buscar prompt de mesclagem do banco
 */
async function getMergePromptFromDB(): Promise<string | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/system_settings?key=eq.ai_merge_prompt&select=value`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.[0]?.value || null;
  } catch (e) {
    console.warn('Erro ao buscar prompt do banco:', e);
    return null;
  }
}

/**
 * Sugestion de mescla baseada em conteúdo usando Gemini
 */
export async function suggestContentBasedMerges(subjects: Subject[]) {
  if (!apiKey || subjects.length < 2) return [];

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Enviar apenas nomes e tópicos para otimizar tokens
    const subjectsSummary = subjects.map(s => ({
      id: s.id,
      name: s.name,
      topics: s.topics.map(t => t.name).slice(0, 15) // Primeiros 15 tópicos por matéria
    }));

    // Buscar prompt do banco
    const dbPrompt = await getMergePromptFromDB();
    
    // Se não tiver no banco, usar fallback hardcoded
    let prompt = dbPrompt || `Analise a seguinte lista de matérias de um edital de concurso público. 
    Algumas matérias podem ser idênticas ou tratar do mesmo assunto, mesmo com nomes diferentes (ex: "Direito Constitucional" e "D. Const."). 
    Sua tarefa é identificar matérias duplicadas ou que deveriam ser UNIDAS em uma só com base em seus NOMES e TÓPICOS.

    MATÉRIAS: 
    $SUBJECTS$

    Responda em JSON rigoroso com este formato:
    [{ "subjectIds": ["id1", "id2"], "suggestedName": "Nome Sugerido Unificado" }]
    
    Apenas inclua sugestões com ALTA confiança de duplicidade ou sobreposição total de conteúdo.
    Se não houver sugestões claras, retorne uma lista vazia [].`;

    // Substituir placeholder $SUBJECTS$ pelos dados reais
    prompt = prompt.replace('$SUBJECTS$', JSON.stringify(subjectsSummary, null, 2));

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Erro ao fazer parse da resposta do Gemini:", text);
      return [];
    }
  } catch (error) {
    console.error("Erro ao sugerir mesclas com Gemini:", error);
    return [];
  }
}