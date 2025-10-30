import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Clock,
  Zap
} from 'lucide-react';

interface RealDataIndicatorProps {
  lastUpdated?: Date;
  totalSessions?: number;
  isLoading?: boolean;
}

export const RealDataIndicator: React.FC<RealDataIndicatorProps> = ({ 
  lastUpdated, 
  totalSessions = 0,
  isLoading = false 
}) => {
  const formatLastUpdated = (date?: Date) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} dias atrás`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Database className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-green-900">Dados Reais</h4>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-sm text-green-700">
                  Estatísticas baseadas em {totalSessions} sessões registradas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-green-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Atualizado {formatLastUpdated(lastUpdated)}</span>
              </div>
              
              {isLoading ? (
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sincronizando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span>Tempo real</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};