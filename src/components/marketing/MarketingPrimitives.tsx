import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { trialHref } from "./marketingContent";

export const sectionClass =
  "mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12";
export const headingClass =
  "text-[clamp(1.85rem,3.8vw,3rem)] font-extrabold leading-[1.13] tracking-[-0.035em] text-[#172033]";
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={false}
      whileInView={
        reduce
          ? undefined
          : {
              y: [18, 0],
              opacity: [0.65, 1],
              clipPath: ["inset(0 0 4% 0)", "inset(0 0 0% 0)"],
            }
      }
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
export function TrialLink({
  authenticated = false,
  compact = false,
  className = "",
  onClick,
}: {
  authenticated?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={authenticated ? "/dashboard" : trialHref}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl bg-[#1765dc] px-5 text-sm font-bold text-white shadow-[0_8px_20px_-12px_#1765dc] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#1254bd] hover:shadow-[0_12px_24px_-12px_#1765dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 active:translate-y-0 motion-reduce:transform-none ${compact ? "" : "sm:min-h-14 sm:px-6"} ${className}`}
    >
      {authenticated ? "Acessar meu painel" : "Testar 7 dias"}
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}
