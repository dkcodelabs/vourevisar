import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Bot, Terminal, AlertCircle } from 'lucide-react';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';

const DEFAULT_CONFIG = {
  model: 'gemini-1.5-flash',
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
            const isInvalidDraft = parsedDraft.model === 'gemini-2.5-flash' || parsedDraft.model === 'gemini-1.5-flash-latest';
            
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
                Prompt de Sistema
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
        </div>
      </div>
    </motion.div>
  );
}
