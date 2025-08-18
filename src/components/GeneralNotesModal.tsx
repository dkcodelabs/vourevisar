import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar as CalendarIcon, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TopicNotes } from '@/types';

interface Reminder {
    id: string;
    text: string;
    date: Date | null;
    completed: boolean;
}

interface GeneralNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GeneralNotesModal: React.FC<GeneralNotesModalProps> = ({ isOpen, onClose }) => {
    console.log('GeneralNotesModal renderizado com isOpen:', isOpen);
    const { user } = useAuth();
    const [notes, setNotes] = useState<TopicNotes | undefined>();
    const [currentContent, setCurrentContent] = useState('');
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [newReminderText, setNewReminderText] = useState('');
    const [newReminderDate, setNewReminderDate] = useState<Date | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Carregar dados ao abrir o modal
    useEffect(() => {
        if (isOpen && user) {
            loadGeneralNotes();
            loadReminders();
        }
    }, [isOpen, user]);

    const loadGeneralNotes = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('general_notes')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (data) {
                const notesData = {
                    content: data.content || '',
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };
                setNotes(notesData);
                setCurrentContent(data.content || '');
            } else {
                // Se não há dados, inicializar com conteúdo vazio
                setCurrentContent('');
            }
        } catch (error) {
            console.error('Erro ao carregar anotações gerais:', error);
            toast.error('Erro ao carregar anotações');
        } finally {
            setIsLoading(false);
        }
    };

    const loadReminders = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('general_reminders')
                .select('*')
                .eq('user_id', user.id)
                .order('reminder_date', { ascending: true });

            if (error) throw error;

            if (data) {
                setReminders(data.map(item => ({
                    id: item.id,
                    text: item.text,
                    date: item.reminder_date ? new Date(item.reminder_date) : null,
                    completed: item.completed || false
                })));
            }
        } catch (error) {
            console.error('Erro ao carregar lembretes:', error);
            toast.error('Erro ao carregar lembretes');
        }
    };

    const saveNotes = async (notesToSave: TopicNotes) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('general_notes')
                .upsert({
                    user_id: user.id,
                    content: notesToSave.content,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            // Atualizar o estado local após salvar
            setNotes(notesToSave);
            setCurrentContent(notesToSave.content);
        } catch (error) {
            console.error('Erro ao salvar anotações:', error);
            throw error;
        }
    };

    const addReminder = async () => {
        if (!newReminderText.trim() || !user) return;

        try {
            const { data, error } = await supabase
                .from('general_reminders')
                .insert({
                    user_id: user.id,
                    text: newReminderText.trim(),
                    reminder_date: newReminderDate?.toISOString() || null,
                    completed: false
                })
                .select()
                .single();

            if (error) throw error;

            setReminders(prev => [...prev, {
                id: data.id,
                text: data.text,
                date: data.reminder_date ? new Date(data.reminder_date) : null,
                completed: data.completed || false
            }]);

            setNewReminderText('');
            setNewReminderDate(undefined);
            toast.success('Lembrete adicionado!');
        } catch (error) {
            console.error('Erro ao adicionar lembrete:', error);
            toast.error('Erro ao adicionar lembrete');
        }
    };

    const deleteReminder = async (id: string) => {
        try {
            const { error } = await supabase
                .from('general_reminders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setReminders(prev => prev.filter(r => r.id !== id));
            toast.success('Lembrete removido!');
        } catch (error) {
            console.error('Erro ao remover lembrete:', error);
            toast.error('Erro ao remover lembrete');
        }
    };

    const toggleReminderCompleted = async (id: string, completed: boolean) => {
        try {
            const { error } = await supabase
                .from('general_reminders')
                .update({ completed })
                .eq('id', id);

            if (error) throw error;

            setReminders(prev => prev.map(r =>
                r.id === id ? { ...r, completed } : r
            ));
        } catch (error) {
            console.error('Erro ao atualizar lembrete:', error);
            toast.error('Erro ao atualizar lembrete');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Criar objeto de notas com o conteúdo atual
            const notesToSave: TopicNotes = {
                content: currentContent,
                updatedAt: new Date().toISOString(),
                createdAt: notes?.createdAt || new Date().toISOString()
            };

            await saveNotes(notesToSave);
            toast.success('Anotações salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            toast.error('Erro ao salvar anotações');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <style>{`
                .ql-editor {
                    min-height: 300px !important;
                    font-size: 14px;
                    line-height: 1.6;
                }
                .ql-toolbar {
                    border-top: 1px solid #e2e8f0;
                    border-left: 1px solid #e2e8f0;
                    border-right: 1px solid #e2e8f0;
                    border-bottom: none;
                    border-radius: 6px 6px 0 0;
                }
                .ql-container {
                    border-bottom: 1px solid #e2e8f0;
                    border-left: 1px solid #e2e8f0;
                    border-right: 1px solid #e2e8f0;
                    border-top: none;
                    border-radius: 0 0 6px 6px;
                    height: calc(100% - 42px) !important;
                }
                .ql-editor.ql-blank::before {
                    color: #9ca3af;
                    font-style: normal;
                }
            `}</style>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="text-xl font-semibold">Anotações Gerais</DialogTitle>
                        <DialogDescription>
                            Gerencie suas anotações de estudo e lembretes importantes
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        <Tabs defaultValue="notes" className="h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                                <TabsTrigger value="notes">📝 Anotações</TabsTrigger>
                                <TabsTrigger value="reminders">🔔 Lembretes</TabsTrigger>
                            </TabsList>

                            <TabsContent value="notes" className="flex-1 overflow-hidden mt-4">
                                <div className="h-full">
                                    <div className="bg-white rounded-lg border border-gray-200 h-full">
                                        <ReactQuill
                                            theme="snow"
                                            value={currentContent}
                                            onChange={setCurrentContent}
                                            readOnly={isLoading || isSaving}
                                            className="h-full"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, false] }],
                                                    ['bold', 'italic', 'underline'],
                                                    [{ 'background': [] }],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    ['link'],
                                                    ['clean']
                                                ]
                                            }}
                                            formats={[
                                                'header',
                                                'bold', 'italic', 'underline',
                                                'background',
                                                'list', 'bullet',
                                                'link'
                                            ]}
                                            placeholder="Comece a escrever suas anotações gerais..."
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="reminders" className="flex-1 overflow-auto mt-4">
                                <div className="space-y-4">
                                    {/* Adicionar novo lembrete */}
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                        <Label className="text-sm font-medium">Novo Lembrete</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Digite seu lembrete..."
                                                value={newReminderText}
                                                onChange={(e) => setNewReminderText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addReminder()}
                                                className="flex-1"
                                            />
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        {newReminderDate ? format(newReminderDate, 'dd/MM', { locale: ptBR }) : 'Data'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="end">
                                                    <Calendar
                                                        mode="single"
                                                        selected={newReminderDate}
                                                        onSelect={setNewReminderDate}
                                                        locale={ptBR}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Button onClick={addReminder} size="sm">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Lista de lembretes */}
                                    <div className="space-y-2">
                                        {reminders.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Nenhum lembrete criado ainda.</p>
                                                <p className="text-sm">Adicione lembretes para organizar seus estudos!</p>
                                            </div>
                                        ) : (
                                            reminders.map((reminder) => (
                                                <div
                                                    key={reminder.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border ${reminder.completed
                                                        ? 'bg-green-50 border-green-200'
                                                        : 'bg-white border-gray-200'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={reminder.completed}
                                                        onChange={(e) => toggleReminderCompleted(reminder.id, e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <p className={`${reminder.completed ? 'line-through text-gray-500' : ''}`}>
                                                            {reminder.text}
                                                        </p>
                                                        {reminder.date && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                📅 {format(reminder.date, 'dd/MM/yyyy', { locale: ptBR })}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteReminder(reminder.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="flex justify-between gap-2 pt-4 border-t flex-shrink-0">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Save className="h-4 w-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Salvar
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={onClose}>
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GeneralNotesModal;