
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Book, BarChart3, Timer, Target, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { Subject } from '@/types';
import { useNavigate } from 'react-router-dom';
import { AddSubjectForm } from '@/components/subjects/AddSubjectForm';
import { EditSubjectForm } from '@/components/subjects/EditSubjectForm';
import { ConfirmDeleteDialog } from '@/components/subjects/ConfirmDeleteDialog';
import PageContainer from '@/components/layout/PageContainer';
import { StatCard } from '@/components/dashboard/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Subjects = () => {
  const { 
    subjects, 
    createSubject, 
    updateSubject, 
    deleteSubject, 
    isLoading 
  } = useApp();
  
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Filter and sort subjects
  const filteredSubjects = subjects
    .filter(subject => {
      const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || subject.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'progress':
          const aProgress = a.topics.length > 0 ? (a.topics.filter(t => t.completed).length / a.topics.length) * 100 : 0;
          const bProgress = b.topics.length > 0 ? (b.topics.filter(t => t.completed).length / b.topics.length) * 100 : 0;
          return bProgress - aProgress;
        case 'topics':
          return b.topics.length - a.topics.length;
        default:
          return 0;
      }
    });

  // Calculate statistics
  const totalSubjects = subjects.length;
  const completedSubjects = subjects.filter(s => s.status === 'Concluída').length;
  const inProgressSubjects = subjects.filter(s => s.status === 'Em andamento').length;
  const notStartedSubjects = subjects.filter(s => s.status === 'Não iniciada').length;
  const totalTopics = subjects.reduce((total, subject) => total + subject.topics.length, 0);
  const completedTopics = subjects.reduce((total, subject) => total + subject.topics.filter(t => t.completed).length, 0);

  const handleCreateSubject = async (data: { name: string; color?: string }) => {
    try {
      await createSubject(data.name, data.color);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar matéria:', error);
    }
  };

  const handleUpdateSubject = async (data: { name: string; color?: string }) => {
    if (!editingSubject) return;
    
    try {
      await updateSubject(editingSubject.id, data);
      setEditingSubject(null);
    } catch (error) {
      console.error('Erro ao atualizar matéria:', error);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;
    
    try {
      await deleteSubject(deletingSubject.id);
      setDeletingSubject(null);
    } catch (error) {
      console.error('Erro ao deletar matéria:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluída':
        return <Badge variant="default" className="bg-green-100 text-green-800">Concluída</Badge>;
      case 'Em andamento':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Em andamento</Badge>;
      case 'Não iniciada':
        return <Badge variant="secondary">Não iniciada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressPercentage = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;
    return Math.round((subject.topics.filter(t => t.completed).length / subject.topics.length) * 100);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-300" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Matérias</h1>
            <p className="text-gray-600 mt-1">Gerencie suas matérias de estudo</p>
          </div>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Matéria
          </Button>
        </div>

        {/* Statistics */}
        {subjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total"
              subtitle="Matérias"
              completed={totalSubjects}
              total={totalSubjects}
              unit=""
              icon={Book}
              iconBgColor="#DBEAFE"
              progressColor="#3B82F6"
            />
            <StatCard
              title="Concluídas"
              subtitle="Matérias"
              completed={completedSubjects}
              total={totalSubjects}
              unit=""
              icon={CheckCircle2}
              iconBgColor="#D1FAE5"
              progressColor="#10B981"
            />
            <StatCard
              title="Em Andamento"
              subtitle="Matérias"
              completed={inProgressSubjects}
              total={totalSubjects}
              unit=""
              icon={Timer}
              iconBgColor="#FEF3C7"
              progressColor="#F59E0B"
            />
            <StatCard
              title="Tópicos"
              subtitle="Total"
              completed={completedTopics}
              total={totalTopics}
              unit=""
              icon={Target}
              iconBgColor="#EDE9FE"
              progressColor="#8B5CF6"
            />
          </div>
        )}

        {/* Filters and Search */}
        {subjects.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar matérias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Não iniciada">Não iniciada</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="progress">Progresso</SelectItem>
                  <SelectItem value="topics">Nº de Tópicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Content */}
        {subjects.length === 0 ? (
          <div className="text-center py-12">
            <Book className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma matéria cadastrada</h3>
            <p className="text-gray-600 mb-6">Comece adicionando sua primeira matéria de estudo.</p>
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Matéria
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredSubjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                          {subject.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(subject.status)}
                          <span className="text-sm text-gray-500">
                            {getProgressPercentage(subject)}% completo
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSubject(subject)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingSubject(subject)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <strong>{subject.topics.length}</strong> tópicos
                        {subject.topics.length > 0 && (
                          <span className="ml-2">
                            • <strong>{subject.topics.filter(t => t.completed).length}</strong> concluídos
                          </span>
                        )}
                      </div>
                      
                      {/* Progress bar */}
                      {subject.topics.length > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(subject)}%` }}
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/materias/${subject.id}/topicos`)}
                          className="flex-1 text-xs"
                        >
                          <Target className="h-3 w-3 mr-1" />
                          Ver Tópicos
                        </Button>
                        {subject.topics.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/estatisticas?materia=${subject.id}`)}
                            className="flex-1 text-xs"
                          >
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Estatísticas
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modals */}
        <AddSubjectForm
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleCreateSubject}
        />

        {editingSubject && (
          <EditSubjectForm
            subject={editingSubject}
            isOpen={!!editingSubject}
            onClose={() => setEditingSubject(null)}
            onSubmit={handleUpdateSubject}
          />
        )}

        {deletingSubject && (
          <ConfirmDeleteDialog
            subject={deletingSubject}
            isOpen={!!deletingSubject}
            onClose={() => setDeletingSubject(null)}
            onConfirm={handleDeleteSubject}
          />
        )}
      </div>
    </PageContainer>
  );
};

export default Subjects;
