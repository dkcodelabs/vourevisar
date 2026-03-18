import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Book, Bookmark, X, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

interface InlineTopicCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onTopicCreated: () => void;
}

export const InlineTopicCreator: React.FC<InlineTopicCreatorProps> = ({ isOpen, onClose, onTopicCreated }) => {
    const { user } = useAuth();
    const { subjects, refreshData } = useApp();

    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [topicName, setTopicName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

            const { error } = await supabase.from('topics').insert({
                subject_id: selectedSubjectId,
                name: topicName.trim(),
                completed: false,
                review_count: 0
            }).select().single();

            if (error) throw error;

            toast.success('Tópico adicionado com sucesso!');
            setTopicName('');
            await refreshData();
            onTopicCreated();

        } catch (error: unknown) {
            console.error('Erro ao adicionar tópico:', error);
            const err = error as Error;
            toastGate.notifyError(err.message || 'Erro ao adicionar tópico. Tente novamente.', 'TOPIC_CREATE_ERROR');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 16, marginBottom: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }}
                    className="overflow-hidden w-full relative z-10"
                >
                    {/* The modal container - Refined to support light mode */}
                    <div className="bg-card border border-border rounded-[20px] shadow-lg p-5 w-full relative group/creator transition-all duration-300">
                        {/* Subtle close X */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-content-muted hover:text-foreground hover:bg-secondary transition-all"
                        >
                            <X size={16} />
                        </button>

                        <div className="mb-5">
                            <h3 className="text-lg font-black text-foreground flex items-center gap-2.5 tracking-tight">
                                <div className="w-7 h-7 rounded-lg bg-[#00d084]/15 flex items-center justify-center shrink-0">
                                    <Plus className="h-4 w-4 text-[#00d084]" />
                                </div>
                                Adição Rápida de Tópicos
                            </h3>
                            <p className="text-[11px] text-content-muted mt-1.5 font-medium opacity-80">
                                Digite os tópicos continuamente e pressione Enter. A matéria continuará selecionada.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            {/* Input: Matéria */}
                            <div className="md:col-span-4 space-y-1.5">
                                <Label htmlFor="subjectSelectInline" className="text-[10px] font-bold text-content-muted uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                    <Book className="w-3 h-3" /> Matéria
                                </Label>
                                <Select
                                    value={selectedSubjectId}
                                    onValueChange={setSelectedSubjectId}
                                    disabled={subjects.length === 0}
                                >
                                    <SelectTrigger id="subjectSelectInline" className="bg-secondary/50 border-border text-foreground focus:ring-primary/20 h-10 w-full rounded-xl text-xs font-semibold shadow-sm focus:outline-none transition-all hover:border-border-hover">
                                        <SelectValue placeholder={subjects.length === 0 ? "Nenhuma matéria" : "Selecione"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px] z-[100] bg-card border-border rounded-xl text-foreground w-[var(--radix-select-trigger-width)]">
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.id} value={subject.id} className="cursor-pointer focus:bg-secondary text-xs font-semibold transition-colors">
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Input: Nome do Tópico */}
                            <div className="md:col-span-8 space-y-1.5 relative">
                                <Label htmlFor="topicNameInline" className="text-[10px] font-bold text-content-muted uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                    <Star className="w-3 h-3" /> Nome do Tópico
                                </Label>
                                <div className="relative flex items-center group/input">
                                    <Input
                                        id="topicNameInline"
                                        placeholder="Ex: Licitações, Atos Administrativos..."
                                        value={topicName}
                                        onChange={(e) => setTopicName(e.target.value)}
                                        className="bg-secondary/50 border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 text-foreground placeholder:text-content-muted/50 h-10 pr-28 rounded-xl text-xs font-semibold shadow-sm transition-all hover:border-border-hover"
                                        autoComplete="off"
                                        autoFocus
                                    />
                                    {/* Botão de Save inside the Input context visually */}
                                    <div className="absolute right-1">
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="h-8 px-4 bg-[#00d084] hover:bg-[#00b371] text-white font-bold text-[10px] uppercase tracking-widest shadow-sm shadow-[#00d084]/15 flex items-center justify-center gap-1.5 rounded-lg transition-all active:scale-95"
                                            disabled={isSubmitting || subjects.length === 0}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Salvar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
