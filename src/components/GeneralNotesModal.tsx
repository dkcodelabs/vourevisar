import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Calendar as CalendarIcon, Trash2, Save, Edit2, Check, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { TopicNotes } from '@/types';

interface Reminder {
    id: string;
    text: string;
    date: Date | null;
    completed: boolean;
}

interface AllNotesEntry {
    id: string;
    subjectName: string;
    topicName: string;
    content: string;
    updatedAt: string;
    createdAt: string;
    type?: 'topic' | 'subject';
    subjectId?: string;
}

interface GeneralNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenTopicNotes?: (topicId: string, topicName: string, subjectName: string) => void;
    onOpenSubjectNotes?: (subjectId: string, subjectName: string) => void;
    onRequestReopen?: () => void; // Nova prop para solicitar reabertura
}

interface CustomCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ selectedDate, onDateSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Dias do mês anterior
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            days.push({ date: prevDate, isCurrentMonth: false });
        }

        // Dias do mês atual
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ date: new Date(year, month, day), isCurrentMonth: true });
        }

        // Dias do próximo mês para completar a grade
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
        }

        return days;
    };

    const days = getDaysInMonth(currentMonth);
    const today = new Date();

    const isToday = (date: Date) => {
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    return (
        <div className="w-80">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                    <button
                        key={index}
                        onClick={() => onDateSelect(day.date)}
                        className={`
                            p-2 text-sm rounded transition-colors
                            ${day.isCurrentMonth
                                ? 'text-gray-900 dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-900'
                                : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }
                            ${isToday(day.date)
                                ? 'bg-blue-100 dark:bg-blue-900 font-semibold'
                                : ''
                            }
                            ${isSelected(day.date)
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : ''
                            }
                        `}
                    >
                        {day.date.getDate()}
                    </button>
                ))}
            </div>
        </div>
    );
};

