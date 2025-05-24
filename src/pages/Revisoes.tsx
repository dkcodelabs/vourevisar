import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { format, differenceInDays, isBefore } from 'date-fns';

interface Topic {
  id: string;
  name: string;
  subject_name: string;
  review_stage?: string | null;
  next_review?: string | null;
}

const stageOrder = {
  '24h': 1,
  '7 dias': 2,
  '30 dias': 3,
};

const Revisoes = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);

  const { data: topics, isLoading, error, refetch } = useQuery({
    queryKey: ['revisoes', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          review_stage,
          next_review,
          subject:subjects(name)
        `)
        .filter('subjects.user_id', 'eq', user.id);
      if (error) throw error;
      // Só tópicos com revisão iniciada (review_stage 24h, 7 dias, 30 dias)
      return (data || []).filter(t => t.review_stage && t.review_stage !== 'Nova' && t.review_stage !== 'Concluído')
        .map(t => ({
          id: t.id,
          name: t.name,
          subject_name: t.subject?.name || 'Sem disciplina',
          review_stage: t.review_stage ?? null,
          next_review: t.next_review ?? null,
        }));
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

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Revisões</h1>
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Pesquisar tópicos ou disciplinas..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin h-12 w-12 text-app-blue" />
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disciplina</TableHead>
                <TableHead>Tópico</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Próxima Revisão</TableHead>
                <TableHead>Dias Vencidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics.length > 0 ? (
                filteredTopics
                  .sort((a, b) => (stageOrder[a.review_stage!] || 99) - (stageOrder[b.review_stage!] || 99))
                  .map((topic) => {
                    const hoje = new Date();
                    const proxima = topic.next_review ? new Date(topic.next_review) : null;
                    let diasVencidos = '';
                    if (proxima && isBefore(proxima, hoje)) {
                      diasVencidos = String(differenceInDays(hoje, proxima));
                    }
                    return (
                      <TableRow key={topic.id}>
                        <TableCell>{topic.subject_name}</TableCell>
                        <TableCell>{topic.name}</TableCell>
                        <TableCell>{topic.review_stage}</TableCell>
                        <TableCell>{proxima ? format(proxima, 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell className={diasVencidos ? 'text-red-600 font-bold' : ''}>{diasVencidos || '-'}</TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    Nenhuma revisão iniciada.
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

export default Revisoes; 