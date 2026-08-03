import { motion, useReducedMotion } from 'framer-motion';
import { Check, ShieldCheck, Sparkles } from 'lucide-react';

export const BillingArtwork = ({ nextStep = 'Voltar aos estudos' }: { nextStep?: string }) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[430px]" aria-hidden="true">
      <div className="absolute inset-[8%] rounded-[42%] bg-gradient-to-br from-[#7758ff] via-[#3f7cff] to-[#2ed9c3] opacity-20 blur-3xl" />
      <motion.div
        className="absolute inset-[13%] overflow-hidden rounded-[3rem] border border-white/70 bg-[#17122b] shadow-[0_35px_100px_-35px_rgba(23,18,43,0.72)]"
        animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [0, 0.8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-[#785cff] blur-2xl" />
        <div className="absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-[#2478ff] blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-7 text-white sm:p-9">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Sparkles className="h-5 w-5 text-[#dfff65]" />
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em]">
              vouRevisar
            </span>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/55">
              Sua preparação
            </p>
            <p className="max-w-[260px] text-3xl font-black leading-[1.04] tracking-[-0.045em] sm:text-4xl">
              Consistência vira aprovação.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfff65] text-[#17122b]">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
            <div>
              <p className="text-sm font-extrabold">Pagamento protegido</p>
              <p className="text-xs text-white/55">Protegido e processado pela Stripe</p>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="absolute right-[1%] top-[12%] flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 text-[#17122b] shadow-xl"
        animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <ShieldCheck className="h-5 w-5 text-[#5b47eb]" />
        <span className="text-xs font-black">Dados protegidos</span>
      </motion.div>
      <motion.div
        className="absolute bottom-[9%] left-[0] rounded-2xl bg-[#dfff65] px-4 py-3 text-[#17122b] shadow-xl"
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-55">Próximo passo</p>
        <p className="text-sm font-black">{nextStep}</p>
      </motion.div>
    </div>
  );
};
