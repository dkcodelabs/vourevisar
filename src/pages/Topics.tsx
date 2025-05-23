
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Search } from 'lucide-react';

interface TopicItem {
  id: string;
  name: string;
  subject_name: string;
  review_stage: string | null;
  completed: boolean;
}

const Topics = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTopics, setFilteredTopics] = useState<TopicItem[]>([]);

  const { data: topics, isLoading, error, refetch } = useQuery({
    queryKey: ['allTopics'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Join topics with subjects to get subject names
      const { data, error } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          completed,
          review_stage,
          subject:subjects(name)
        `)
        .filter('subjects.user_id', 'eq', user.id);

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        name: item.name,
        subject_name: item.subject?.name || 'Sem disciplina',
        review_stage: item.review_stage,
        completed: item.completed
      })) || [];
    },
    enabled: !!user
  });

  useEffect(() => {
    if (topics) {
      if (searchTerm.trim() === '') {
        setFilteredTopics(topics);
      } else {
        setFilteredTopics(
          topics.filter(topic => 
            topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            topic.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
    }
  }, [topics, searchTerm]);

  const handleTopicStatusChange = async (id: string, completed: boolean) => {
    try {
      // Update the topic status
      let updates = {
        completed,
        review_stage: completed ? 'Concluído' : null,
        next_review: null
      };
      
      const { error } = await supabase
        .from('topics')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Show success message
      toast({
        title: completed ? "Tópico concluído!" : "Tópico marcado como não iniciado",
        description: "O status do tópico foi atualizado com sucesso.",
      });

      // Refresh the data
      refetch();
    } catch (error) {
      console.error('Erro ao atualizar tópico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do tópico.",
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Tópicos</h1>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p>Erro ao carregar tópicos. Por favor, tente novamente.</p>
          <button 
            onClick={() => refetch()} 
            className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Tópicos</h1>
      
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Pesquisar tópicos..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Tópico</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Estágio de Revisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell>
                      <Checkbox 
                        checked={topic.completed}
                        onCheckedChange={(checked) => {
                          handleTopicStatusChange(topic.id, checked === true);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{topic.name}</TableCell>
                    <TableCell>{topic.subject_name}</TableCell>
                    <TableCell>
                      {topic.completed 
                        ? "Concluído" 
                        : (topic.review_stage || "Não iniciado")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                    {searchTerm ? "Nenhum tópico encontrado para esta pesquisa." : "Nenhum tópico disponível."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Topics;
