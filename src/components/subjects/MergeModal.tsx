import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Subject } from '@/types';

interface MergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSubjects: Subject[];
    onConfirm: (finalName: string) => void;
}

export const MergeModal = ({ isOpen, onClose, selectedSubjects, onConfirm }: MergeModalProps) => {
    const [selectedName, setSelectedName] = useState('');
    const [customName, setCustomName] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    useEffect(() => {
        if (selectedSubjects.length > 0) {
            setSelectedName(selectedSubjects[0].name);
        }
    }, [selectedSubjects, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[24px] p-6 shadow-2xl"
            >
                <h3 className="text-lg font-black text-content-main mb-4 tracking-tight">Mesclar Matérias</h3>
                <p className="text-xs text-content-muted mb-6">Qual será o nome final da matéria?</p>

                <div className="space-y-4 mb-8">
                    {selectedSubjects.map((s) => (
                        <label key={s.id} className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800/50 border border-white/5 cursor-pointer hover:border-primary/30 transition-all">
                            <input
                                type="radio"
                                name="mergeName"
                                checked={!useCustom && selectedName === s.name}
                                onChange={() => {
                                    setSelectedName(s.name);
                                    setUseCustom(false);
                                }}
                                className="w-4 h-4 text-primary bg-zinc-900 border-white/10 focus:ring-primary"
                            />
                            <span className="text-sm font-bold text-content-main uppercase">{s.name}</span>
                        </label>
                    ))}

                    <div className={`p-4 rounded-2xl bg-zinc-800/50 border transition-all ${useCustom ? 'border-primary/50' : 'border-white/5'}`}>
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <input
                                type="radio"
                                name="mergeName"
                                checked={useCustom}
                                onChange={() => setUseCustom(true)}
                                className="w-4 h-4 text-primary bg-zinc-900 border-white/10 focus:ring-primary"
                            />
                            <span className="text-sm font-bold text-content-main uppercase">Nome Personalizado</span>
                        </label>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => {
                                setCustomName(e.target.value);
                                setUseCustom(true);
                            }}
                            placeholder="Digite o novo nome..."
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-content-main focus:outline-none focus:border-primary/30"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-zinc-800 text-content-muted font-black rounded-xl hover:bg-zinc-700 transition-all uppercase text-[10px] tracking-widest"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={() => onConfirm(useCustom ? customName : selectedName)}
                        className="flex-1 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary/90 transition-all uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                    >
                        CONFIRMAR
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
