
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { format, differenceInDays, isBefore } from 'date-fns';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';

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
      
      // Buscar tópicos com informações do subject
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          review_stage,
          next_review,
          subject_id
        `)
        .not('review_stage', 'is', null)
        .neq('review_stage', 'Nova')
        .neq('review_stage', 'Concluído');

      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        throw topicsError;
      }

      if (!topicsData || topicsData.length === 0) {
        return [];
      }

      // Buscar subjects do usuário
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        throw subjectsError;
      }

      // Filtrar apenas tópicos que pertencem aos subjects do usuário
      const userSubjectIds = (subjectsData || []).map(s => s.id);
      const filteredTopics = topicsData.filter(topic => 
        userSubjectIds.includes(topic.subject_id)
      );

      // Mapear com nomes dos subjects
      const topicsWithSubjects = filteredTopics.map(topic => {
        const subject = subjectsData?.find(s => s.id === topic.subject_id);
        return {
          id: topic.id,
          name: topic.name,
          subject_name: subject?.name || 'Sem disciplina',
          review_stage: topic.review_stage,
          next_review: topic.next_review,
        };
      });

      console.log('Topics with subjects loaded:', topicsWithSubjects);
      return topicsWithSubjects;
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
    <div className="container mx-auto p-2">
      <AnimatedTitle className="mb-4">Revisões</AnimatedTitle>
      <GlassCard className="p-4 mb-4">
        <div className="relative mb-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Pesquisar tópicos ou disciplinas..."
            className="pl-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin h-8 w-8 text-app-blue" />
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-white/20 bg-white/60 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Disciplina</TableHead>
                  <TableHead className="text-xs">Tópico</TableHead>
                  <TableHead className="text-xs">Estágio</TableHead>
                  <TableHead className="text-xs">Próxima Revisão</TableHead>
                  <TableHead className="text-xs">Dias Vencidos</TableHead>
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
                        <TableRow key={topic.id} className="text-xs">
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
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500 text-xs">
                      Nenhuma revisão iniciada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Revisoes;
