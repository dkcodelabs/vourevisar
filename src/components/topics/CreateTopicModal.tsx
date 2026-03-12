import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Book, Bookmark } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

interface CreateTopicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTopicCreated: () => void;
}

export const CreateTopicModal: React.FC<CreateTopicModalProps> = ({ isOpen, onClose, onTopicCreated }) => {
    const { user } = useAuth();
    const { subjects, refreshData } = useApp();

    // O estado "sticky" - Não limpa ao salvar
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [concurso, setConcurso] = useState('');

    // O estado que limpa ao salvar
    const [topicName, setTopicName] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sincroniza o concurso/origem com a matéria selecionada
    useEffect(() => {
        if (isOpen && selectedSubjectId && subjects.length > 0) {
            const subject = subjects.find(s => s.id === selectedSubjectId);
            if (subject) {
                const cachedOrigins = JSON.parse(localStorage.getItem('temp_origins') || '{}');
                const sourceKey = subject.name.trim().toUpperCase();
                const source = (subject as { source?: string }).source || cachedOrigins[sourceKey] || cachedOrigins[subject.name] || '';
                setConcurso(source);
            }
        }
    }, [isOpen, selectedSubjectId, subjects]);

    // Inicializa o select com a primeira matéria disponível caso ainda não haja nenhuma selecionada
    useEffect(() => {
        if (isOpen && !selectedSubjectId && subjects.length > 0) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [isOpen, subjects, selectedSubjectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;
        if (!selectedSubjectId) {
            toastGate.notifyError('Selecione uma matéria.', 'SUBJECT_REQUIRED');
            return;
        }
        if (!topicName.trim()) {
            toastGate.notifyError('Digite o nome do tópico.', 'TOPIC_NAME_REQUIRED');
            return;
        }

        try {
            setIsSubmitting(true);

            // Atualiza o cache de origem (origem/concurso vinculado ao nome da matéria)
            const subject = subjects.find(s => s.id === selectedSubjectId);
            if (subject) {
                const cachedOrigins = JSON.parse(localStorage.getItem('temp_origins') || '{}');
                const sourceKey = subject.name.trim().toUpperCase();
                if (concurso.trim()) {
                    cachedOrigins[sourceKey] = concurso.trim();
                } else {
                    delete cachedOrigins[sourceKey];
                }
                localStorage.setItem('temp_origins', JSON.stringify(cachedOrigins));
            }

            const { data, error } = await supabase.from('topics').insert({
                subject_id: selectedSubjectId,
                name: topicName.trim(),
                completed: false,
                review_count: 0
            }).select().single();

            if (error) throw error;

            toast.success('Tópico adicionado com sucesso!');

            // Limpar apenas o nome do tópico (Comportamento Sticky)
            setTopicName('');

            // Atualizar o cache global de subjects para refletir o novo tópico
            await refreshData();

            // Disparar o evento no componente pai para eventualmente rolar a tela ou limpar a flag
            onTopicCreated();

            // Note: O modal não fecha automaticamente para permitir adições múltiplas

        } catch (error: unknown) {
            console.error('Erro ao adicionar tópico:', error);
            const err = error as Error;
            toastGate.notifyError(err.message || 'Erro ao adicionar tópico. Tente novamente.', 'TOPIC_CREATE_ERROR');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        Adicionar Tópicos
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Adicione múltiplos tópicos rapidamente. A matéria permanece selecionada.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Matéria */}
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="subjectSelect" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <Book className="w-4 h-4 text-zinc-400" /> Matéria
                            </Label>
                            <Select
                                value={selectedSubjectId}
                                onValueChange={setSelectedSubjectId}
                                disabled={subjects.length === 0}
                            >
                                <SelectTrigger id="subjectSelect" className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-white/10 h-11 focus:ring-primary">
                                    <SelectValue placeholder={subjects.length === 0 ? "Nenhuma matéria cadastrada" : "Selecione a matéria"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[250px] z-[100] bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10">
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id} className="cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800">
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Concurso / Origem */}
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="concursoInput" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <Book className="w-4 h-4 text-zinc-400" /> Concurso / Origem
                            </Label>
                            <Input
                                id="concursoInput"
                                placeholder="Ex: PF, RFB..."
                                value={concurso}
                                onChange={(e) => setConcurso(e.target.value)}
                                className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-white/10 h-11 focus:border-primary/50"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Nome do Tópico */}
                    <div className="space-y-2">
                        <Label htmlFor="topicName" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-zinc-400" /> Nome do Tópico
                        </Label>
                        <Input
                            id="topicName"
                            placeholder="Ex: Licitações (Lei 14.133), Direitos Individuais..."
                            value={topicName}
                            onChange={(e) => setTopicName(e.target.value)}
                            className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-white/10 h-11 focus:border-primary/50 text-zinc-900 dark:text-zinc-100"
                            autoComplete="off"
                            autoFocus
                        />
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            className="w-full h-11 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-[15px] shadow-sm flex items-center justify-center gap-2"
                            disabled={isSubmitting || subjects.length === 0}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Salvar Tópico
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
