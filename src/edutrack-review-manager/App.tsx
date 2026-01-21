
import React, { useState } from 'react';
import StudyModal from './components/StudyModal';
import { StudyTopic, SessionStatus } from './types';

const INITIAL_TOPIC: StudyTopic = {
  title: 'Língua Portuguesa',
  subtitle: 'Relação entre tipo textual e gênero literário...',
  sessions: [
    {
      id: '1',
      label: '24h',
      date: '15/10/25 • 14:50',
      status: SessionStatus.COMPLETED,
      meta: 'Concluída (20min)'
    },
    {
      id: '2',
      label: '7D',
      date: '22/10/25 • 14:50',
      status: SessionStatus.DELAYED,
      meta: '54d atraso'
    },
    {
      id: '3',
      label: '15D',
      date: '30/10/25 • 14:50',
      status: SessionStatus.TODAY,
      meta: 'Hoje'
    },
    {
      id: '4',
      label: '30D',
      date: '15/11/25 • 14:50',
      status: SessionStatus.FUTURE,
      meta: 'Futuro'
    }
  ]
};

const App: React.FC = () => {
  const [showModal, setShowModal] = useState(true);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      {/* Background Decorative Element */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-gold/10 blur-[120px] rounded-full"></div>
      </div>

      <main className="relative z-10 w-full flex flex-col items-center">
        {showModal ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <StudyModal 
              topic={INITIAL_TOPIC} 
              onClose={() => setShowModal(false)} 
            />
          </div>
        ) : (
          <div className="text-center animate-in fade-in slide-in-from-top-4 duration-700">
            <h2 className="text-4xl font-bold text-white mb-4">EduTrack</h2>
            <p className="text-text-muted mb-8 max-w-md">Seu progresso de revisão foi salvo. Mantenha o foco nos seus objetivos de longo prazo.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors shadow-xl"
            >
              Simular Nova Revisão
            </button>
          </div>
        )}
      </main>

      {/* Floating Indicator */}
      <div className="fixed bottom-6 right-6 p-4 bg-bg-card border border-border-main rounded-2xl shadow-lg flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
        <span className="text-[11px] font-bold text-white uppercase tracking-widest">Sincronizado</span>
      </div>
    </div>
  );
};

export default App;
