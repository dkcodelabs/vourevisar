import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, Upload, FileText, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { subjectNameSchema, topicNameSchema } from '@/lib/validation';

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
  const [content, setContent] = useState('');
  const [chatGptResult, setChatGptResult] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Persistir dados no localStorage
  useEffect(() => {
    if (open) {
      const savedContent = localStorage.getItem('contentUpload_content');
      const savedChatGptResult = localStorage.getItem('contentUpload_chatGptResult');

      if (savedContent) setContent(savedContent);
      if (savedChatGptResult) setChatGptResult(savedChatGptResult);
    }
  }, [open]);

  useEffect(() => {
    localStorage.setItem('contentUpload_content', content);
  }, [content]);

  useEffect(() => {
    localStorage.setItem('contentUpload_chatGptResult', chatGptResult);
  }, [chatGptResult]);

  const generatePrompt = () => {
    return `Crie o conteúdo de um arquivo .CSV com as colunas "Matéria" e "Tópico" a partir do conteúdo abaixo. Forneça o resultado como texto para que eu possa copiar e colar, e não envie um arquivo para download.

Formato esperado:

[Matéria1]
Tópico1; tópico2; tópico3

[Matéria2]
Tópico1; tópico2; tópico3

Atenção: mantenha o nome da matéria entre colchetes [], sem dois-pontos, e liste todos os tópicos dela separados apenas por ponto e vírgula ;, tudo em uma linha. Não pule linhas entre tópicos. Não coloque numeração nem subitens. Apenas um bloco por matéria.

Conteúdo para processar:
${content}`;
  };

  const handleCopyPromptAndOpenChatGPT = async () => {
    if (!content.trim()) {
      toast.error('Por favor, cole o conteúdo programático primeiro');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatePrompt());
      setPromptCopied(true);
      toast.success('Prompt copiado! Abrindo ChatGPT...');

      // Open ChatGPT in new tab
      window.open('https://chat.openai.com/', '_blank', 'noopener,noreferrer');

      // Reset the copied state after 3 seconds
      setTimeout(() => setPromptCopied(false), 3000);
    } catch (error) {
      toast.error('Erro ao copiar prompt. Tente novamente.');
    }
  };

  const handleProcessResult = () => {
    if (!chatGptResult.trim()) {
      toast.error('Por favor, cole o resultado do ChatGPT primeiro');
      return;
    }

    console.log('Raw ChatGPT Result:', chatGptResult);

    // Split by lines and clean up
    const lines = chatGptResult
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log('Cleaned lines:', lines);

    if (lines.length === 0) {
      toast.error('Resultado deve ter pelo menos uma linha de dados');
      return;
    }

    const data: ParsedData[] = [];
    let currentMateria = '';
    let materiaCount = 0;
    let topicCount = 0;

    console.log('Starting to process lines:', lines.length);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line contains a subject in brackets [Subject]
      if (line.startsWith('[') && line.endsWith(']')) {
        const materia = line.slice(1, -1).trim();

        if (materia) {
          currentMateria = materia.toUpperCase();
          materiaCount++;
          console.log(`Found subject ${materiaCount}: ${currentMateria}`);

          // Process all following lines until next subject or end
          let j = i + 1;
          let subjectTopicsCount = 0;

          while (j < lines.length && !lines[j].startsWith('[')) {
            const topicLine = lines[j].trim();

            if (topicLine) {
              // If line contains semicolons, split it
              if (topicLine.includes(';')) {
                const topics = topicLine
                  .split(';')
                  .map(topic => topic.trim())
                  .filter(topic => topic.length > 0);

                console.log(`Topics with semicolons for ${currentMateria}:`, topics);

                for (const topic of topics) {
                  data.push({
                    materia: currentMateria,
                    topico: topic
                  });
                  topicCount++;
                  subjectTopicsCount++;
                }
              } else {
                // Single topic line
                console.log(`Single topic for ${currentMateria}:`, topicLine);
                data.push({
                  materia: currentMateria,
                  topico: topicLine
                });
                topicCount++;
                subjectTopicsCount++;
              }
            }
            j++;
          }

          console.log(`Finished ${currentMateria}: ${subjectTopicsCount} topics`);

          // Skip to the last processed line
          i = j - 1;
        }
      }
    }

    console.log(`Final count: ${materiaCount} subjects, ${topicCount} topics`);

    console.log('Final parsed data:', data);

    if (data.length === 0) {
      toast.error('Nenhum dado válido encontrado no resultado. Verifique o formato.');
      return;
    }

    // Remove duplicates
    const uniqueData = data.filter((item, index, self) =>
      index === self.findIndex(t => t.materia === item.materia && t.topico === item.topico)
    );

    setParsedData(uniqueData);

    const uniqueSubjectsCount = [...new Set(uniqueData.map(item => item.materia))].length;
    toast.success(`${uniqueData.length} tópicos de ${uniqueSubjectsCount} matérias processados e prontos para importar!`);

    // Auto scroll to processed data section
    setTimeout(() => {
      const element = document.querySelector('[data-scroll-target="processed-data"]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
        // Validate subject name
        try {
          subjectNameSchema.parse(subjectName);
        } catch (error: any) {
          toast.error(`Matéria "${subjectName}": ${error.errors[0]?.message}`);
          continue;
        }

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
          // Validate topic name
          try {
            topicNameSchema.parse(topicName);
          } catch (error: any) {
            toast.error(`Tópico "${topicName}": ${error.errors[0]?.message}`);
            continue;
          }

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
    setContent('');
    setChatGptResult('');
    setParsedData([]);
    setIsProcessing(false);
    setPromptCopied(false);
    localStorage.removeItem('contentUpload_content');
    localStorage.removeItem('contentUpload_chatGptResult');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetModal();
  };

  const uniqueSubjects = [...new Set(parsedData.map(item => item.materia))];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Carregar Conteúdo Programático
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Como funciona:</p>
                  <p className="mb-3 text-blue-700">
                    Adicione uma matéria e use o botão "Gerar Tópicos" para criar um roteiro de estudos automático com IA. Ou, se preferir importar manualmente:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Cole o conteúdo programático completo</li>
                    <li>Clique em "Copiar Prompt" e cole no ChatGPT</li>
                    <li>Cole o resultado do ChatGPT na segunda caixa</li>
                    <li>Clique em "Importar Dados" para salvar</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                1. Conteúdo Programático:
              </label>
              <Textarea
                placeholder="Cole aqui todo o conteúdo programático que você deseja organizar..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleCopyPromptAndOpenChatGPT}
              disabled={!content.trim()}
              className="w-full"
              variant={promptCopied ? "default" : "default"}
            >
              {promptCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Prompt Copiado! ChatGPT Aberto
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copiar Prompt e Abrir ChatGPT
                </>
              )}
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                2. Resultado do ChatGPT:
              </label>
              <Textarea
                placeholder="Cole aqui o resultado do ChatGPT...
Exemplo:
MATEMÁTICA: Álgebra Linear; Cálculo Diferencial; Geometria
PORTUGUÊS: Gramática; Literatura; Interpretação de Texto"
                value={chatGptResult}
                onChange={(e) => setChatGptResult(e.target.value)}
                rows={6}
                className="resize-none font-mono text-sm"
              />
            </div>

            {chatGptResult.trim() && (
              <Button
                onClick={handleProcessResult}
                disabled={!chatGptResult.trim()}
                className="w-full"
                variant="secondary"
              >
                <FileText className="h-4 w-4 mr-2" />
                Processar Resultado
              </Button>
            )}

            {parsedData.length > 0 && (
              <div className="space-y-4" data-scroll-target="processed-data">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">Dados processados com sucesso!</p>
                        <p>
                          Prontas para importar: <strong>{uniqueSubjects.length} matérias</strong> com <strong>{parsedData.length} tópicos</strong>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="max-h-60 overflow-y-auto border rounded-lg">
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

                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Importando Dados...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Dados
                    </>
                  )}
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={handleClose} className="w-full">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentUploadModal;