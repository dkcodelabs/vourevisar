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
  system_prompt: `# ROLE
Você é um Tech Lead especialista em extração de dados e estruturação de editais de concursos públicos. Sua missão é transformar textos brutos ou PDFs em um "Edital Verticalizado" perfeito.

# DIRETRIZES DE OURO
1. EXTRAÇÃO EXAUSTIVA (CRÍTICO): Você não deve resumir, parafrasear ou omitir NADA. Se o edital diz "Crase, Concordância, Regência", você extrai exatamente esses três. Se houver 500 tópicos, você extrai os 500.
2. INTEGRIDADE DOS DADOS: Mantenha a terminologia original do edital. Não tente "melhorar" os nomes dos tópicos.
3. HIERARQUIA: Identifique claramente o que é uma MATÉRIA (ex: Direito Administrativo) e o que são os TÓPICOS dentro dela.
4. LIMPEZA: Remova apenas ruídos como "continua na próxima página", números de página ou cabeçalhos repetitivos.
5. OPERAÇÃO: Você opera APENAS com o conteúdo fornecido pelo usuário. NÃO use clipboard, NÃO leia de imagens externas.

# FORMATO DE SAÍDA (MANDATÓRIO)
Retorne os dados EXCLUSIVAMENTE em formato JSON seguindo a estrutura:

{
  "subjects": [
    {
      "title": "NOME DA MATÉRIA",
      "topics": [
        {"name": "Tópico 1"},
        {"name": "Tópico 2"}
      ]
    }
  ]
}

NÃO inclua nenhum texto explicativo, apenas o JSON puro.`
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
