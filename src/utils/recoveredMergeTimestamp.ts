export const formatRecoveredMergeTimestamp = (updatedAt?: string | null): string => {
    if (!updatedAt || typeof updatedAt !== 'string') return 'há pouco';

    const timestamp = new Date(updatedAt).getTime();
    if (!Number.isFinite(timestamp)) return 'há pouco';

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(timestamp));
};
