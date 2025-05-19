
import React, { createContext, useContext, useState } from 'react';
import { Subject, UserProfile, StudyProgress } from '../types';
import { mockSubjects, mockUserProfile, mockStudyProgress } from '../data/mockData';

interface AppContextType {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  studyProgress: StudyProgress;
  setStudyProgress: React.Dispatch<React.SetStateAction<StudyProgress>>;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, subject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addTopicToSubject: (subjectId: string, topicName: string) => void;
  removeTopicFromSubject: (subjectId: string, topicId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUserProfile);
  const [studyProgress, setStudyProgress] = useState<StudyProgress>(mockStudyProgress);

  const addSubject = (subject: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...subject,
      id: Date.now().toString(),
    };
    setSubjects((prev) => [...prev, newSubject]);
  };

  const updateSubject = (id: string, updatedFields: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id ? { ...subject, ...updatedFields } : subject
      )
    );
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
  };

  const addTopicToSubject = (subjectId: string, topicName: string) => {
    setSubjects((prev) =>
      prev.map((subject) => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            topics: [
              ...subject.topics,
              {
                id: `${subjectId}-${Date.now()}`,
                name: topicName,
                completed: false,
                reviewCount: 0,
              },
            ],
          };
        }
        return subject;
      })
    );
  };

  const removeTopicFromSubject = (subjectId: string, topicId: string) => {
    setSubjects((prev) =>
      prev.map((subject) => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            topics: subject.topics.filter((topic) => topic.id !== topicId),
          };
        }
        return subject;
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        subjects,
        setSubjects,
        userProfile,
        setUserProfile,
        studyProgress,
        setStudyProgress,
        addSubject,
        updateSubject,
        deleteSubject,
        addTopicToSubject,
        removeTopicFromSubject,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
