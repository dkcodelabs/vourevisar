import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clock3,
  Layers3,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const SCENE_DURATION_MS = 5200;

const scenes = [
  {
    id: "next-step",
    label: "Próximo passo",
    controlLabel: "do próximo passo",
    title: "Decida o que fazer agora",
    description: "Uma orientação clara para começar sem montar a rotina do zero.",
  },
  {
    id: "cycle",
    label: "Ciclo",
    controlLabel: "do ciclo",
    title: "Transforme o edital em rotina",
    description: "Organize matérias e tópicos em uma sequência que cabe no seu dia.",
  },
  {
    id: "review",
    label: "Revisão",
    controlLabel: "da revisão",
    title: "Revise no momento certo",
    description: "O próximo contato com cada assunto fica visível antes de ser esquecido.",
  },
] as const;

type SceneId = (typeof scenes)[number]["id"];

function FloatingBeacon({
  className,
  color,
  glow,
  yRange = [-9, 9],
  duration = 6,
  delay = 0,
  reduceMotion,
}: {
  className: string;
  color: string;
  glow: string;
  yRange?: [number, number];
  duration?: number;
  delay?: number;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      aria-hidden="true"
      animate={
        reduceMotion
          ? undefined
          : {
              y: [yRange[0], yRange[1], yRange[0]],
            }
      }
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={`pointer-events-none absolute flex items-center justify-center ${className}`}
    >
      <span className="relative flex size-2.5">
        <span
          className="absolute -inset-1 rounded-full opacity-35 blur-sm"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative inline-flex size-2.5 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 16px 3px ${glow}`,
          }}
        />
      </span>
    </motion.div>
  );
}

function ProductScene({ scene }: { scene: SceneId }) {
  if (scene === "cycle") {
    return (
      <div aria-hidden="true" className="relative mx-auto w-full max-w-[460px] px-4 sm:px-5">
        <div className="rounded-[24px] border border-white/15 bg-[#0e2746]/95 p-5 shadow-[0_32px_75px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers3 size={17} className="text-[#b7fb45]" />
              Ciclo de estudos
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-white/70">Hoje</span>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-[#7ab5ff]/30 bg-[#2f80ff]/15 p-3">
              <p className="text-[11px] font-semibold text-[#b7fb45]">Agora</p>
              <p className="mt-1 text-sm font-bold text-white">Direito Constitucional</p>
              <p className="mt-1 text-xs leading-5 text-white/65">Controle de constitucionalidade</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-[#b7fb45]"><Clock3 size={15} /></span>
              <div>
                <p className="text-xs font-bold text-white">Sessão de foco</p>
                <p className="mt-0.5 text-[11px] text-white/55">Registre quando concluir</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-white/40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scene === "review") {
    return (
      <div aria-hidden="true" className="relative mx-auto w-full max-w-[460px] px-4 sm:px-5">
        <div className="rounded-[24px] border border-white/15 bg-[#0e2746]/95 p-5 shadow-[0_32px_75px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <RotateCcw size={17} className="text-[#b7fb45]" />
              Revisões
            </div>
            <span className="text-[11px] font-semibold text-[#b7fb45]">Sua vez</span>
          </div>
          <div className="mt-5 rounded-2xl border border-[#b7fb45]/25 bg-[#b7fb45]/10 p-4">
            <p className="text-[11px] font-bold text-[#d5ff45]">REVISÃO PROGRAMADA</p>
            <p className="mt-2 text-base font-extrabold text-white">Compreensão de texto</p>
            <p className="mt-1 text-xs leading-5 text-white/65">Retome o assunto antes que ele esfrie.</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#b7fb45] text-[#0b2139]"><Check size={14} strokeWidth={3} /></span>
              Pronto para revisar
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[460px] px-4 sm:px-5">
      <div className="rounded-[24px] border border-white/15 bg-[#0e2746]/95 p-5 shadow-[0_32px_75px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles size={17} className="text-[#b7fb45]" />
            Seu painel
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-white/70">Hoje</span>
        </div>
        <div className="mt-5 rounded-2xl border border-[#7ab5ff]/35 bg-[#2f80ff]/15 p-4">
          <p className="text-[11px] font-bold text-[#b7fb45]">PRÓXIMA AÇÃO</p>
          <p className="mt-2 text-base font-extrabold text-white">Estude este tópico agora</p>
          <p className="mt-1 text-xs leading-5 text-white/65">Língua Portuguesa · Interpretação de textos</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2f80ff] px-3 py-2 text-xs font-bold text-white">
            <BookOpen size={14} />
            Começar estudo
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthProductShowcase() {
  const reduceMotion = useReducedMotion();
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  const activeScene = scenes[activeSceneIndex];

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState !== "hidden");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || isPaused || !isDocumentVisible) return;

    const intervalId = window.setInterval(() => {
      setActiveSceneIndex((currentIndex) => (currentIndex + 1) % scenes.length);
    }, SCENE_DURATION_MS);

    return () => window.clearInterval(intervalId);
  }, [isDocumentVisible, isPaused, reduceMotion]);

  return (
    <section
      aria-label="Demonstração de como o vouRevisar funciona"
      className="relative flex min-h-full flex-col overflow-hidden bg-[#08233e] px-8 py-8 sm:px-10 sm:py-9 xl:px-14 xl:py-12"
    >
      {/* Luz ambiente de fundo: radial e orbs orgânicos flutuantes com blur suave */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_24%,rgba(47,128,255,0.38),transparent_38%),radial-gradient(circle_at_14%_86%,rgba(99,223,22,0.16),transparent_34%)]"
      />

      <motion.div
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : {
                y: [0, -24, 0],
                x: [0, 14, 0],
                scale: [1, 1.07, 1],
              }
        }
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-20 top-[18%] size-80 rounded-full bg-[#38bdf8]/15 blur-[100px]"
      />

      <motion.div
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : {
                y: [0, 22, 0],
                x: [0, -15, 0],
                scale: [1, 1.06, 1],
              }
        }
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        className="pointer-events-none absolute -left-16 bottom-[20%] size-72 rounded-full bg-[#b7fb45]/12 blur-[95px]"
      />

      <motion.div
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: [0.22, 0.38, 0.22],
                scale: [0.96, 1.04, 0.96],
              }
        }
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f80ff]/14 blur-[115px]"
      />

      {/* Beacons luminosos flutuantes e dinâmicos com glow */}
      <FloatingBeacon
        className="left-[12%] top-[30%]"
        color="#b7fb45"
        glow="rgba(183,251,69,0.7)"
        yRange={[-9, 9]}
        duration={6.2}
        reduceMotion={reduceMotion}
      />
      <FloatingBeacon
        className="right-[15%] top-[20%]"
        color="#38bdf8"
        glow="rgba(56,189,248,0.75)"
        yRange={[8, -8]}
        duration={7}
        delay={0.5}
        reduceMotion={reduceMotion}
      />
      <FloatingBeacon
        className="bottom-[28%] left-[9%]"
        color="#60a5fa"
        glow="rgba(96,165,250,0.65)"
        yRange={[-7, 8]}
        duration={7.8}
        delay={1.1}
        reduceMotion={reduceMotion}
      />
      <FloatingBeacon
        className="bottom-[18%] right-[13%]"
        color="#d5ff45"
        glow="rgba(213,255,69,0.6)"
        yRange={[8, -7]}
        duration={6.6}
        delay={1.6}
        reduceMotion={reduceMotion}
      />

      {/* Header com tipografia estilo Hero Display e contraste cromático */}
      <div className="relative flex items-start justify-between gap-6 pt-16 xl:pt-20">
        <div className="max-w-xl">
          <h2 className="text-balance text-3xl font-extrabold leading-[1.06] tracking-[-0.04em] text-white sm:text-4xl xl:text-5xl">
            Revisão <span className="text-[#b7fb45]">inteligente</span>{" "}
            <span className="block sm:inline">para <span className="text-[#38bdf8]">concursos.</span></span>
          </h2>
          <p className="mt-4 max-w-lg text-base font-normal leading-relaxed text-slate-300/85 xl:text-lg">
            Organize edital, ciclo e revisões em uma rotina que você consegue manter.
          </p>
        </div>
        <button
          type="button"
          aria-label={isPaused ? "Reproduzir demonstração" : "Pausar demonstração"}
          aria-pressed={isPaused}
          onClick={() => setIsPaused((paused) => !paused)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/85 transition-[background-color,color,transform] hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7fb45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08233e] active:scale-95"
        >
          {isPaused ? <CirclePlay size={18} aria-hidden="true" /> : <CirclePause size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Cena central do produto com transição suave */}
      <div className="relative flex flex-1 flex-col items-center justify-center py-6 xl:py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeScene.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: reduceMotion ? 0.16 : 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            <ProductScene scene={activeScene.id} />
          </motion.div>
        </AnimatePresence>
        <div className="mt-7 max-w-md text-center">
          <h3 className="text-balance text-2xl font-bold tracking-tight text-white xl:text-3xl">
            {activeScene.title}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-300/80">
            {activeScene.description}
          </p>
        </div>
      </div>

      {/* Controle de navegação das cenas */}
      <div className="relative flex items-center justify-center gap-2" aria-label="Cenas da demonstração">
        {scenes.map((scene, index) => {
          const isActive = index === activeSceneIndex;
          return (
            <button
              key={scene.id}
              type="button"
              aria-label={`Ver demonstração ${scene.controlLabel}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActiveSceneIndex(index)}
              className="group flex min-h-10 items-center py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7fb45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08233e]"
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] ${
                  isActive ? "w-8 bg-[#b7fb45]" : "w-1.5 bg-white/35 group-hover:bg-white/70"
                }`}
              />
              <span className="sr-only">{scene.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
