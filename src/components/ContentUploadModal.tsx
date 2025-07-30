import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [step, setStep] = useState<'content' | 'upload' | 'preview'>('content');
  const [content, setContent] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenChatGPT = () => {
    if (!content.trim()) {
      toast.error('Por favor, cole o conteúdo programático primeiro');
      return;
    }

    const prompt = `Crie um arquivo CSV com as colunas "Matéria" e "Tópico" a partir do conteúdo abaixo.

Formato esperado:
Matéria,Tópico
MATEMÁTICA,Álgebra Linear
MATEMÁTICA,Cálculo Diferencial
PORTUGUÊS,Gramática
PORTUGUÊS,Literatura

Conteúdo para processar:
${content}

Gere apenas o CSV, sem explicações adicionais.`;

    const encodedPrompt = encodeURIComponent(prompt);
    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
    
    window.open(chatGPTUrl, '_blank');
    setStep('upload');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    setCsvFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo CSV deve ter pelo menos uma linha de dados');
        return;
      }

      const header = lines[0].toLowerCase();
      if (!header.includes('matéria') || !header.includes('tópico')) {
        toast.error('Arquivo CSV deve ter as colunas "Matéria" e "Tópico"');
        return;
      }

      const data: ParsedData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const [materia, topico] = lines[i].split(',').map(item => item.trim().replace(/"/g, ''));
        if (materia && topico) {
          data.push({ materia: materia.toUpperCase(), topico });
        }
      }

      if (data.length === 0) {
        toast.error('Nenhum dado válido encontrado no arquivo CSV');
        return;
      }

      setParsedData(data);
      setStep('preview');
    };

    reader.readAsText(file);
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
    setCsvFile(null);
    setParsedData([]);
    setIsProcessing(false);
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
                        <li>Clique em "Processar no ChatGPT" para gerar o arquivo CSV</li>
                        <li>Faça o download do arquivo CSV gerado pelo ChatGPT</li>
                        <li>Faça o upload do arquivo para importar as matérias e tópicos</li>
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

              <div className="flex gap-2">
                <Button 
                  onClick={handleOpenChatGPT}
                  disabled={!content.trim()}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Processar no ChatGPT
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-2">Próximo passo:</p>
                      <p>Agora faça o download do arquivo CSV gerado pelo ChatGPT e faça o upload abaixo.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Arquivo CSV gerado pelo ChatGPT:
                </label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('content')}>
                  Voltar
                </Button>
                <Button variant="outline" onClick={handleClose}>
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
                <Button variant="outline" onClick={() => setStep('upload')}>
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