
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 20 requests per hour per user
const RATE_LIMIT_PER_HOUR = 20;

interface QuestionRequest {
  subject: string;
  topic: string;
  bank: string;
  quantity: number;
  difficulty: 'facil' | 'medio' | 'dificil';
  type: 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa';
}

interface ParsedQuestion {
  id: string;
  statement: string;
  type: 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

function parseQuestions(rawText: string, type: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const questionBlocks = rawText.split(/QUESTÃO \d+:/i).filter(block => block.trim());

  questionBlocks.forEach((block, index) => {
    const lines = block.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return;
    
    let statement = '';
    let options: string[] = [];
    let correctAnswer = '';
    let explanation = '';
    let isReadingStatement = true;
    let isReadingAnswer = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('RESPOSTA:')) {
        isReadingStatement = false;
        isReadingAnswer = true;
        const answerPart = trimmedLine.replace('RESPOSTA:', '').trim();
        if (answerPart) {
          if (type === 'multipla-escolha') {
            const match = answerPart.match(/^([A-E])\s*[-–]\s*(.+)$/);
            if (match) {
              correctAnswer = match[1];
              explanation = match[2];
            } else {
              correctAnswer = answerPart.charAt(0);
              explanation = answerPart;
            }
          } else {
            correctAnswer = answerPart;
          }
        }
      } else if (trimmedLine.startsWith('RESPOSTA ESPERADA:')) {
        isReadingStatement = false;
        isReadingAnswer = true;
        explanation = trimmedLine.replace('RESPOSTA ESPERADA:', '').trim();
        correctAnswer = explanation;
      } else if (isReadingAnswer) {
        if (type === 'multipla-escolha' && !explanation) {
          explanation = trimmedLine;
        } else if (type !== 'multipla-escolha') {
          if (correctAnswer && trimmedLine) {
            explanation += ' ' + trimmedLine;
          } else if (!correctAnswer) {
            correctAnswer = trimmedLine;
          }
        }
      } else if (isReadingStatement) {
        const optionMatch = trimmedLine.match(/^([A-E])\)\s*(.+)$/);
        if (optionMatch && type === 'multipla-escolha') {
          options.push(optionMatch[2]);
          isReadingStatement = false;
        } else if (trimmedLine && !trimmedLine.match(/^[A-E]\)/)) {
          statement += (statement ? ' ' : '') + trimmedLine;
        }
      } else {
        const optionMatch = trimmedLine.match(/^([A-E])\)\s*(.+)$/);
        if (optionMatch && type === 'multipla-escolha') {
          options.push(optionMatch[2]);
        }
      }
    }
    
    if (statement) {
      questions.push({
        id: `q_${index + 1}_${Date.now()}`,
        statement: statement.trim(),
        type: type as any,
        options: type === 'multipla-escolha' ? options : undefined,
        correctAnswer: correctAnswer.trim(),
        explanation: explanation.trim()
      });
    }
  });
  
  return questions;
}

// Request validation schema
const requestSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  topic: z.string().trim().min(1).max(500),
  bank: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(20),
  difficulty: z.enum(['facil', 'medio', 'dificil']),
  type: z.enum(['multipla-escolha', 'verdadeiro-falso', 'dissertativa'])
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const { data: rateLimitOk, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: user.id,
        p_endpoint: 'generate-questions',
        p_max_per_hour: RATE_LIMIT_PER_HOUR
      });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (rateLimitOk === false) {
      return new Response(JSON.stringify({ 
        error: `Limite de requisições excedido. Você pode fazer até ${RATE_LIMIT_PER_HOUR} requisições por hora. Tente novamente mais tarde.` 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Dados de requisição inválidos',
        details: validationResult.error.errors.map(e => e.message)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subject, topic, bank, quantity, difficulty, type } = validationResult.data;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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
    Crie questões de ${difficultyMap[difficulty]} no estilo da banca ${bank}.
    
    IMPORTANTE - SIGA EXATAMENTE ESTE FORMATO:
    - Use linguagem clara e objetiva
    - Para múltipla escolha: sempre 5 alternativas (A, B, C, D, E) e indique APENAS a letra correta
    - Para V/F: apresente a afirmação e forneça justificativa
    - Para dissertativa: inclua a resposta esperada
    - Baseie-se no estilo e formato típico da banca ${bank}
    - Foque no conteúdo de ${subject}, especificamente no tópico ${topic}
    - NUNCA use "alternativa" ou outros termos, use apenas as letras A) B) C) D) E)`;

    const userPrompt = `Gere ${quantity} questão(ões) do tipo ${typeMap[type]} sobre:
    Matéria: ${subject}
    Tópico: ${topic}
    Banca: ${bank}
    Dificuldade: ${difficultyMap[difficulty]}
    
    Formato OBRIGATÓRIO:
    ${type === 'multipla-escolha' ? 
      `QUESTÃO 1:
      [Enunciado da questão]
      
      A) [opção A]
      B) [opção B] 
      C) [opção C]
      D) [opção D]
      E) [opção E]
      
      RESPOSTA: [apenas a letra] - [justificativa curta]` :
      type === 'verdadeiro-falso' ?
      `QUESTÃO 1:
      [Afirmação]
      
      RESPOSTA: [Verdadeiro/Falso] - [justificativa]` :
      `QUESTÃO 1:
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
    
    // Parse the questions into structured format
    const parsedQuestions = parseQuestions(generatedQuestions, type);

    console.log('Questions generated and parsed successfully');

    // Log successful API usage
    const { error: logError } = await supabase.rpc('log_api_usage', {
      p_user_id: user.id,
      p_endpoint: 'generate-questions'
    });

    if (logError) {
      console.error('Error logging API usage:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ 
      questions: parsedQuestions,
      rawText: generatedQuestions,
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
    // Log error without exposing sensitive details
    console.error('Error generating questions:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ 
      error: 'Falha ao gerar questões. Por favor, tente novamente.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
