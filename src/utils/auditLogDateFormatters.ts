import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatAuditLogDateTime = (dateStr: string) => format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: ptBR });
export const formatAuditLogFullDateTime = (dateStr: string) => format(new Date(dateStr), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR });
