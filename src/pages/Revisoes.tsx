
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from 'lucide-react';
import { Calendar as CalendarIcon } from "@/components/ui/calendar"
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { addDays } from 'date-fns';
import { useReviewsData } from '@/hooks/useReviewsData';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Target } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { PageTitle } from '@/components/PageTitle';

interface Filter {
  label: string;
  value: string;
}

const Revisoes = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<DateRange>({
    from: new Date(),
    to: addDays(new Date(), 7),
  })
  const [filter, setFilter] = useState<Filter | null>(null);
  const { topics: reviews, isLoading, error, refetch: forceRefresh } = useReviewsData();
  const [filteredReviews, setFilteredReviews] = useState(reviews);

  useEffect(() => {
    console.log('📄 Revisões - Página acessada, forçando refresh dos dados...');
    forceRefresh();
  }, [forceRefresh]);

  useEffect(() => {
    let newFilteredReviews = reviews;

    if (date?.from && date?.to) {
      newFilteredReviews = newFilteredReviews.filter(review => {
        const reviewDate = new Date(review.next_review || new Date());
        return reviewDate >= date.from && reviewDate <= date.to;
      });
    }

    if (filter) {
      newFilteredReviews = newFilteredReviews.filter(review => review.subject_name === filter.value);
    }

    setFilteredReviews(newFilteredReviews);
  }, [reviews, date, filter]);

  const totalReviews = useMemo(() => reviews.length, [reviews]);
  const completedReviews = useMemo(() => reviews.filter(review => review.completed).length, [reviews]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-red-600">Erro ao carregar revisões</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4">
      <PageTitle title="Revisões" subtitle="Acompanhe suas revisões programadas" />
      
      <div className="mb-4 flex items-center space-x-4">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !date ? "text-muted-foreground" : undefined
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  `${format(date.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(date.to, "dd/MM/yyyy", { locale: ptBR })}`
                ) : (
                  format(date.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                <span>Escolha um período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <CalendarIcon
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              pagedNavigation
            />
          </PopoverContent>
        </Popover>

        {/* Filter Dropdown (Placeholder) */}
        <Input type="text" placeholder="Filtrar por matéria (em breve)" disabled />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Revisões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews}</div>
            <p className="text-sm text-muted-foreground">Revisões agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revisões Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReviews}</div>
            <p className="text-sm text-muted-foreground">Revisões finalizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0}%
            </div>
            <Progress value={totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0} className="mb-2" />
            <p className="text-sm text-muted-foreground">Progresso geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="text-center p-6">
            <p className="text-gray-600">Nenhuma revisão encontrada para o período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReviews.map(review => (
            <Card key={review.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{review.subject_name}</h3>
                    <p className="text-sm text-gray-600">
                      {review.next_review ? format(new Date(review.next_review), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Sem data de revisão'}
                    </p>
                  </div>
                  <Badge className={review.completed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {review.completed ? "Concluída" : "Pendente"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Target className="h-4 w-4" />
                    <span>{review.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{review.completed ? 'Completa' : 'Pendente'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Revisoes;
