const normalizeSubjectSearchText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

export const filterSubjectsAccentInsensitive = <T extends { name: string }>(
    subjects: T[],
    query: string
): T[] => {
    const normalizedQuery = normalizeSubjectSearchText(query);
    if (!normalizedQuery) return subjects;

    return subjects.filter(subject => (
        normalizeSubjectSearchText(subject.name).includes(normalizedQuery)
    ));
};

export const resolveBulkSubjectName = <T extends { name: string }>(
    suggestions: T[],
    focusedIndex: number,
    typedName: string
): string => {
    const focusedSuggestion = focusedIndex >= 0 ? suggestions[focusedIndex] : undefined;
    if (focusedSuggestion) return focusedSuggestion.name;
    if (suggestions.length === 1) return suggestions[0].name;
    return typedName.trim();
};