const GeneralNotesModal: React.FC<GeneralNotesModalProps> = ({ isOpen, onClose, onOpenTopicNotes, onOpenSubjectNotes, onRequestReopen }) => {
    const { user } = useAuth();
    const quillRef = useRef<ReactQuill>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [notes, setNotes] = useState<TopicNotes | undefined>();
    const [currentContent, setCurrentContent] = useState('');
    const [reminders, setReminders] = useState<Reminder[]>([]);

    const [newReminderText, setNewReminderText] = useState('');
    const [newReminderDate, setNewReminderDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Estados para edição de lembretes
    const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [editingDate, setEditingDate] = useState<Date | null>(null);
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);

    // Estados para visão condensada
    const [allNotes, setAllNotes] = useState<AllNotesEntry[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<AllNotesEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [isLoadingAllNotes, setIsLoadingAllNotes] = useState(false);
    const [activeTab, setActiveTab] = useState('notes');
    const [isTemporarilyHidden, setIsTemporarilyHidden] = useState(false);
    const [hasLoadedNotes, setHasLoadedNotes] = useState(false);

    const loadGeneralNotes = useCallback(async () => {
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
            // Não mostrar erro se for apenas porque não há dados
            if (error.message && !error.message.includes('No rows found')) {
                toastManager.error('Erro ao carregar anotações');
            }
            // Mesmo com erro, inicializar com conteúdo vazio
            setCurrentContent('');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const loadReminders = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('general_reminders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

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
            // Não mostrar erro se for apenas porque não há dados
            if (error.message && !error.message.includes('No rows found')) {
                toastManager.error('Erro ao carregar lembretes');
            }
            // Mesmo com erro, inicializar com array vazio
            setReminders([]);
        }
    }, [user]);

    // Carregar dados ao abrir o modal
    useEffect(() => {
        if (isOpen && user) {
            loadGeneralNotes();
            loadReminders();
            // Resetar estado de ocultação quando modal é reaberto
            setIsTemporarilyHidden(false);
        } else if (!isOpen) {
            // Resetar aba quando modal fechar
            setActiveTab('notes');
            // Limpar campos quando fechar
            setNewReminderText('');
            // Resetar estado de ocultação
            setIsTemporarilyHidden(false);
            // Resetar flag de carregamento para permitir recarregar na próxima vez
            setHasLoadedNotes(false);
        }
    }, [isOpen, user, loadGeneralNotes, loadReminders]);

    // Detectar quando o modal deve ser reaberto após fechamento de modal secundário
    useEffect(() => {
        if (isTemporarilyHidden && onRequestReopen) {
            // Aguardar um pequeno delay para garantir que o modal secundário foi fechado
            const timer = setTimeout(() => {
                setIsTemporarilyHidden(false);
                onRequestReopen();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [isTemporarilyHidden, onRequestReopen]);

    // Verificar overflow quando o conteúdo carrega
    useEffect(() => {
        if (currentContent && quillRef.current) {
            setTimeout(() => {
                checkOverflow();
            }, 100);
        }
    }, [currentContent]);

    // Fechar calendário ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setShowCalendar(false);
            }
        };

        if (showCalendar) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCalendar]);

    // Filtrar e ordenar anotações
    useEffect(() => {
        let filtered = [...allNotes];

        // Aplicar filtro de pesquisa
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(note =>
                note.subjectName.toLowerCase().includes(term) ||
                note.topicName.toLowerCase().includes(term) ||
                note.content.toLowerCase().includes(term)
            );
        }

        // Aplicar ordenação
        filtered.sort((a, b) => {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        setFilteredNotes(filtered);
    }, [allNotes, searchTerm, sortOrder]);

    const loadAllNotes = useCallback(async () => {
        if (!user) return;

        setIsLoadingAllNotes(true);
        try {
            console.log('🔍 Carregando todas as anotações para o usuário:', user.id);

            // Buscar tópicos com anotações
            const { data: topicsData, error: topicsError } = await supabase
                .from('topics')
                .select(`
                    id, 
                    name, 
                    notes, 
                    updated_at, 
                    created_at, 
                    subject_id,
                    subjects!inner(user_id, name)
                `)
                .eq('subjects.user_id', user.id)
                .not('notes', 'is', null);

            // Buscar matérias com anotações (sem tópico específico)
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, name, notes, updated_at, created_at')
                .eq('user_id', user.id)
                .not('notes', 'is', null);

            if (topicsError) throw topicsError;
            if (subjectsError) throw subjectsError;

            console.log('📊 Tópicos com anotações encontrados:', topicsData?.length || 0);
            console.log('📚 Matérias com anotações encontradas:', subjectsData?.length || 0);

            const allNotesEntries: AllNotesEntry[] = [];

            // Processar anotações de tópicos
            if (topicsData && topicsData.length > 0) {
                const topicEntries = topicsData
                    .filter(topic => {
                        const hasNotes = !!topic.notes;
                        let notesContent = '';

                        console.log(`🔍 Debug tópico ${topic.name}:`, {
                            hasNotes,
                            notesType: typeof topic.notes,
                            notesValue: topic.notes,
                            notesKeys: topic.notes && typeof topic.notes === 'object' ? Object.keys(topic.notes) : null
                        });

                        if (typeof topic.notes === 'string') {
                            notesContent = topic.notes;
                        } else if (topic.notes && typeof topic.notes === 'object') {
                            // Tentar diferentes propriedades possíveis
                            const notesObj = topic.notes as any;
                            notesContent = notesObj?.content || notesObj?.text || notesObj?.notes || JSON.stringify(notesObj);
                        }

                        // Remover tags HTML e verificar se há conteúdo real
                        const cleanContent = notesContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

                        // Verificar se não é apenas um objeto vazio serializado
                        const isEmptyObject = notesContent === '{}' || notesContent === 'null' || notesContent === 'undefined';
                        const contentNotEmpty = hasNotes && cleanContent && cleanContent !== '' && !isEmptyObject;

                        console.log(`🔍 Tópico ${topic.name}:`, {
                            hasNotes,
                            notesContent: notesContent.substring(0, 100),
                            cleanContent: cleanContent.substring(0, 100),
                            isEmptyObject,
                            contentNotEmpty
                        });
                        return contentNotEmpty;
                    })
                    .map(topic => {
                        let content = '';
                        if (typeof topic.notes === 'string') {
                            content = topic.notes;
                        } else if (topic.notes && typeof topic.notes === 'object') {
                            const notesObj = topic.notes as any;
                            content = notesObj?.content || notesObj?.text || notesObj?.notes || JSON.stringify(notesObj);
                        }

                        return {
                            id: topic.id,
                            subjectName: (topic.subjects as any)?.name || 'Matéria não encontrada',
                            topicName: topic.name,
                            content: content,
                            updatedAt: topic.updated_at || topic.created_at || new Date().toISOString(),
                            createdAt: topic.created_at || new Date().toISOString(),
                            type: 'topic' as const
                        };
                    });

                allNotesEntries.push(...topicEntries);
            }

            // Processar anotações de matérias
            if (subjectsData && subjectsData.length > 0) {
                const subjectEntries = subjectsData
                    .filter(subject => {
                        const hasNotes = !!subject.notes;
                        let notesContent = '';

                        console.log(`🔍 Debug matéria ${subject.name}:`, {
                            hasNotes,
                            notesType: typeof subject.notes,
                            notesValue: subject.notes,
                            notesKeys: subject.notes && typeof subject.notes === 'object' ? Object.keys(subject.notes) : null
                        });

                        if (typeof subject.notes === 'string') {
                            notesContent = subject.notes;
                        } else if (subject.notes && typeof subject.notes === 'object') {
                            // Tentar diferentes propriedades possíveis
                            const notesObj = subject.notes as any;
                            notesContent = notesObj?.content || notesObj?.text || notesObj?.notes || JSON.stringify(notesObj);
                        }

                        // Remover tags HTML e verificar se há conteúdo real
                        const cleanContent = notesContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

                        // Verificar se não é apenas um objeto vazio serializado
                        const isEmptyObject = notesContent === '{}' || notesContent === 'null' || notesContent === 'undefined';
                        const contentNotEmpty = hasNotes && cleanContent && cleanContent !== '' && !isEmptyObject;

                        console.log(`🔍 Matéria ${subject.name}:`, {
                            hasNotes,
                            notesContent: notesContent.substring(0, 100),
                            cleanContent: cleanContent.substring(0, 100),
                            isEmptyObject,
                            contentNotEmpty
                        });
                        return contentNotEmpty;
                    })
                    .map(subject => {
                        let content = '';
                        if (typeof subject.notes === 'string') {
                            content = subject.notes;
                        } else if (subject.notes && typeof subject.notes === 'object') {
                            const notesObj = subject.notes as any;
                            content = notesObj?.content || notesObj?.text || notesObj?.notes || JSON.stringify(notesObj);
                        }

                        return {
                            id: `subject-${subject.id}`,
                            subjectName: subject.name,
                            topicName: '(Anotações Gerais da Matéria)',
                            content: content,
                            updatedAt: subject.updated_at || subject.created_at || new Date().toISOString(),
                            createdAt: subject.created_at || new Date().toISOString(),
                            type: 'subject' as const,
                            subjectId: subject.id
                        };
                    });

                allNotesEntries.push(...subjectEntries);
            }

            // Ordenar por data de atualização (mais recentes primeiro)
            const sortedEntries = allNotesEntries.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );

            console.log('📝 Total de anotações processadas:', sortedEntries.length);
            console.log('📊 Tipos encontrados:', {
                topics: sortedEntries.filter(e => e.type === 'topic').length,
                subjects: sortedEntries.filter(e => e.type === 'subject').length
            });

            // Atualizar registros sem updated_at com datas aleatórias
            await updateMissingDates();

            setAllNotes(sortedEntries);
            setFilteredNotes(sortedEntries);
        } catch (error) {
            console.error('Erro ao carregar todas as anotações:', error);
            toastManager.error('Erro ao carregar anotações');
            setAllNotes([]);
            setFilteredNotes([]);
        } finally {
            setIsLoadingAllNotes(false);
        }
    }, [user]);

    // Carregar dados quando a aba "condensed" for acessada
    useEffect(() => {
        if (activeTab === 'condensed' && user && !hasLoadedNotes && !isLoadingAllNotes) {
            console.log('🔄 Carregando anotações para aba condensada...');
            setHasLoadedNotes(true);
            loadAllNotes();
        }
    }, [activeTab, user, hasLoadedNotes, isLoadingAllNotes]); // Usando flag de controle


    const updateMissingDates = async () => {
        if (!user) return;

        try {
            console.log('🔄 Atualizando registros sem updated_at...');

            // Gerar data aleatória entre 30 dias atrás e hoje
            const generateRandomDate = () => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
                return new Date(randomTime).toISOString();
            };

            // Atualizar tópicos sem updated_at
            const { data: topicsWithoutDate } = await supabase
                .from('topics')
                .select('id, subjects!inner(user_id)')
                .eq('subjects.user_id', user.id)
                .is('updated_at', null);

            if (topicsWithoutDate && topicsWithoutDate.length > 0) {
                console.log(`📊 Atualizando ${topicsWithoutDate.length} tópicos sem data`);

                for (const topic of topicsWithoutDate) {
                    await supabase
                        .from('topics')
                        .update({ updated_at: generateRandomDate() })
                        .eq('id', topic.id);
                }
            }

            // Atualizar matérias sem updated_at
            const { data: subjectsWithoutDate } = await supabase
                .from('subjects')
                .select('id')
                .eq('user_id', user.id)
                .is('updated_at', null);

            if (subjectsWithoutDate && subjectsWithoutDate.length > 0) {
                console.log(`📚 Atualizando ${subjectsWithoutDate.length} matérias sem data`);

                for (const subject of subjectsWithoutDate) {
                    await supabase
                        .from('subjects')
                        .update({ updated_at: generateRandomDate() })
                        .eq('id', subject.id);
                }
            }

            console.log('✅ Datas atualizadas com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao atualizar datas:', error);
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
        if (!newReminderText.trim() || !user) {
            return;
        }

        const textToSave = newReminderText.trim();

        // Limpar o input imediatamente para evitar problemas de estado
        setNewReminderText('');

        try {
            const { data, error } = await supabase
                .from('general_reminders')
                .insert({
                    user_id: user.id,
                    text: textToSave,
                    reminder_date: newReminderDate?.toISOString() || null,
                    completed: false
                })
                .select()
                .single();

            if (error) throw error;

            setReminders(prev => [{
                id: data.id,
                text: data.text,
                date: data.reminder_date ? new Date(data.reminder_date) : null,
                completed: data.completed || false
            }, ...prev]);

            toastManager.success('Lembrete adicionado!');
        } catch (error) {
            console.error('Erro ao adicionar lembrete:', error);
            toastManager.error('Erro ao adicionar lembrete');
            // Restaurar o texto se houve erro
            setNewReminderText(textToSave);
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
            toastManager.success('Lembrete removido!');
        } catch (error) {
            console.error('Erro ao remover lembrete:', error);
            toastManager.error('Erro ao remover lembrete');
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
            toastManager.error('Erro ao atualizar lembrete');
        }
    };

    const startEditingReminder = (reminder: Reminder) => {
        setEditingReminderId(reminder.id);
        setEditingText(reminder.text);
        setEditingDate(reminder.date);
    };

    const cancelEditingReminder = () => {
        setEditingReminderId(null);
        setEditingText('');
        setEditingDate(null);
        setShowEditDatePicker(false);
    };

    const saveReminderEdit = async (id: string) => {
        if (!editingText.trim()) {
            toastManager.error('O texto do lembrete não pode estar vazio');
            return;
        }

        try {
            const { error } = await supabase
                .from('general_reminders')
                .update({
                    text: editingText.trim(),
                    reminder_date: editingDate?.toISOString() || null
                })
                .eq('id', id);

            if (error) throw error;

            setReminders(prev => prev.map(r =>
                r.id === id ? { ...r, text: editingText.trim(), date: editingDate } : r
            ));

            cancelEditingReminder();
            toastManager.success('Lembrete atualizado!');
        } catch (error) {
            console.error('Erro ao atualizar lembrete:', error);
            toastManager.error('Erro ao atualizar lembrete');
        }
    };

    const handleViewTopicNotes = (noteId: string, subjectName: string) => {
        console.log('🔍 Abrindo modal da anotação:', { noteId, subjectName });

        // Encontrar a anotação na lista
        const note = allNotes.find(n => n.id === noteId);

        if (!note) {
            toastManager.error('Anotação não encontrada');
            return;
        }

        // Ocultar temporariamente o modal atual em vez de fechá-lo
        setIsTemporarilyHidden(true);

        if (note.type === 'subject') {
            // Para anotações de matéria, abrir o modal de matéria
            if (onOpenSubjectNotes && note.subjectId) {
                onOpenSubjectNotes(note.subjectId, subjectName);
            } else {
                toastManager.info(`Abrindo anotações da matéria: ${subjectName}`);
            }
        } else {
            // Para anotações de tópico, abrir o modal de tópico
            if (onOpenTopicNotes) {
                onOpenTopicNotes(noteId, note.topicName, subjectName);
            } else {
                toastManager.info(`Abrindo anotações do tópico: ${note.topicName}`);
            }
        }
    };

    const checkOverflow = () => {
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const editorElement = quill.root.querySelector('.ql-editor');
            const containerElement = quill.root;

            if (editorElement && containerElement) {
                const hasOverflow = editorElement.scrollHeight > editorElement.clientHeight;
                if (hasOverflow) {
                    containerElement.classList.add('has-overflow');
                } else {
                    containerElement.classList.remove('has-overflow');
                }
            }
        }
    };

    const handleContentChange = (content: string) => {
        setCurrentContent(content);

        // Verificar overflow após mudança de conteúdo
        setTimeout(() => {
            checkOverflow();

            if (quillRef.current) {
                const quill = quillRef.current.getEditor();
                const selection = quill.getSelection();
                if (selection) {
                    // Scroll para a posição do cursor com margem extra
                    const editorElement = quill.root.querySelector('.ql-editor');
                    if (editorElement) {
                        const bounds = quill.getBounds(selection.index);
                        const editorRect = editorElement.getBoundingClientRect();
                        const scrollTop = editorElement.scrollTop;

                        // Calcular posição ideal (deixar 50px de margem na parte inferior)
                        const targetPosition = bounds.top + scrollTop;
                        const visibleBottom = scrollTop + editorRect.height - 50;

                        if (targetPosition > visibleBottom) {
                            editorElement.scrollTop = targetPosition - editorRect.height + 50;
                        }
                    }
                }
            }
        }, 10);
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
            toastManager.success('Anotações salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            toastManager.error('Erro ao salvar anotações');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndClose = async () => {
        setIsSaving(true);
        try {
            // Criar objeto de notas com o conteúdo atual
            const notesToSave: TopicNotes = {
                content: currentContent,
                updatedAt: new Date().toISOString(),
                createdAt: notes?.createdAt || new Date().toISOString()
            };

            await saveNotes(notesToSave);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            toastManager.error('Erro ao salvar anotações');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <style>{`
                /* CSS Variables para temas */
                :root {
                    --modal-quill-border: hsl(214.3 31.8% 91.4%);
                    --modal-quill-border-focus: hsl(221.2 83.2% 53.3%);
                    --modal-quill-bg: hsl(0 0% 100%);
                    --modal-quill-text: hsl(222.2 84% 4.9%);
                    --modal-quill-toolbar-bg: hsl(210 40% 96.1%);
                    --modal-quill-scrollbar-track: hsl(210 40% 96.1%);
                    --modal-quill-scrollbar-thumb: hsl(215.4 16.3% 46.9% / 0.3);
                    --modal-quill-scrollbar-thumb-hover: hsl(215.4 16.3% 46.9% / 0.5);
                    --modal-quill-fade-overlay: linear-gradient(transparent, hsl(0 0% 100% / 0.95));
                }
                
                .dark {
                    --modal-quill-border: hsl(220 13% 30%);
                    --modal-quill-border-focus: hsl(195 89% 49%);
                    --modal-quill-bg: hsl(215 28% 17%);
                    --modal-quill-text: hsl(220 15% 95%);
                    --modal-quill-toolbar-bg: hsl(220 13% 25%);
                    --modal-quill-scrollbar-track: hsl(220 13% 25%);
                    --modal-quill-scrollbar-thumb: hsl(220 15% 65% / 0.3);
                    --modal-quill-scrollbar-thumb-hover: hsl(220 15% 65% / 0.5);
                    --modal-quill-fade-overlay: linear-gradient(transparent, hsl(215 28% 17% / 0.95));
                }

                /* ReactQuill Container - Bordas consistentes */
                .ql-container {
                    height: 358px !important;
                    border: 1px solid var(--modal-quill-border) !important;
                    border-top: none !important;
                    border-radius: 0 0 6px 6px !important;
                    position: relative;
                    background: var(--modal-quill-bg) !important;
                    transition: border-color 0.2s ease-in-out;
                }
                
                /* ReactQuill Toolbar - Bordas consistentes */
                .ql-toolbar {
                    border: 1px solid var(--modal-quill-border) !important;
                    border-bottom: none !important;
                    border-radius: 6px 6px 0 0 !important;
                    height: 42px;
                    background: var(--modal-quill-toolbar-bg) !important;
                    transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out;
                    position: relative !important;
                    z-index: 10 !important;
                    pointer-events: auto !important;
                }
                
                /* Remover efeitos de foco indesejados */
                .ql-toolbar:focus-within,
                .ql-container:focus-within {
                    border-color: var(--modal-quill-border) !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                
                /* Editor - Texto e scroll */
                .ql-editor {
                    height: 358px !important;
                    max-height: 358px !important;
                    min-height: 358px !important;
                    font-size: 14px;
                    line-height: 1.6;
                    overflow-y: scroll !important;
                    scroll-behavior: smooth;
                    scrollbar-width: thin;
                    scrollbar-color: var(--modal-quill-scrollbar-thumb) var(--modal-quill-scrollbar-track);
                    padding: 12px 15px 35px 15px !important;
                    box-sizing: border-box;
                    background: var(--modal-quill-bg) !important;
                    color: var(--modal-quill-text) !important;
                    border: none !important;
                    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
                }
                
                /* Webkit scrollbar styling - Modo claro e escuro */
                .ql-editor::-webkit-scrollbar {
                    width: 12px;
                }
                
                .ql-editor::-webkit-scrollbar-track {
                    background: var(--modal-quill-scrollbar-track);
                    border-radius: 6px;
                }
                
                .ql-editor::-webkit-scrollbar-thumb {
                    background: var(--modal-quill-scrollbar-thumb);
                    border-radius: 6px;
                    border: 2px solid var(--modal-quill-scrollbar-track);
                }
                
                .ql-editor::-webkit-scrollbar-thumb:hover {
                    background: var(--modal-quill-scrollbar-thumb-hover);
                }
                
                /* Placeholder text */
                .ql-editor.ql-blank::before {
                    color: var(--modal-quill-text) !important;
                    opacity: 0.6;
                    font-style: normal;
                }
                
                /* Indicador visual de mais conteúdo */
                .ql-container::after {
                    content: '';
                    position: absolute;
                    bottom: 1px;
                    left: 1px;
                    right: 13px;
                    height: 30px;
                    background: var(--modal-quill-fade-overlay);
                    pointer-events: none !important;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    border-radius: 0 0 5px 5px;
                    z-index: 1;
                }
                
                .ql-container.has-overflow::after {
                    opacity: 1;
                }
                
                /* Remover outline de foco padrão */
                .ql-editor:focus {
                    outline: none !important;
                    box-shadow: none !important;
                }
                
                /* Forçar altura do componente ReactQuill */
                .quill {
                    height: 400px !important;
                }
                
                /* Toolbar funcionalidade - Garantir que os botões funcionem */
                .ql-toolbar button {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                }
                
                .ql-toolbar .ql-picker {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                }
                
                .ql-toolbar .ql-picker-label {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                }
                
                /* Toolbar icons - Modo escuro */
                .dark .ql-toolbar .ql-stroke {
                    stroke: var(--modal-quill-text) !important;
                }
                
                .dark .ql-toolbar .ql-fill {
                    fill: var(--modal-quill-text) !important;
                }
                
                .dark .ql-toolbar .ql-picker-label {
                    color: var(--modal-quill-text) !important;
                }
                
                .dark .ql-toolbar .ql-picker-options {
                    background: var(--modal-quill-bg) !important;
                    border: 1px solid var(--modal-quill-border) !important;
                }
                
                .dark .ql-toolbar .ql-picker-item {
                    color: var(--modal-quill-text) !important;
                }
                
                .dark .ql-toolbar .ql-picker-item:hover {
                    background: var(--modal-quill-toolbar-bg) !important;
                }

            `}</style>
            <Dialog open={isOpen && !isTemporarilyHidden} onOpenChange={(open) => {
                console.log('Dialog onOpenChange chamado com:', open);
                if (!open) onClose();
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col general-notes-modal">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="text-xl font-semibold">Anotações Gerais</DialogTitle>
                        <DialogDescription>
                            Gerencie suas anotações de estudo e lembretes importantes
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        <Tabs
                            defaultValue="notes"
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                                <TabsTrigger value="notes">📝 Anotações</TabsTrigger>
                                <TabsTrigger value="reminders">🔔 Lembretes</TabsTrigger>
                                <TabsTrigger value="condensed">📋 Visão Condensada</TabsTrigger>
                            </TabsList>

                            <TabsContent value="notes" className="flex-1 overflow-hidden mt-4">
                                <div className="h-full max-h-[400px]">
                                    <div className="bg-white dark:bg-slate-800 rounded-lg h-full">
                                        <ReactQuill
                                            ref={quillRef}
                                            theme="snow"
                                            value={currentContent}
                                            onChange={handleContentChange}
                                            readOnly={isLoading || isSaving}
                                            className="h-full"
                                            style={{ height: '400px' }}
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, false] }],
                                                    ['bold', 'italic', 'underline', 'strike'],
                                                    [{ 'background': [] }],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    ['link'],
                                                    ['clean']
                                                ]
                                            }}
                                            formats={[
                                                'header',
                                                'bold', 'italic', 'underline', 'strike',
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
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Novo Lembrete</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                key={`reminder-input-${reminders.length}`}
                                                placeholder="Digite seu lembrete..."
                                                value={newReminderText}
                                                onChange={(e) => setNewReminderText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addReminder()}
                                                className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                                            />
                                            <div className="relative" ref={calendarRef}>
                                                <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border-gray-300">
                                                    <span>{format(newReminderDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCalendar(!showCalendar)}
                                                        className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                                                    >
                                                        <CalendarIcon className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                {showCalendar && (
                                                    <div
                                                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
                                                        onClick={() => setShowCalendar(false)}
                                                    >
                                                        <div
                                                            className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl p-4 max-w-sm mx-4"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <CustomCalendar
                                                                selectedDate={newReminderDate}
                                                                onDateSelect={(date) => {
                                                                    setNewReminderDate(date);
                                                                    setShowCalendar(false);
                                                                }}
                                                            />
                                                            <div className="flex justify-end gap-2 mt-4">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setShowCalendar(false)}
                                                                >
                                                                    Fechar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <Button onClick={addReminder} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Lista de lembretes */}
                                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                                        {reminders.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                <p>Nenhum lembrete criado ainda.</p>
                                                <p className="text-sm">Adicione lembretes para organizar seus estudos!</p>
                                            </div>
                                        ) : (
                                            reminders.map((reminder) => (
                                                <div
                                                    key={reminder.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border ${editingReminderId === reminder.id
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                                                        : reminder.completed
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={reminder.completed}
                                                        onChange={(e) => toggleReminderCompleted(reminder.id, e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 rounded"
                                                        disabled={editingReminderId === reminder.id}
                                                    />
                                                    <div className="flex-1">
                                                        {editingReminderId === reminder.id ? (
                                                            <div className="space-y-2">
                                                                <Input
                                                                    value={editingText}
                                                                    onChange={(e) => setEditingText(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            saveReminderEdit(reminder.id);
                                                                        } else if (e.key === 'Escape') {
                                                                            cancelEditingReminder();
                                                                        }
                                                                    }}
                                                                    className="text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                                                    autoFocus
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative">
                                                                        <div
                                                                            className="flex items-center gap-2 px-2 py-1 text-xs border rounded cursor-pointer bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                                            onClick={() => setShowEditDatePicker(true)}
                                                                        >
                                                                            <span>📅 {editingDate ? format(editingDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Sem data'}</span>
                                                                        </div>

                                                                        {showEditDatePicker && (
                                                                            <div
                                                                                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
                                                                                onClick={() => setShowEditDatePicker(false)}
                                                                            >
                                                                                <div
                                                                                    className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl p-4 max-w-sm mx-4"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <CustomCalendar
                                                                                        selectedDate={editingDate || new Date()}
                                                                                        onDateSelect={(date) => {
                                                                                            setEditingDate(date);
                                                                                            setShowEditDatePicker(false);
                                                                                        }}
                                                                                    />
                                                                                    <div className="flex justify-end gap-2 mt-4">
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={() => {
                                                                                                setEditingDate(null);
                                                                                                setShowEditDatePicker(false);
                                                                                            }}
                                                                                        >
                                                                                            Remover data
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={() => setShowEditDatePicker(false)}
                                                                                        >
                                                                                            Fechar
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className={`${reminder.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                                    {reminder.text}
                                                                </p>
                                                                {reminder.date && (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                        📅 {format(reminder.date, 'dd/MM/yyyy', { locale: ptBR })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {editingReminderId === reminder.id ? (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => saveReminderEdit(reminder.id)}
                                                                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={cancelEditingReminder}
                                                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => startEditingReminder(reminder)}
                                                                    className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => deleteReminder(reminder.id)}
                                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="condensed" className="flex-1 overflow-auto mt-4">
                                <div className="space-y-4">
                                    {/* Controles de filtro e ordenação */}
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                                        <div className="flex gap-3 items-center">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Pesquisar por matéria, tópico ou conteúdo..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                                className="whitespace-nowrap"
                                            >
                                                {sortOrder === 'desc' ? '📅 Mais recentes' : '📅 Mais antigas'}
                                            </Button>
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {filteredNotes.length} anotação(ões) encontrada(s)
                                        </div>
                                    </div>

                                    {/* Lista de anotações */}
                                    {isLoadingAllNotes ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                            <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando anotações...</span>
                                        </div>
                                    ) : filteredNotes.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            {searchTerm ? (
                                                <div>
                                                    <p className="mb-2">🔍 Nenhuma anotação encontrada com os filtros aplicados.</p>
                                                    <p className="text-sm">Tente ajustar sua pesquisa ou limpar o filtro.</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="mb-2">📝 Nenhuma anotação encontrada.</p>
                                                    <p className="text-sm">As anotações criadas nos tópicos aparecerão aqui automaticamente.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-h-[400px] overflow-y-auto space-y-3">
                                            {filteredNotes.map((note) => (
                                                <div
                                                    key={note.id}
                                                    className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex-1">
                                                            {/* Data e hora - menor */}
                                                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                📅 {format(new Date(note.updatedAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                                                            </div>

                                                            {/* Matéria */}
                                                            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                                                📚 {note.subjectName}
                                                            </div>

                                                            {/* Tópico */}
                                                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                                                📖 {note.topicName}
                                                            </div>
                                                        </div>

                                                        {/* Botão Ver */}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewTopicNotes(note.id, note.subjectName)}
                                                            className="ml-4 whitespace-nowrap"
                                                        >
                                                            Ver ►
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="flex justify-between gap-2 pt-4 border-t flex-shrink-0">
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                        <Button
                            variant="outline"
                            onClick={handleSaveAndClose}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-400 dark:bg-gray-800"
                        >
                            Salvar e Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GeneralNotesModal;