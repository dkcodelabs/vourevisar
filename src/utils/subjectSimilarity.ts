
import { Subject } from '@/types';

export type MergeSuggestion = {
    subjectIds: string[];
    suggestedName: string;
    approved: boolean;
};

/**
 * Calcula a similaridade entre duas strings (0 a 1)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Simples Jaccard index para palavras
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
};

export const suggestMerges = (subjects: Subject[]): MergeSuggestion[] => {
    const suggestions: MergeSuggestion[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < subjects.length; i++) {
        const s1 = subjects[i];
        if (processed.has(s1.id)) continue;

        const group: string[] = [s1.id];
        
        for (let j = i + 1; j < subjects.length; j++) {
            const s2 = subjects[j];
            if (processed.has(s2.id)) continue;

            const similarity = calculateSimilarity(s1.name, s2.name);
            
            if (similarity > 0.6) {
                group.push(s2.id);
                processed.add(s2.id);
            }
        }

        if (group.length > 1) {
            processed.add(s1.id);
            suggestions.push({
                subjectIds: group,
                suggestedName: s1.name, // Sugere o nome da primeira
                approved: true
            });
        }
    }

    return suggestions;
};
