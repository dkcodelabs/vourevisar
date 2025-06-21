
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionRequest {
  subject: string;
  topic: string;
  bank: string;
  quantity: number;
  difficulty: 'facil' | 'medio' | 'dificil';
  type: 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, topic, bank, quantity, difficulty, type }: QuestionRequest = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Configurar prompt baseado na banca e tipo
    const difficultyMap = {
      facil: 'nível básico',
      medio: 'nível intermediário',
      dificil: 'nível avançado'
    };

    const typeMap = {
      'multipla-escolha': 'múltipla escolha com 5 alternativas (A, B, C, D, E)',
      'verdadeiro-falso': 'verdadeiro ou falso com justificativa',
      'dissertativa': 'dissertativa com resposta esperada'
    };

    const systemPrompt = `Você é um especialista em elaboração de questões para concursos públicos brasileiros. 
    Crie questões de ${difficulty === 'facil' ? 'nível básico' : difficulty === 'medio' ? 'nível intermediário' : 'nível avançado'} no estilo da banca ${bank}.
    
    IMPORTANTE:
    - Use linguagem clara e objetiva
    - Para múltipla escolha: sempre 5 alternativas (A, B, C, D, E) e indique a resposta correta
    - Para V/F: apresente a afirmação e forneça justificativa
    - Para dissertativa: inclua a resposta esperada
    - Baseie-se no estilo e formato típico da banca ${bank}
    - Foque no conteúdo de ${subject}, especificamente no tópico ${topic}`;

    const userPrompt = `Gere ${quantity} questão(ões) do tipo ${typeMap[type]} sobre:
    Matéria: ${subject}
    Tópico: ${topic}
    Banca: ${bank}
    Dificuldade: ${difficultyMap[difficulty]}
    
    Formato de resposta:
    ${type === 'multipla-escolha' ? 
      `QUESTÃO X:
      [Enunciado da questão]
      
      A) [alternativa]
      B) [alternativa] 
      C) [alternativa]
      D) [alternativa]
      E) [alternativa]
      
      RESPOSTA: [letra correta] - [justificativa]` :
      type === 'verdadeiro-falso' ?
      `QUESTÃO X:
      [Afirmação]
      
      RESPOSTA: [Verdadeiro/Falso] - [justificativa]` :
      `QUESTÃO X:
      [Enunciado da questão]
      
      RESPOSTA ESPERADA:
      [resposta completa]`
    }`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedQuestions = data.choices[0].message.content;

    console.log('Questions generated successfully');

    return new Response(JSON.stringify({ 
      questions: generatedQuestions,
      metadata: {
        subject,
        topic,
        bank,
        quantity,
        difficulty,
        type,
        generated_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate questions' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
