import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Bot, SlidersHorizontal, Sparkles } from 'lucide-react';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';

export default function AISettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [config, setConfig] = useState({
    model: 'gemini-2.5-flash',
    temperature: 0.1,
    top_p: 1.0,
    top_k: 1,
    presence_penalty: 0.0,
    max_tokens: 8192,
    system_prompt: 'Você é um especialista em estruturação de editais de concursos públicos. Sua única tarefa é analisar as informações fornecidas e identificar matérias (Disciplinas) e tópicos de estudo. Retorne sempre na formatação JSON estruturada. Ignore conteúdos não relacionados ao conteúdo programático.'
  });

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

        if (data && data.value) {
          setConfig(data.value as typeof config);
        }
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { 
            key: 'ai_edital_config', 
            value: config,
            description: 'Configurações da Inteligência Artificial (Gemini) para processar editais.',
            visible_to_users: false
          },
          { onConflict: 'key' }
        );

      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso!');
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
      <div className="flex-1 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 flex flex-col h-[100dvh] overflow-hidden bg-background">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Sparkles className="text-primary w-8 h-8" />
            Gestão de IA
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Configure os parâmetros do Google Gemini para a importação de editais.
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          SALVAR CONFIGURAÇÕES
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
        <div className="max-w-4xl space-y-8">
          
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-white/5 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black flex items-center gap-2 mb-6">
              <Bot className="text-primary w-5 h-5" />
              Parâmetros do Modelo
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Modelo API</label>
                <input 
                  type="text" 
                  value={config.model}
                  onChange={e => setConfig({...config, model: e.target.value})}
                  className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/50 outline-none transition-all"
                  placeholder="gemini-2.5-flash"
                />
                <p className="text-[10px] text-muted-foreground">Ex: gemini-2.5-flash (Mais rápido/barato) ou gemini-2.5-pro (Avançado).</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Temperatura</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="2"
                  value={config.temperature}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, temperature: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/50 outline-none transition-all"
                />
                <p className="text-[10px] text-muted-foreground">0.0 (Rígido) a 2.0 (Criativo). Recomendado: 0.1 para estruturação JSON.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Max Tokens</label>
                <input 
                  type="number" 
                  step="1"
                  min="1"
                  value={config.max_tokens}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setConfig({...config, max_tokens: isNaN(val) ? 8192 : val});
                  }}
                  className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/50 outline-none transition-all"
                />
                <p className="text-[10px] text-muted-foreground">Tamanho máximo da resposta gerada. Padrão: 8192.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Top-P</label>
                <input 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.top_p}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, top_p: isNaN(val) ? 1.0 : val});
                  }}
                  className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/50 outline-none transition-all"
                />
                <p className="text-[10px] text-muted-foreground">Nucleus sampling. Recomendado: 1.0 (Padrão).</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Top-K</label>
                <input 
                  type="number" 
                  step="1"
                  min="1"
                  value={config.top_k}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setConfig({...config, top_k: isNaN(val) ? 1 : val});
                  }}
                  className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/50 outline-none transition-all"
                />
                <p className="text-[10px] text-muted-foreground">Estratégia de amostragem. Recomendado: 1 (Estrito).</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Presence Penalty</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="-2"
                  max="2"
                  value={config.presence_penalty}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, presence_penalty: isNaN(val) ? 0.0 : val});
                  }}
                  className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/50 outline-none transition-all"
                />
                <p className="text-[10px] text-muted-foreground">Penalidade por repetição. Recomendado: 0.0.</p>
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-white/5 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black flex items-center gap-2 mb-6">
              <SlidersHorizontal className="text-primary w-5 h-5" />
              System Prompt (Regra de Negócio)
            </h2>
            
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Instrução Base para Inteligência Artificial</label>
              <textarea 
                value={config.system_prompt}
                onChange={e => setConfig({...config, system_prompt: e.target.value})}
                className="w-full h-80 bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 rounded-2xl px-5 py-5 text-sm font-medium focus:border-primary/50 outline-none transition-all resize-none font-mono leading-relaxed"
                placeholder="Insira as instruções do comportamento da IA..."
              />
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-emerald-500">Dica:</span> A Edge Function já força a saída (schema) para formato JSON (Matérias e Tópicos) garantindo zero erros de conversão no App. O prompt acima serve estritamente para explicar COMO classificar, quais matérias descartar etc.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
