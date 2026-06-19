export const parseBulkTopics = (value: string): string[] => value
    .split(/[;\r\n]+/)
    .map(topic => topic.trim())
    .filter(Boolean);

export const shouldAdvanceToBulkTopics = (key: string, shiftKey: boolean): boolean => (
    key === 'Enter' || (key === 'Tab' && !shiftKey)
);
