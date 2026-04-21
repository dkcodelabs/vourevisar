import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Subject } from '@/types';
import { BookOpen, CheckCircle, Clock, Calendar, AlertTriangle, BarChart2 } from 'lucide-react';

interface StatsSidebarProps {
    subjects: Subject[];
    reviewData: any[];
    overdueCount: number;
    todayCount: number;
    futureCount: number;
}

export const StatsSidebar: React.FC<StatsSidebarProps> = ({
    subjects,
    reviewData,
    overdueCount,
    todayCount,
    futureCount
}) => {
    // Calcular estatísticas
    const totalTopics = subjects.reduce((acc, sub) => acc + sub.topics.length, 0);

    // Tópicos iniciados: aqueles que têm nextReview definido ou reviewStage diferente de 'Novo' (assumindo que 'Novo' é o padrão)
    // Se não tivermos essa info exata, podemos usar aqueles que têm alguma data de revisão agendada
    const startedTopics = subjects.reduce((acc, sub) => {
        return acc + sub.topics.filter(t => t.nextReview || t.reviewStage !== 'Novo').length;
    }, 0);

    const completedReviews = reviewData ? reviewData.length : 0;
    const totalPending = overdueCount + todayCount + futureCount;

    const stats = [
        {
            label: "Tópicos Iniciados",
            value: startedTopics,
            icon: BookOpen,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            label: "Revisões Realizadas",
            value: completedReviews,
            icon: CheckCircle,
            color: "text-green-500",
            bg: "bg-green-50"
        },
        {
            label: "Revisões para Hoje",
            value: todayCount,
            icon: Calendar,
            color: "text-orange-500",
            bg: "bg-orange-50"
        },
        {
            label: "Revisões Atrasadas",
            value: overdueCount,
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-red-50"
        },
        {
            label: "Revisões Futuras",
            value: futureCount,
            icon: Clock,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            label: "Total Pendente",
            value: totalPending,
            icon: BarChart2,
            color: "text-gray-500",
            bg: "bg-gray-50"
        }
    ];

    return (
        <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-900">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {stats.map((stat, index) => (
                        <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                                <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                            </div>
                            <span className="font-bold text-gray-900">{stat.value}</span>
                        </div>
                    ))}
                </div>

                {/* Barra de Dias Ativos (Simulação visual por enquanto ou baseada em dados reais se tivermos) */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900">Dias Ativos</span>
                        <span className="text-xs text-gray-500">Últimos 7 dias</span>
                    </div>
                    <div className="flex justify-between gap-1">
                        {[...Array(7)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-8 flex-1 rounded-md ${
                                    // Simulação: dias aleatórios ativos para visual
                                    i > 2 ? 'bg-green-500' : 'bg-gray-100'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
