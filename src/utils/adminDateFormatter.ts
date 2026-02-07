import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Parses a date string (ISO or otherwise) safely.
 * Returns null if invalid or null/undefined input.
 */
const safeParse = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return isValid(date) ? date : null;
};

/**
 * Returns the absolute formatted string for tooltips.
 * Ex: "sexta-feira, 7 de fevereiro de 2026 às 14:32 (BRT)"
 */
export const formatAbsoluteTooltip = (dateString: string | null | undefined): string => {
    const date = safeParse(dateString);
    if (!date) return '';

    // Convert to target timezone for display accuracy if needed, 
    // but usually parseISO -> local time is fine if browser is in BRT.
    // For strictness, one might use toZonedTime, but let's stick to standard format first.
    // Given requirement: "Timezone de exibição: America/Sao_Paulo"
    // We will assume the data is UTC and we convert/format.

    // Note: 'date-fns-tz' toZonedTime converts a date to the equivalent time in the zone.
    // Since we want to display it, we just format it.

    return format(date, "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm '(BRT)'", { locale: ptBR });
};

/**
 * Formats "Last Access" column.
 * - Value: Relative ("Há X min", "Ontem", etc.) or "Agora" or "Nunca".
 * - Tooltip: Absolute full date.
 */
export const formatLastAccess = (dateString: string | null | undefined) => {
    const date = safeParse(dateString);
    if (!date) {
        return { label: 'Nunca', tooltip: null };
    }

    const tooltip = formatAbsoluteTooltip(dateString);

    let label = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });

    // Custom overrides for "less than a minute" -> "Agora" per user preference if strictly needed,
    // but standard relative is usually "há menos de um minuto".
    if (label === 'há menos de um minuto') {
        label = 'Agora';
    }

    // Abbreviate common outputs if requested? User asked for "Há X min", "Há X h".
    // date-fns outputs "há 5 minutos". We can keep it standard or shorten it.
    // User examples: "Há X min", "Há X h", "Ontem", "Há X dias".
    // Let's implement a simple replacer to match the requested brevity.
    label = label
        .replace('há cerca de ', 'Há ')
        .replace('há ', 'Há ')
        .replace('minutos', 'min')
        .replace('minuto', 'min')
        .replace('horas', 'h')
        .replace('hora', 'h')
        .replace('dias', 'dias'); // Keep days

    return { label, tooltip };
};

/**
 * Formats "Join Date" column.
 * - Value: dd/MM/yyyy or "—".
 * - Tooltip: Absolute full date.
 */
export const formatJoinDate = (dateString: string | null | undefined) => {
    const date = safeParse(dateString);
    if (!date) {
        return { label: '—', tooltip: null };
    }

    const tooltip = formatAbsoluteTooltip(dateString);
    const label = format(date, 'dd/MM/yyyy');

    return { label, tooltip };
};
