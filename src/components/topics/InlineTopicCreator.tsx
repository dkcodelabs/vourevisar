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
                    {/* The dark modal container */}
                    <div className="bg-[#18181b] border border-[#27272a] rounded-[20px] shadow-sm p-6 w-full relative">
                        {/* Subtle close X in the top right as seen in the screenshot */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                                <div className="w-8 h-8 rounded-full bg-[#00d084]/20 flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-[#00d084]" />
                                </div>
                                Adição Rápida de Tópicos
                            </h3>
                            <p className="text-sm text-zinc-400 mt-2 font-medium">
                                Digite os tópicos continuamente e pressione Enter. A matéria continuará selecionada.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                            {/* Input: Matéria */}
                            <div className="w-full md:w-[35%] space-y-2">
                                <Label htmlFor="subjectSelectInline" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Book className="w-3.5 h-3.5" /> Matéria
                                </Label>
                                <Select
                                    value={selectedSubjectId}
                                    onValueChange={setSelectedSubjectId}
                                    disabled={subjects.length === 0}
                                >
                                    <SelectTrigger id="subjectSelectInline" className="bg-[#27272a] border-[#3f3f46] text-white focus:ring-[#00d084]/30 h-12 w-full rounded-xl text-sm font-semibold shadow-sm focus:outline-none">
                                        <SelectValue placeholder={subjects.length === 0 ? "Nenhuma matéria cadastrada" : "Selecione a matéria"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px] z-[100] bg-[#18181b] border-[#3f3f46] rounded-xl text-white">
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.id} value={subject.id} className="cursor-pointer focus:bg-[#27272a] text-sm font-semibold focus:text-white">
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Input: Nome do Tópico */}
                            <div className="w-full md:w-[65%] space-y-2 relative">
                                <Label htmlFor="topicNameInline" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Star className="w-3.5 h-3.5" /> Nome do Tópico
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        id="topicNameInline"
                                        placeholder="Digite e Enter (ex: Licitações, Direitos...)"
                                        value={topicName}
                                        onChange={(e) => setTopicName(e.target.value)}
                                        className="bg-[#27272a] border-[#3f3f46] focus:border-[#00d084]/50 focus:ring-1 focus:ring-[#00d084]/50 text-white placeholder:text-zinc-500 h-12 pr-32 rounded-xl text-sm font-semibold shadow-sm"
                                        autoComplete="off"
                                        autoFocus
                                    />
                                    {/* Botão de Save inside the Input context visually */}
                                    <div className="absolute right-1.5">
                                        <Button
                                            type="submit"
                                            className="h-9 px-5 bg-[#00d084] hover:bg-[#00b371] text-white font-bold text-[11px] uppercase tracking-widest shadow-sm shadow-[#00d084]/20 flex items-center justify-center gap-2 rounded-lg transition-all"
                                            disabled={isSubmitting || subjects.length === 0}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4" />
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
