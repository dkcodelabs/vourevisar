import { useEffect, useState } from 'react';
import { Save, Terminal } from 'lucide-react';
import { fetchAiSetting, saveAiSetting } from '@/services/adminAiSettingsService';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';

export function TopicGroupingPromptSection() {
  const [topicPrompt, setTopicPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const value = await fetchAiSetting('ai_topic_grouping_prompt');
        setTopicPrompt(String(value || `Você é uma IA especialista em concursos.
Sua tarefa é analisar os tópicos da matéria "$SUBJECT_NAME$" e agrupar aqueles que são idênticos, equivalentes ou muito parecidos.

TÓPICOS:
$TOPICS$

REGRAS:
1. Agrupe tópicos que tratam do mesmo assunto, mesmo que a redação seja diferente.
2. Ignore plurais, acentos e pontuação.
3. Escolha um suggestedName claro e conciso para cada grupo.
4. originalTopicsToMerge deve conter os nomes exatos.

Retorne APENAS um JSON no formato: { "groups": [] }`));
      } catch (error) {
        console.error('Erro ao carregar prompt de agrupamento:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveAiSetting('ai_topic_grouping_prompt', topicPrompt, 'Prompt para agrupamento semântico de tópicos por matéria.');
      toast.success('Prompt de agrupamento salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toastGate.notifyError('Erro ao salvar prompt de agrupamento.', 'TOPIC_PROMPT_ERR', { severity: 'medium' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return null;
  return (
    <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative mt-6">
      <div className="px-6 py-4 border-b border-border dark:border-white/5 flex items-center justify-between bg-muted/50 dark:bg-zinc-800/20">
        <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground/80"><Terminal className="text-purple-500 w-4 h-4" />Gestão de IA: Agrupamento de Tópicos (Por Matéria)</h2>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"><Save className="w-3 h-3" />{isSaving ? 'Salvando...' : 'Salvar'}</button>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-xs text-muted-foreground">Este prompt é usado para limpar a sujeira do edital agrupando tópicos redundantes. Use <code className="bg-muted px-1 rounded">$SUBJECT_NAME$</code> e <code className="bg-muted px-1 rounded">$TOPICS$</code> como placeholders.</p>
        <textarea value={topicPrompt} onChange={event => setTopicPrompt(event.target.value)} className="w-full h-[250px] bg-transparent border border-border dark:border-white/10 rounded-xl px-4 py-3 text-[13px] font-mono leading-relaxed focus:outline-none focus:border-purple-500 transition-all resize-none text-foreground placeholder:text-muted-foreground/20" placeholder="Insira as instruções para agrupamento de tópicos..." spellCheck={false} />
      </div>
      <div className="px-6 py-4 bg-muted/30 dark:bg-zinc-800/40 border-t border-border dark:border-white/5"><p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80"><span className="font-black text-purple-500 uppercase mr-2 tracking-wider">Aviso Técnico:</span>A IA deve retornar um objeto JSON contendo um array de groups.</p></div>
    </div>
  );
}
