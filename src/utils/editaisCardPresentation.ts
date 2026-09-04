import type { Subject } from '@/types';
import type { PublicEditalSource, UserEdital } from '@/utils/editaisPagePresentation';
import { getSyncedSourceTime, hasEditalMetadataDiff } from '@/utils/editaisSyncPresentation';

function hasSourceContentUpdate(edital: UserEdital, source: PublicEditalSource, subjects: Subject[]) {
    const sourceSubjects = source.subjects || [];
    const localSubjects = subjects.filter(subject => (edital.subjectIds || []).includes(subject.id));
    const localNames = new Set(localSubjects.map(subject => (subject.name || '').trim().toUpperCase()));
    if (sourceSubjects.some(subject => subject.name && !localNames.has(subject.name.trim().toUpperCase()))) return true;
    if (localSubjects.some(subject => subject.name && !sourceSubjects.some(sourceSubject => sourceSubject.name?.trim().toUpperCase() === subject.name.trim().toUpperCase()))) return true;
    return sourceSubjects.some(sourceSubject => {
        const localSubject = subjects.find(subject => subject.name?.trim().toUpperCase() === sourceSubject.name?.trim().toUpperCase());
        if (!localSubject) return false;
        const localTopics = localSubject.topics || [];
        const sourceTopics = sourceSubject.topics || [];
        return sourceTopics.some(topic => topic.name && !localTopics.some(localTopic => localTopic.name?.trim().toUpperCase() === topic.name.trim().toUpperCase())) || localTopics.some(topic => topic.name && !sourceTopics.some(sourceTopic => sourceTopic.name?.trim().toUpperCase() === topic.name.trim().toUpperCase()));
    });
}

export function hasEditalCatalogUpdate(edital: UserEdital, source: PublicEditalSource | undefined, subjects: Subject[]) {
    if (!source) return false;
    const sourceTime = new Date(source.updated_at).getTime();
    const importedTime = new Date(edital.createdAt).getTime();
    const baseline = getSyncedSourceTime(edital) ?? (Number.isNaN(importedTime) ? null : importedTime);
    return (!Number.isNaN(sourceTime) && baseline !== null && sourceTime > baseline) || hasSourceContentUpdate(edital, source, subjects) || hasEditalMetadataDiff(edital, source);
}
