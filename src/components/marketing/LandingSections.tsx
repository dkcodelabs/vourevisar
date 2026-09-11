import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  FileText,
  Layers,
  Brain,
  RotateCcw,
  ChartNoAxesCombined,
  ScanText,
  Timer,
  WandSparkles,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSupportEmailUrl } from "@/config/support";
import { ProductPreview } from "./ProductPreview";
import { comparison, faqs, journey } from "./marketingContent";
import { headingClass, Reveal, sectionClass } from "./MarketingPrimitives";

export function LandingJourney() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const icons = [FileText, Layers, Brain, RotateCcw, ChartNoAxesCombined];
  return (
    <section
      id="funcionalidades"
      className={`${sectionClass} scroll-mt-24 py-20 lg:py-28`}
    >
      <Reveal className="mb-12 max-w-2xl">
        <h2 className={headingClass}>
          Do edital à próxima revisão.
          <br />
          <span className="text-[#70dc51]">Tudo se conecta.</span>
        </h2>
        <p className="mt-5 max-w-xl leading-7 text-white/60">
          Menos tempo decidindo por onde começar. Mais clareza para continuar de
          onde parou.
        </p>
      </Reveal>
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-20">
        <div>
          {journey.map((step, i) => {
            const Icon = icons[i];
            return (
              <motion.article
                key={step.short}
                onViewportEnter={() => {
                  if (!reduced) setActive(i);
                }}
                viewport={{ amount: 0.7 }}
                className="border-t border-white/10 py-7 lg:min-h-[220px] lg:py-10"
              >
                <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-[#70dc51]">
                  <Icon size={19} />
                  <span>{step.short}</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-white/58">
                  {step.text}
                </p>
              </motion.article>
            );
          })}
          <div className="mt-2 lg:hidden">
            <ProductPreview compact view={active} />
            <p className="mt-4 text-center text-xs font-medium text-white/50">
              {journey[active].detail}
            </p>
          </div>
        </div>
        <div className="hidden lg:sticky lg:top-28 lg:block">
          <ProductPreview view={active} />
          <p className="mt-6 text-center text-sm font-medium text-white/50">
            {journey[active].detail}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {journey.map((step, i) => (
              <span
                key={step.short}
                className={`h-1 rounded-full transition-all duration-500 motion-reduce:transition-none ${i === active ? "w-12 bg-[#70dc51]" : "w-5 bg-white/15"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingResources() {
  const reduced = useReducedMotion();
  return (
    <section id="recursos" className="scroll-mt-24 border-y border-white/10 bg-[#0a100d] py-20 lg:py-28">
      <div className={sectionClass}>
        <Reveal className="mb-12 max-w-3xl">
          <h2 className={headingClass}>
            Sua preparação não precisa
            <br />
            caber em uma planilha.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
            O vouRevisar reúne as decisões que consomem sua energia em uma
            central que acompanha o ritmo do seu estudo.
          </p>
        </Reveal>
        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="group overflow-hidden rounded-2xl bg-[#f4f8f5] text-[#172033] lg:col-span-7">
            <div className="grid h-full sm:grid-cols-[1.08fr_0.92fr]">
              <div className="p-7 sm:p-9">
                <ScanText className="mb-8 text-[#1765dc]" size={27} />
                <h3 className="text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl">
                  Seu edital entra como PDF.
                  <br />
                  A rotina sai pronta.
                </h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
                  A IA extrai o conteúdo e faz o cadastro automático de
                  matérias e tópicos para você começar sem perder horas na
                  organização manual.
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-blue-700">
                  <span className="rounded-lg bg-blue-50 px-3 py-2">PDF do edital</span>
                  <ArrowRight size={15} />
                  <span className="rounded-lg bg-blue-50 px-3 py-2">Conteúdo estruturado</span>
                </div>
              </div>
              <div className="relative min-h-64 overflow-hidden bg-[#dce9ff]">
                <img
                  src="/images/marketing/study-session.jpg"
                  width="1536"
                  height="1024"
                  loading="lazy"
                  alt="Estudante organizando sua preparação"
                  className="h-full w-full object-cover object-[35%_center] transition-transform duration-700 group-hover:scale-[1.045] motion-reduce:transform-none"
                />
                <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-3 shadow-[0_14px_28px_-16px_rgba(23,101,220,0.48)]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#172033]">
                    <WandSparkles size={15} className="text-blue-600" />
                    IA organizando o edital
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal className="overflow-hidden rounded-2xl border border-[#70dc51]/20 bg-[#111a15] p-7 text-white shadow-[0_24px_58px_-36px_rgba(99,223,22,0.55)] lg:col-span-5 sm:p-9">
            <Timer className="mb-8 text-[#8ade58]" size={27} />
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Foco também
              <br />
              deixa rastro.
            </h3>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
              Use o cronômetro durante a sessão e registre o tempo que você
              realmente colocou na preparação.
            </p>
            <div className="mt-9 border-t border-white/15 pt-5" aria-label="Prévia demonstrativa do cronômetro">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Sessão em andamento
                  </p>
                  <p className="mt-1 text-4xl font-extrabold tracking-[-0.05em] tabular-nums text-white">
                    50:00
                  </p>
                </div>
                <motion.span
                  animate={reduced ? undefined : { scale: [1, 1.18, 1], opacity: [0.65, 1, 0.65] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-2 size-3 rounded-full bg-[#8ade58]"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-xs text-slate-400">Prévia demonstrativa</p>
            </div>
          </Reveal>

          <Reveal className="rounded-2xl bg-[#dce9ff] p-7 text-[#172033] lg:col-span-4 sm:p-8">
            <Layers className="mb-7 text-[#1765dc]" size={26} />
            <h3 className="text-xl font-bold tracking-tight">Ciclo de estudo inteligente.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              As matérias entram numa sequência que ajuda a transformar intenção
              em uma próxima ação possível.
            </p>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-800">
              {["Estudar", "Treinar", "Revisar"].map((label, index) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="rounded-lg bg-white/75 px-2.5 py-2">{label}</span>
                  {index < 2 && <ArrowRight size={14} aria-hidden="true" />}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="rounded-2xl border border-white/10 bg-[#121814] p-7 text-white lg:col-span-5 sm:p-8">
            <Brain className="mb-7 text-blue-600" size={26} />
            <h3 className="text-xl font-bold tracking-tight">
              Questões e flashcards com IA, a partir do seu material.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/58">
              Gere prática privada para o tópico que está estudando e descubra
              onde vale retomar antes de seguir em frente.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm font-bold">
              <div className="rounded-xl bg-[#18263f] p-4 text-blue-200">Questões para praticar</div>
              <div className="rounded-xl bg-[#18251a] p-4 text-[#a8ee8a]">Flashcards para lembrar</div>
            </div>
          </Reveal>

          <Reveal className="rounded-2xl border border-white/10 bg-[#121814] p-7 text-white lg:col-span-3 sm:p-8">
            <RotateCcw className="mb-7 text-[#70dc51]" size={26} />
            <h3 className="text-xl font-bold tracking-tight">Revisão que respeita seu histórico.</h3>
            <p className="mt-3 text-sm leading-7 text-white/58">
              A dificuldade registrada ajuda a organizar o que merece voltar à
              sua atenção.
            </p>
          </Reveal>

          <Reveal className="overflow-hidden rounded-2xl bg-[#1765dc] p-7 text-white shadow-[0_26px_64px_-36px_rgba(47,128,255,0.8)] lg:col-span-12 sm:p-8">
            <div className="grid items-center gap-7 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <ChartNoAxesCombined className="mb-6 text-[#a9e98d]" size={27} />
                <h3 className="text-2xl font-bold tracking-tight">Evolução para enxergar o que está construindo.</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-blue-100">
                  Acompanhe o edital e compare os giros do ciclo com o que você
                  realmente estudou.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-left text-xs font-semibold">
                {["Edital", "Ciclo", "Revisões"].map((label, index) => (
                  <div key={label} className="border-t border-white/25 pt-4">
                    <span className="block text-blue-200">{label}</span>
                    <motion.div
                      initial={reduced ? false : { scaleX: 0.25 }}
                      whileInView={reduced ? undefined : { scaleX: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-3 h-2 origin-left rounded-full bg-[#a9e98d]"
                      style={{ width: `${[72, 53, 38][index]}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function LandingComparison() {
  return (
    <section className={`${sectionClass} py-20 lg:py-28`}>
      <Reveal>
        <h2 className={`${headingClass} max-w-2xl`}>
          Organizar tudo sozinho
          <br />
          não precisa ser outra matéria.
        </h2>
        <p className="mt-5 max-w-xl leading-7 text-white/60">
          Você continua no comando. O vouRevisar conecta as partes da
          preparação.
        </p>
      </Reveal>
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#0c120f]">
        <div className="hidden grid-cols-3 border-b border-white/10 bg-white/[0.035] px-6 py-5 text-sm font-bold md:grid">
          <span>Na sua preparação</span>
          <span className="text-white/42">Organização manual</span>
          <span className="text-[#8bdd64]">Com o vouRevisar</span>
        </div>
        {comparison.map(([label, before, after]) => (
          <div
            key={label}
            className="grid gap-3 border-b border-white/10 px-5 py-5 last:border-0 md:grid-cols-3 md:gap-6 md:px-6"
          >
            <h3 className="text-sm font-bold">{label}</h3>
            <p className="text-sm leading-6 text-white/42">
              <span className="block text-xs md:hidden">
                Organização manual
              </span>
              {before}
            </p>
            <p className="flex gap-2 text-sm font-semibold leading-6">
              <Check className="mt-1 shrink-0 text-[#70dc51]" size={16} />
              {after}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingDevices() {
  return (
    <section className="overflow-hidden border-y border-white/10 bg-[#0b1510] py-20">
      <div
        className={`${sectionClass} grid items-center gap-12 lg:grid-cols-[0.75fr_1.25fr]`}
      >
        <Reveal>
          <h2 className={headingClass}>
            Seu estudo vai
            <br />
            com você.
          </h2>
          <p className="mt-5 leading-7 text-white/60">
            Na mesa, no intervalo ou onde a rotina permitir. Acesse pelo
            computador, tablet ou celular.
          </p>
          <p className="mt-6 text-sm font-semibold text-[#8bdd64]">
            Uma conta. A mesma preparação.
          </p>
        </Reveal>
        <Reveal className="relative pb-24 pr-5 sm:pr-8">
          <div className="rounded-2xl bg-[#1a211d] p-2 pb-3 shadow-[0_28px_70px_-34px_rgba(99,223,22,0.45)]">
            <ProductPreview />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-3 hidden h-[220px] w-[280px] overflow-hidden rounded-[20px] border-[7px] border-[#1a211d] bg-white shadow-xl sm:block"
          >
            <fieldset
              disabled
              className="w-[410px] origin-top-left scale-[0.65] [&_button]:pointer-events-none"
            >
              <ProductPreview compact view={4} />
            </fieldset>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-0 h-[260px] w-[150px] overflow-hidden rounded-[24px] border-[6px] border-[#1a211d] bg-white shadow-xl"
          >
            <fieldset
              disabled
              className="w-[345px] origin-top-left scale-[0.4]"
            >
              <ProductPreview compact />
            </fieldset>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingQuestions() {
  return (
    <section className={`${sectionClass} py-20 lg:py-24`}>
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className={headingClass}>
            Ficou com
            <br />
            alguma dúvida?
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/58">
            Começar deve ser simples.
            <br />
            Se precisar, estamos por aqui.
          </p>
          <a
            href={getSupportEmailUrl("Dúvida sobre o vouRevisar")}
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#8bdd64]"
          >
            <Mail size={17} />
            Fale com o suporte
            <ArrowRight size={16} />
          </a>
        </div>
        <Accordion type="single" collapsible>
          {faqs.map(([question, answer], i) => (
            <AccordionItem
              value={`faq-${i}`}
              key={question}
              className="border-white/10"
            >
              <AccordionTrigger className="py-5 text-left text-sm font-semibold text-white hover:no-underline">
                {question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-white/58">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function LandingTrust() {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <div className="rounded-2xl bg-[#eaf5e7] p-6">
        <Check className="mb-3 text-green-800" />
        <h3 className="font-bold">7 dias para experimentar.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Teste gratuito, sem cartão e sem cobrança automática. Você decide se
          quer continuar.
        </p>
      </div>
      <div className="rounded-2xl bg-slate-100 p-6">
        <ShieldCheck className="mb-3 text-blue-700" />
        <h3 className="font-bold">Uma escolha com tranquilidade.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Contratações elegíveis têm direito de arrependimento em até 7 dias.{" "}
          <Link
            to="/cancelamento-e-reembolso"
            className="font-semibold text-blue-700 underline underline-offset-4"
          >
            Confira a política.
          </Link>
        </p>
      </div>
    </div>
  );
}
