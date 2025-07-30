import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, Upload, FileText, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface ContentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedData {
  materia: string;
  topico: string;
}

const ContentUploadModal: React.FC<ContentUploadModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'content' | 'preview'>('content');
  const [content, setContent] = useState('');
  const [chatGptResult, setChatGptResult] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const generatePrompt = () => {
    return `Crie o conteúdo de um arquivo CSV com as colunas 'Matéria' e 'Tópico' a partir do conteúdo abaixo. Por favor, forneça o resultado como texto para que eu possa copiar e colar, e não envie um arquivo para download.

Formato esperado:
Matéria1: Tópico1; topico2; topico3
Matéria2: Tópico1; topico2; topico3

Conteúdo para processar:
${content}`;
  };

  const handleCopyPrompt = async () => {
    if (!content.trim()) {
      toast.error('Por favor, cole o conteúdo programático primeiro');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatePrompt());
      setPromptCopied(true);
      toast.success('Prompt copiado para a área de transferência!');
      
      // Reset the copied state after 3 seconds
      setTimeout(() => setPromptCopied(false), 3000);
    } catch (error) {
      toast.error('Erro ao copiar prompt. Tente novamente.');
    }
  };

  const handleOpenChatGPT = () => {
    window.open('https://chat.openai.com/', '_blank');
  };

  const handleProcessResult = () => {
    if (!chatGptResult.trim()) {
      toast.error('Por favor, cole o resultado do ChatGPT primeiro');
      return;
    }

    const lines = chatGptResult.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      toast.error('Resultado deve ter pelo menos uma linha de dados');
      return;
    }

    const data: ParsedData[] = [];
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [materia, topicsStr] = line.split(':').map(part => part.trim());
        
        if (materia && topicsStr) {
          const topics = topicsStr.split(';').map(topic => topic.trim()).filter(topic => topic);
          
          for (const topic of topics) {
            data.push({ materia: materia.toUpperCase(), topico: topic });
          }
        }
      }
    }

    if (data.length === 0) {
      toast.error('Nenhum dado válido encontrado no resultado');
      return;
    }

    setParsedData(data);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!user || parsedData.length === 0) return;

    setIsProcessing(true);
    try {
      // Agrupar tópicos por matéria
      const subjectGroups = parsedData.reduce((acc, item) => {
        if (!acc[item.materia]) {
          acc[item.materia] = [];
        }
        acc[item.materia].push(item.topico);
        return acc;
      }, {} as Record<string, string[]>);

      let totalSubjects = 0;
      let totalTopics = 0;

      for (const [subjectName, topics] of Object.entries(subjectGroups)) {
        // Verificar se a matéria já existe
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', subjectName)
          .single();

        let subjectId: string;

        if (existingSubject) {
          subjectId = existingSubject.id;
        } else {
          // Criar nova matéria
          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert({
              user_id: user.id,
              name: subjectName,
              status: 'Nova',
              color: '#3B82F6',
              priority: 0
            })
            .select('id')
            .single();

          if (subjectError) throw subjectError;
          subjectId = newSubject.id;
          totalSubjects++;
        }

        // Inserir tópicos (verificar duplicatas)
        const topicsToInsert = [];
        for (const topicName of topics) {
          const { data: existingTopic } = await supabase
            .from('topics')
            .select('id')
            .eq('subject_id', subjectId)
            .eq('name', topicName)
            .single();

          if (!existingTopic) {
            topicsToInsert.push({
              subject_id: subjectId,
              name: topicName,
              completed: false,
              review_count: 0
            });
          }
        }

        if (topicsToInsert.length > 0) {
          const { error: topicsError } = await supabase
            .from('topics')
            .insert(topicsToInsert);

          if (topicsError) throw topicsError;
          totalTopics += topicsToInsert.length;
        }
      }

      toast.success(`Importação concluída! ${totalSubjects} matérias e ${totalTopics} tópicos foram adicionados.`);
      onSuccess();
      onOpenChange(false);
      resetModal();
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      toast.error('Erro ao importar dados. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setStep('content');
    setContent('');
    setChatGptResult('');
    setParsedData([]);
    setIsProcessing(false);
    setPromptCopied(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetModal();
  };

  const uniqueSubjects = [...new Set(parsedData.map(item => item.materia))];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Carregar Conteúdo Programático
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'content' && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Como funciona:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Cole o conteúdo programático completo na caixa abaixo</li>
                        <li>Clique em "Copiar Prompt" e cole no ChatGPT</li>
                        <li>Copie o resultado e cole na caixa que aparecerá</li>
                        <li>Clique em "Importar Dados" para salvar no banco</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Conteúdo Programático:
                </label>
                <Textarea
                  placeholder="Cole aqui todo o conteúdo programático que você deseja organizar..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="resize-none"
                />
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCopyPrompt}
                    disabled={!content.trim()}
                    className="flex-1"
                    variant={promptCopied ? "default" : "default"}
                  >
                    {promptCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Prompt Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Prompt
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleOpenChatGPT}
                    disabled={!content.trim()}
                    variant="outline"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir ChatGPT
                  </Button>
                </div>

                {promptCopied && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Resultado do ChatGPT:
                    </label>
                    <Textarea
                      placeholder="Cole aqui o resultado do ChatGPT...
Exemplo:
MATEMÁTICA: Álgebra Linear; Cálculo Diferencial; Geometria
PORTUGUÊS: Gramática; Literatura; Interpretação de Texto"
                      value={chatGptResult}
                      onChange={(e) => setChatGptResult(e.target.value)}
                      rows={8}
                      className="resize-none font-mono text-sm"
                    />
                    <Button 
                      onClick={handleProcessResult}
                      disabled={!chatGptResult.trim()}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Processar Resultado
                    </Button>
                  </div>
                )}

                <Button variant="outline" onClick={handleClose} className="w-full">
                  Cancelar
                </Button>
              </div>
            </div>
          )}


          {step === 'preview' && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Preview dos dados:</p>
                      <p>
                        Serão importadas <strong>{uniqueSubjects.length} matérias</strong> com <strong>{parsedData.length} tópicos</strong> no total.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 border-b">Matéria</th>
                      <th className="text-left p-3 border-b">Tópico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{item.materia}</td>
                        <td className="p-3">{item.topico}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Dados
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setStep('content')}>
                  Voltar
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentUploadModal;