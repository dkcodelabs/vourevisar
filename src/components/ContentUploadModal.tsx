import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from '@/lib/toast';
import { persistParsedContent } from '@/services/contentUploadService';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, Upload, FileText, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { subjectNameSchema, topicNameSchema } from '@/lib/validation';
import { toastGate } from '@/lib/errors/toastGate';

interface ContentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedData {
  materia: string;
  topico: string;
}

const getValidationMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return 'valor inválido';
  const issues = (error as { issues?: Array<{ message?: string }> }).issues;
  return issues?.[0]?.message || 'valor inválido';
};

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
    return `Aja como um extrator de dados. Converta o conteúdo programático abaixo no formato CSV específico detalhado abaixo.
REGRAS CRÍTICAS:
1. NÃO escreva nenhuma saudação, introdução ou explicação (ex: "Aqui está seu conteúdo").
2. Retorne APENAS os dados no formato solicitado.
3. Não use blocos de código (markdown \`\`\`).
4. Se o conteúdo for inválido, não responda nada.

FORMATO ESPERADO:
[Matéria1]
Tópico1; tópico2; tópico3

[Matéria2]
Tópico1; tópico2; tópico3

ATENÇÃO:
- O texto de entrada geralmente separa os tópicos principais por PONTO E VÍRGULA (;). Respeite essa separação original.
- NÃO QUEBRE itens separados apenas por vírgula em linhas novas, a menos que sejam claramente tópicos distintos. Mantenha "item A, item B e item C" como um único tópico se fizerem sentido juntos.
- O formato de saída DEVE SER: [Nome da Matéria] seguido dos tópicos separados por ponto e vírgula (;).

CONTEÚDO PARA PROCESSAR:
${content}`;
  };

  const handleCopyPromptAndOpenChatGPT = async () => {
    if (!content.trim()) {
      toastGate.notifyError('Por favor, cole o conteúdo programático primeiro', 'COMPONENTS-CONTENTUPLOADMODAL-01', { severity: 'medium' });
      return;
    }

    try {
      const prompt = generatePrompt();
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      toast.success('Prompt copiado! Cole no ChatGPT');

      // Encoding prompt for URL
      const encodedPrompt = encodeURIComponent(prompt);
      const chatGPTUrl = `https://chatgpt.com/?q=${encodedPrompt}`;

      // Open ChatGPT in new tab
      window.open(chatGPTUrl, '_blank', 'noopener,noreferrer');

      // Reset the copied state after 5 seconds
      setTimeout(() => setPromptCopied(false), 5000);
    } catch (error) {
      toastGate.notifyError('Erro ao copiar prompt. Tente novamente.', 'COMPONENTS-CONTENTUPLOADMODAL-02', { severity: 'medium' });
    }
  };

  const handleProcessResult = () => {
    if (!chatGptResult.trim()) {
      toastGate.notifyError('Por favor, cole o resultado do ChatGPT primeiro', 'COMPONENTS-CONTENTUPLOADMODAL-03', { severity: 'medium' });
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
      toastGate.notifyError('Resultado deve ter pelo menos uma linha de dados', 'COMPONENTS-CONTENTUPLOADMODAL-04', { severity: 'medium' });
      return;
    }

    const data: ParsedData[] = [];
    let currentMateria = '';
    let materiaCount = 0;
    let topicCount = 0;

    console.log('Starting to process lines:', lines.length);

    // Regex para identificar matérias: procura por texto entre colchetes, ignorando o que vem depois (como dois-pontos)
    const subjectRegex = /^\[(.*?)\]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(subjectRegex);

      if (match) {
        const materia = match[1].trim();

        if (materia) {
          currentMateria = materia.toUpperCase();
          materiaCount++;
          console.log(`Encontrada matéria ${materiaCount}: ${currentMateria}`);

          // Se houver texto após o colchete na mesma linha, tratá-lo como tópicos
          const restOfLine = line.replace(subjectRegex, '').trim();
          let initialTopics: string[] = [];

          if (restOfLine) {
            // Remover dois-pontos inicial se existir
            const cleanRest = restOfLine.startsWith(':') ? restOfLine.substring(1).trim() : restOfLine;
            if (cleanRest) {
              initialTopics = cleanRest.split(';').map(t => t.trim()).filter(Boolean);
            }
          }

          for (const topic of initialTopics) {
            data.push({ materia: currentMateria, topico: topic });
            topicCount++;
          }

          // Processar todas as linhas seguintes até a próxima matéria ou fim
          let j = i + 1;
          while (j < lines.length && !lines[j].match(subjectRegex)) {
            const topicLine = lines[j].trim();

            if (topicLine) {
              const topics = topicLine
                .split(';')
                .map(topic => topic.trim())
                .filter(Boolean);

              for (const topic of topics) {
                data.push({ materia: currentMateria, topico: topic });
                topicCount++;
              }
            }
            j++;
          }

          // Pular para a última linha processada
          i = j - 1;
        }
      }
    }

    console.log(`Final count: ${materiaCount} subjects, ${topicCount} topics`);

    console.log('Final parsed data:', data);

    if (data.length === 0) {
      toastGate.notifyError('Nenhum dado válido encontrado no resultado. Verifique o formato.', 'COMPONENTS-CONTENTUPLOADMODAL-05', { severity: 'medium' });
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

      // Usar a lista de matérias únicas mantendo a ordem original do texto
      const uniqueSubjectsList = [...new Set(parsedData.map(item => item.materia))];

      for (const subjectName of uniqueSubjectsList) {
        try {
          subjectNameSchema.parse(subjectName);
          subjectGroups[subjectName].forEach((topicName) => topicNameSchema.parse(topicName));
        } catch (error: unknown) {
          toastGate.notifyError(`Conteúdo inválido em "${subjectName}": ${getValidationMessage(error)}`, "COMPONENTS-CONTENTUPLOADMODAL-06", { severity: "medium" });
          delete subjectGroups[subjectName];
        }
      }

      const result = await persistParsedContent(user.id, subjectGroups);
      totalSubjects = result.totalSubjects;
      totalTopics = result.totalTopics;
      toast.success(`Importação concluída! ${totalSubjects} matérias e ${totalTopics} tópicos foram adicionados.`);
      onSuccess();
      onOpenChange(false);
      resetModal();
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      toastGate.notifyError('Erro ao importar dados. Tente novamente.', 'COMPONENTS-CONTENTUPLOADMODAL-08', { severity: 'medium' });
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
            {/* Passo 1 */}
            <div className="space-y-4 p-4 border rounded-xl bg-white shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">1</div>
                <label className="text-sm font-semibold text-slate-700">
                  Conteúdo do Edital:
                </label>
              </div>
              <Textarea
                placeholder="Cole aqui todo o conteúdo programático que você deseja organizar..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="resize-none focus:ring-indigo-500 border-slate-200"
              />
              <Button
                onClick={handleCopyPromptAndOpenChatGPT}
                disabled={!content.trim()}
                className={`w-full h-11 transition-all duration-300 ${promptCopied ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {promptCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Prompt Copiado! Agora cole (Ctrl+V) no ChatGPT
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Gerar e Copiar Prompt p/ ChatGPT
                  </>
                )}
              </Button>
            </div>

            {/* Passo 2 */}
            <div className="space-y-4 p-4 border rounded-xl bg-slate-50 shadow-sm border-dashed">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">2</div>
                <label className="text-sm font-semibold text-slate-700">
                  Resultado do ChatGPT:
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2 mb-4">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p>
                  No ChatGPT aberto, pressione <strong>Ctrl+V</strong> para colar o comando e gerar o conteúdo. Depois, <strong>copie a resposta dele</strong> e cole abaixo.
                </p>
              </div>

              <Textarea
                placeholder="Cole aqui o resultado do ChatGPT que ele gerou..."
                value={chatGptResult}
                onChange={(e) => setChatGptResult(e.target.value)}
                rows={6}
                className="resize-none font-mono text-sm border-slate-200 bg-white"
              />

              {chatGptResult.trim() && (
                <Button
                  onClick={handleProcessResult}
                  disabled={!chatGptResult.trim()}
                  className="w-full h-11 bg-slate-800 hover:bg-slate-900"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Processar Resultado
                </Button>
              )}
            </div>

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
