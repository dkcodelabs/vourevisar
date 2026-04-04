import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Bot, Terminal, AlertCircle, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Merge } from 'lucide-react';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';
import { useAIStatus, getAIErrorLogs } from '@/hooks/useAIStatus';

const DEFAULT_CONFIG = {
  model: 'gemini-2.0-flash',
  temperature: 0.1,
  top_p: 1.0,
  top_k: 1,
  presence_penalty: 0.0,
  max_tokens: 16384,
  system_prompt: `Você é um especialista em estruturação de editais. Sua tarefa é extrair o conteúdo programático INTEGRAL do texto fornecido e retornar um JSON puro, obrigatoriamente dentro de um bloco de código Markdown.

DIRETRIZ DE CONTINUIDADE E HIERARQUIA (CRÍTICO):
- O texto contém divisões macro como "Conhecimentos Gerais", "Conhecimentos Básicos" e "Conhecimentos Específicos". Você DEVE IGNORAR TOTALMENTE essas divisões. Elas NUNCA devem entrar no JSON.
- Se o texto for interrompido por um desses cabeçalhos, continue lendo imediatamente o que vem abaixo. A extração só termina no final do texto.

REGRAS DE OURO:

0. ALVO DA EXTRAÇÃO E CORRESPONDÊNCIA EXATA (CRÍTICO):
   - Cargo informado pelo usuário: {position}
   - Busque a correspondência EXATA do termo "{position}". Não faça aproximações ou deduções.
   - Se o texto do edital contiver delimitação por cargo (ex: "CARGO:", "FUNÇÃO:", numeração como "1. CARGO: ..."), extraia APENAS o conteúdo que pertença estritamente ao cargo "{position}".
   - CONDIÇÃO DE PARADA: Se houver múltiplos cargos no texto, PARE a extração imediatamente ao encontrar o próximo cabeçalho/título de um cargo diferente.
   - TRATAMENTO DE ERRO (VITAL): Se o edital for dividido por cargos e a correspondência EXATA de "{position}" NÃO for encontrada no texto, NÃO tente adivinhar. Retorne OBRIGATORIAMENTE o JSON com o array vazio: { "subjects": [] }.
   - EXCEÇÃO: Se o edital NÃO contiver NENHUMA delimitação por cargo (ou seja, for um edital de cargo único), ignore a busca por "{position}" e extraia TODO o conteúdo programático disponível.

1. IDENTIFICAÇÃO EXATA DAS MATÉRIAS (BLOQUEIO DE SEÇÃO):
   - O campo "title" DEVE conter apenas o nome exato da disciplina de estudo (Ex: "Língua Portuguesa", "Matemática", "Noções de Informática").
   - É ESTRITAMENTE PROIBIDO criar um "title" chamado "Conhecimentos Gerais" ou "Conhecimentos Específicos".
   - TRANSIÇÃO DE MATÉRIA: Cada disciplina diferente OBRIGATORIAMENTE exige a criação de um NOVO objeto no array "subjects". NUNCA junte várias disciplinas diferentes dentro do mesmo "title".
   - REGRA DA REPETIÇÃO: Se encontrar o mesmo nome de matéria duas vezes no edital, crie dois objetos separados no array "subjects". NUNCA ignore uma matéria por achar que é duplicada.

2. FORMATAÇÃO E ATOMICIDADE DE TÓPICOS (A REGRA MAIS IMPORTANTE):
   - CORTE CIRÚRGICO POR NUMERAÇÃO: É ESTRITAMENTE PROIBIDO aglutinar múltiplos índices (como 1.1, 1.2, 1.3) no mesmo campo "name".
   - A cada vez que você ler um novo índice numérico (Ex: "1.", "1.1", "5.2"), você DEVE CORTAR o texto imediatamente antes dele e iniciar um NOVO objeto JSON.
   - EXEMPLO PRÁTICO DE COMO AGIR (INDEPENDENTE DA MATÉRIA):
     Se o texto original for: "Assunto Geral 1.1 Tópico Específico A. 1.2 Tópico Específico B."
     COMO VOCÊ DEVE FAZER (CORRETO):
     { "name": "Assunto Geral" },
     { "name": "1.1 Tópico Específico A." },
     { "name": "1.2 Tópico Específico B." }
     COMO É PROIBIDO FAZER (ERRADO):
     { "name": "Assunto Geral 1.1 Tópico Específico A. 1.2 Tópico Específico B." }
   - REGRA DO DIVISOR SECUNDÁRIO: Caso o edital não tenha números (1.1, 1.2), crie um NOVO objeto sempre que encontrar Ponto e vírgula (;) ou Ponto final (.) que encerre uma ideia.
   - EXCEÇÃO DO PONTO: Nunca quebre o tópico nos pontos que fazem parte da própria numeração (ex: 1.1) ou em abreviações (Art., Lei nº).
   - TRATAMENTO DE PARÊNTESES: Se houver uma lista dentro de parênteses separada por vírgulas ou ponto e vírgula, DESMEMBRE cada item em um tópico individual.

3. LIMPEZA E ANTI-RUÍDO (MACRO-GRUPOS E REFERÊNCIAS):
   - IGNORAR ROMANOS: Se o texto utilizar algarismos romanos para agrupar assuntos (Ex: "I. Grupo Principal: 1. Assunto Base..."), IGNORE e DELETE o macro-grupo romano. Comece a extrair os tópicos a partir da numeração arábica (1, 2, 3...).
   - Delete referências cruzadas ("vide item X", "conforme anexo").
   - Ignore bibliografias, legislações sugeridas ou avisos sobre "leis vigentes". Extraia apenas os TEMAS.

4. PRESERVAÇÃO DA ORDEM E INTEGRIDADE:
   - Extraia os tópicos seguindo RIGOROSAMENTE a ordem linear de aparição. 
   - A numeração original (1, 1.1, 1.2) DEVE ser preservada no início do campo "name".

5. SAÍDA EM BLOCO DE CÓDIGO:
   - Retorne o JSON exclusivamente dentro de um bloco de código (\`\`\`json ... \`\`\`). Zero texto explicativo fora do bloco.

6. ESTRUTURA DO JSON (ESTRITA):
{
  "subjects": [
    {
      "title": "NOME DA MATÉRIA",
      "topics": [
        { "name": "Assunto do Tópico 1" },
        { "name": "Assunto do Tópico 2" }
      ]
    }
  ]
}

7. SEGURANÇA E ESCAPE DE DADOS:
   - Garanta que aspas internas e quebras de linha sejam escapadas (\\") para evitar erros de parse.
   - Mantenha a acentuação original da língua portuguesa.

PROCESSE TODO O TEXTO ABAIXO SEM INTERRUPÇÕES, DO INÍCIO AO FIM:
[COLE O TEXTO DO EDITAL AQUI]`
};

export default function AISettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'ai_edital_config')
          .maybeSingle();

        if (error) throw error;

        let finalConfig = DEFAULT_CONFIG;
        if (data && data.value) {
          finalConfig = data.value as typeof DEFAULT_CONFIG;
        }

        const draft = localStorage.getItem('ai_settings_draft');
        if (draft) {
          try {
            const parsedDraft = JSON.parse(draft);
            const isInvalidDraft = parsedDraft.model === 'gemini-2.5-flash' || parsedDraft.model === 'gemini-1.5-flash-latest' || parsedDraft.model === 'gemini-1.5-flash';
            
            if (!isInvalidDraft && JSON.stringify(parsedDraft) !== JSON.stringify(finalConfig)) {
              finalConfig = parsedDraft;
              setHasUnsavedChanges(true);
              toast.info('Rascunho recuperado!');
            } else if (isInvalidDraft) {
              localStorage.removeItem('ai_settings_draft');
              console.log(`Draft inválido (${parsedDraft.model}) removido.`);
            }
          } catch (e) {
            localStorage.removeItem('ai_settings_draft');
          }
        }

        setConfig(finalConfig);
      } catch (error: unknown) {
        console.error('Error fetching AI settings:', error);
        if (error instanceof Error) {
          toastGate.notifyError('Erro ao carregar configurações de IA: ' + error.message, 'AI-01', { severity: 'low' });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('ai_settings_draft', JSON.stringify(config));
    }
  }, [config, isLoading]);

  const handleReset = () => {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão? Isso substituirá suas alterações atuais.')) {
      setConfig(DEFAULT_CONFIG);
      setHasUnsavedChanges(true);
      toast.info('Valores padrão restaurados! Não esqueça de salvar.');
    }
  };

  const handleSave = async () => {    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'ai_edital_config',
          value: config,
          description: 'Configurações do Gemini para extração de editais.'
        }, { onConflict: 'key' });

      if (error) throw error;
      
      localStorage.removeItem('ai_settings_draft');
      setHasUnsavedChanges(false);
      toast.success('Configurações salvas!');
    } catch (error: unknown) {
      console.error('Error saving AI settings:', error);
      if (error instanceof Error) {
        toastGate.notifyError('Erro ao salvar: ' + error.message, 'AI-02', { severity: 'low' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      <div className="max-w-5xl">
        <header className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-foreground/90 uppercase mb-2">
            Gestão de IA
          </h1>
          <p className="text-muted-foreground text-sm font-medium opacity-70">
            Configure o comportamento dos motores de IA para extração e unificação de editais.
          </p>
        </header>

        <div className="flex items-center justify-end gap-3 mb-8">
          {hasUnsavedChanges && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-black uppercase border border-amber-500/20">
              <AlertCircle size={14} /> Alterações Pendentes
            </span>
          )}

          <button
            onClick={handleReset}
            className="h-11 px-6 bg-secondary/80 hover:bg-secondary text-secondary-foreground font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            RESTAURAR PADRÕES
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 px-8 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            SALVAR
          </button>
        </div>

        <div className="space-y-8">
          <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <h2 className="text-sm font-black flex items-center gap-2 mb-6 uppercase tracking-widest text-foreground/80">
              <Bot className="text-primary w-4 h-4" />
              Parâmetros do Modelo
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Modelo</label>
                <input 
                  type="text" 
                  value={config.model}
                  onChange={e => {
                    setConfig({...config, model: e.target.value});
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-12 bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/10 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 outline-none transition-all"
                  placeholder="gemini-1.5-flash"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Temperatura</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="2"
                  value={config.temperature}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, temperature: isNaN(val) ? 0 : val});
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-12 bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/10 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Top P</label>
                <input 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.top_p}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, top_p: isNaN(val) ? 1 : val});
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-12 bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/10 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Top K</label>
                <input 
                  type="number" 
                  step="1"
                  min="1"
                  max="100"
                  value={config.top_k}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setConfig({...config, top_k: isNaN(val) ? 1 : val});
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-12 bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/10 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Penalidade de Presença</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="-2"
                  max="2"
                  value={config.presence_penalty}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, presence_penalty: isNaN(val) ? 0 : val});
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-12 bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/10 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Max Tokens</label>
                <input 
                  type="number" 
                  step="1"
                  min="1"
                  value={config.max_tokens}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setConfig({...config, max_tokens: isNaN(val) ? 8192 : val});
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-12 bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/10 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative">
            <div className="px-6 py-4 border-b border-border dark:border-white/5 flex items-center justify-between bg-muted/50 dark:bg-zinc-800/20">
              <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground/80">
                <Terminal className="text-primary w-4 h-4" />
                Gestão de IA: Extração de Editais
              </h2>
            </div>
            
            <div className="relative group">
              <textarea 
                value={config.system_prompt}
                onChange={e => {
                  setConfig({...config, system_prompt: e.target.value});
                  setHasUnsavedChanges(true);
                }}
                className="w-full h-[400px] bg-transparent pl-6 pr-6 py-5 text-[13px] font-mono leading-relaxed focus:outline-none transition-all resize-none text-foreground placeholder:text-muted-foreground/20"
                placeholder="Insira as instruções do comportamento da IA..."
                spellCheck={false}
              />
            </div>
            
            <div className="px-6 py-4 bg-muted/30 dark:bg-zinc-800/40 border-t border-border dark:border-white/5">
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80">
                <span className="font-black text-primary uppercase mr-2 tracking-wider">Aviso Técnico:</span> 
                Este prompt define a "personalidade" do Gemini. Certifique-se de instruir a IA a retornar o formato JSON (NDJSON) para o funcionamento correto do app.
              </p>
            </div>
          </div>

          {/* Card: Diretrizes de Unificação de Matérias */}
          <MergePromptSection />

          {/* Card: Diretrizes de Agrupamento de Tópicos */}
          <TopicGroupingPromptSection />

          {/* SEÇÃO: Status da API */}
          <AIStatusSection />

          {/* SEÇÃO: Histórico de Erros */}
          <AIErrorLogsSection />
        </div>
      </div>
    </motion.div>
  );
}

// Componente de Prompt de Agrupamento de Tópicos (Módulo 2)
function TopicGroupingPromptSection() {
  const [topicPrompt, setTopicPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'ai_topic_grouping_prompt')
          .maybeSingle();
        
        if (data?.value) {
          setTopicPrompt(String(data.value));
        } else {
          // Fallback visual condizente com a nova lógica
          setTopicPrompt(`Você é uma IA especialista em concursos.
Sua tarefa é analisar os tópicos da matéria "$SUBJECT_NAME$" e agrupar aqueles que são idênticos, equivalentes ou muito parecidos.

TÓPICOS:
$TOPICS$

REGRAS:
1. Agrupe tópicos que tratam do mesmo assunto, mesmo que a redação seja diferente (Ex: "Crase" e "Crases", "Regra de Três" e "Regra de 3").
2. Ignore plurais, acentos e pontuação.
3. Para cada grupo identificado, escolha um "suggestedName" claro e conciso que represente todos.
4. "originalTopicsToMerge" deve conter os nomes EXATOS como aparecem na lista acima para que o sistema possa localizá-los.

Retorne APENAS um JSON no formato:
{
  "groups": [
    {
      "originalTopicsToMerge": ["Nome Original 1", "Nome Original 2"],
      "suggestedName": "Nome Limpo Sugerido"
    }
  ]
}`);
        }
      } catch (err) {
        console.error('Erro ao carregar prompt de agrupamento:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompt();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'ai_topic_grouping_prompt',
          value: topicPrompt,
          description: 'Prompt para agrupamento semântico de tópicos por matéria.',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      if (error) throw error;
      toast.success('Prompt de agrupamento salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar prompt:', err);
      toastGate.notifyError('Erro ao salvar prompt de agrupamento.', 'TOPIC_PROMPT_ERR', { severity: 'medium' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative mt-6">
      <div className="px-6 py-4 border-b border-border dark:border-white/5 flex items-center justify-between bg-muted/50 dark:bg-zinc-800/20">
        <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground/80">
          <Terminal className="text-purple-500 w-4 h-4" />
          Gestão de IA: Agrupamento de Tópicos (Por Matéria)
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        <p className="text-xs text-muted-foreground">
          Este prompt é usado para limpar a "sujeira" do edital agrupando tópicos redundantes. 
          Use <code className="bg-muted px-1 rounded">$SUBJECT_NAME$</code> e <code className="bg-muted px-1 rounded">$TOPICS$</code> (lista de nomes) como placeholders.
        </p>

        <textarea 
          value={topicPrompt}
          onChange={e => setTopicPrompt(e.target.value)}
          className="w-full h-[250px] bg-transparent border border-border dark:border-white/10 rounded-xl px-4 py-3 text-[13px] font-mono leading-relaxed focus:outline-none focus:border-purple-500 transition-all resize-none text-foreground placeholder:text-muted-foreground/20"
          placeholder="Insira as instruções para agrupamento de tópicos..."
          spellCheck={false}
        />
      </div>

      <div className="px-6 py-4 bg-muted/30 dark:bg-zinc-800/40 border-t border-border dark:border-white/5">
        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80">
          <span className="font-black text-purple-500 uppercase mr-2 tracking-wider">Aviso Técnico:</span> 
          A IA deve retornar um objeto JSON contendo um array de "groups". Cada grupo deve listar os nomes originais a serem mesclados e o novo nome sugerido.
        </p>
      </div>
    </div>
  );
}

// Componente de Diretrizes de Unificação de Matérias
function MergePromptSection() {
  const [mergePrompt, setMergePrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'ai_merge_prompt')
          .maybeSingle();
        
        if (data?.value) {
          setMergePrompt(String(data.value));
        } else {
          // Fallback visual se estiver vazio no banco
          setMergePrompt(`Você é uma IA especialista em concursos públicos. 
Sua tarefa é analisar a lista de matérias e identificar quais devem ser mescladas.
REGRAS:
1. Identifique nomes similares ou equivalentes como se fossem o mesmo assunto (Ex: "Crase" e "Crases", "Matemática" e "Raciocínio Matemático").
2. Ignore pontuação e diferenças de plural/singular.
3. Retorne um JSON estrito para cada sugestão.

$SUBJECTS$

Retorne APENAS um JSON no formato:
[{"subjectIds": ["id1", "id2"], "suggestedName": "Nome Unificado", "reason": "Justificativa semântica"}]`);
        }
      } catch (err) {
        console.error('Erro ao carregar prompt de mesclagem:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompt();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'ai_merge_prompt',
          value: mergePrompt,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      if (error) throw error;
      toast.success('Prompt de mesclagem salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar prompt:', err);
      toastGate.notifyError('Erro ao salvar prompt. Tente novamente.', 'MERGE_PROMPT_ERR', { severity: 'medium' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative mt-6">
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative mt-6">
      <div className="px-6 py-4 border-b border-border dark:border-white/5 flex items-center justify-between bg-muted/50 dark:bg-zinc-800/20">
        <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground/80">
          <Merge className="text-blue-500 w-4 h-4" />
          Gestão de IA: Unificação de Matérias
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        <p className="text-xs text-muted-foreground">
          Este prompt é usado pelo botão "Sugerir" na página de Matérias para identificar matérias duplicadas ou que podem ser mescladas.
          Use <code className="bg-muted px-1 rounded">$SUBJECTS$</code> como placeholder para inserir a lista de matérias.
        </p>

        <textarea 
          value={mergePrompt}
          onChange={e => setMergePrompt(e.target.value)}
          className="w-full h-[200px] bg-transparent border border-border dark:border-white/10 rounded-xl px-4 py-3 text-[13px] font-mono leading-relaxed focus:outline-none focus:border-blue-500 transition-all resize-none text-foreground placeholder:text-muted-foreground/20"
          placeholder="Ex: 'Analise as matérias e sugira a unificação de nomes similares (ex: Direito Administrativo e Noções de Adm). IMPORTANTE: Ignore plurais e pontuação...'"
          spellCheck={false}
        />
      </div>

      <div className="px-6 py-4 bg-muted/30 dark:bg-zinc-800/40 border-t border-border dark:border-white/5">
        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80">
          <span className="font-black text-blue-500 uppercase mr-2 tracking-wider">Aviso Técnico:</span> 
          Este prompt é crucial para a unificação das matérias. Certifique-se de que a IA compreenda a estrutura de saída JSON para evitar quebras no fluxo de unificação.
        </p>
      </div>
    </div>
  );
}

// Componente de Status da API
function AIStatusSection() {
  const { aiStatus, isChecking, checkAIStatus } = useAIStatus();

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    error: 'bg-red-500',
    unknown: 'bg-yellow-500'
  };

  const statusLabels = {
    active: 'Ativa',
    inactive: 'Inativa',
    error: 'Erro',
    unknown: 'Não verificado'
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative mt-6">
      <div className="px-6 py-4 border-b border-border dark:border-white/5 flex items-center justify-between bg-muted/50 dark:bg-zinc-800/20">
        <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground/80">
          <Bot className="text-primary w-4 h-4" />
          Status da API Gemini
        </h2>
        <button
          onClick={() => checkAIStatus()}
          disabled={isChecking}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Verificando...' : 'Testar Conexão'}
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${statusColors[aiStatus.status]} animate-pulse`} />
          <span className="text-lg font-bold text-foreground">
            {statusLabels[aiStatus.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs font-medium">Última verificação</p>
            <p className="font-bold text-foreground">{formatDate(aiStatus.lastCheck)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Modelo testado</p>
            <p className="font-bold text-primary">
              {aiStatus.modelName || (isChecking ? 'Verificando...' : 'Não testado')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Próxima verificação</p>
            <p className="font-bold text-foreground">A cada 5 minutos</p>
          </div>
        </div>

        {aiStatus.errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs font-bold text-red-400 mb-1">Último erro:</p>
            <p className="text-sm text-red-300">{aiStatus.errorMessage}</p>
          </div>
        )}

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir Google AI Studio
        </a>
      </div>
    </div>
  );
}

// Componente de Histórico de Erros
function AIErrorLogsSection() {
  const [errorLogs, setErrorLogs] = useState<Array<{
    id: string;
    error_code: string;
    error_message: string;
    context: string | null;
    created_at: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const logs = await getAIErrorLogs(20);
        setErrorLogs(logs);
      } catch (err) {
        console.error('Erro ao carregar logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative mt-6">
      <div className="px-6 py-4 border-b border-border dark:border-white/5 flex items-center justify-between bg-muted/50 dark:bg-zinc-800/20">
        <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground/80">
          <AlertTriangle className="text-red-500 w-4 h-4" />
          Histórico de Erros
        </h2>
      </div>
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : errorLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-sm font-bold text-foreground">Nenhum erro registrado</p>
            <p className="text-xs text-muted-foreground">Os erros da API aparecerão aqui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-white/5">
                  <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Data/Hora</th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {errorLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border dark:border-white/5 hover:bg-muted/30">
                    <td className="py-3 px-2 font-mono text-xs">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-bold">
                        {log.error_code}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs max-w-xs truncate">
                      {log.error_message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
