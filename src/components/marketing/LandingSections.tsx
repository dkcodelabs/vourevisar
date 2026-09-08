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
          <span className="text-[#1765dc]">Tudo se conecta.</span>
        </h2>
        <p className="mt-5 max-w-xl leading-7 text-slate-600">
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
                className="border-t border-slate-200 py-7 lg:min-h-[220px] lg:py-10"
              >
                <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-[#1765dc]">
                  <Icon size={19} />
                  <span>{step.short}</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
                  {step.text}
                </p>
              </motion.article>
            );
          })}
          <div className="mt-2 lg:hidden">
            <ProductPreview compact view={active} />
            <p className="mt-4 text-center text-xs font-medium text-slate-600">
              {journey[active].detail}
            </p>
          </div>
        </div>
        <div className="hidden lg:sticky lg:top-28 lg:block">
          <ProductPreview view={active} />
          <p className="mt-6 text-center text-sm font-medium text-slate-600">
            {journey[active].detail}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {journey.map((step, i) => (
              <span
                key={step.short}
                className={`h-1 rounded-full transition-all duration-500 motion-reduce:transition-none ${i === active ? "w-12 bg-blue-600" : "w-5 bg-slate-200"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingResources() {
  return (
    <section id="recursos" className="scroll-mt-24 bg-[#edf3fb] py-20 lg:py-24">
      <div className={sectionClass}>
        <Reveal className="mb-10 max-w-2xl">
          <h2 className={headingClass}>
            Seu esforço merece
            <br />
            uma rotina bem organizada.
          </h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Reveal className="overflow-hidden rounded-2xl bg-white md:col-span-2">
            <div className="grid h-full sm:grid-cols-[1fr_0.85fr]">
              <div className="p-7 sm:p-9">
                <Layers className="mb-8 text-blue-600" size={26} />
                <h3 className="text-2xl font-bold tracking-tight">
                  Um edital.
                  <br />
                  Muitas próximas conquistas.
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Catálogo, PDF com IA ou criação manual. Seu conteúdo vira
                  matérias, tópicos e um ciclo que você consegue percorrer.
                </p>
              </div>
              <img
                src="/images/marketing/study-session.jpg"
                width="1536"
                height="1024"
                loading="lazy"
                alt="Estudante organizando sua preparação"
                className="h-56 w-full object-cover object-[35%_center] transition-transform duration-700 hover:scale-[1.035] motion-reduce:transform-none sm:h-full"
              />
            </div>
          </Reveal>
          <Reveal className="rounded-2xl bg-[#dfeaff] p-7 sm:p-9">
            <Brain className="mb-8 text-blue-700" size={26} />
            <h3 className="text-2xl font-bold tracking-tight">
              Aprender.
              <br />
              Lembrar. Praticar.
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Questões e flashcards para trabalhar o conteúdo do seu edital e
              reconhecer o que precisa de mais atenção.
            </p>
            <div className="mt-8 flex gap-2">
              {["Questões", "Flashcards"].map((label) => (
                <span
                  key={label}
                  className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold"
                >
                  {label}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal className="rounded-2xl bg-white p-7">
            <RotateCcw className="mb-5 text-blue-600" size={25} />
            <h3 className="text-xl font-bold">Revisão com continuidade.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Registre a dificuldade e encontre suas próximas revisões
              organizadas pelo histórico.
            </p>
          </Reveal>
          <Reveal className="rounded-2xl bg-white p-7 lg:col-span-2">
            <div className="grid items-center gap-6 sm:grid-cols-2">
              <div>
                <ChartNoAxesCombined className="mb-5 text-blue-600" size={25} />
                <h3 className="text-xl font-bold">Veja o que já construiu.</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Acompanhe seu edital e compare os giros do ciclo com dados do
                  seu próprio estudo.
                </p>
              </div>
              <div
                className="rounded-xl bg-[#edf3fb] p-5"
                aria-label="Resumo demonstrativo de evolução"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Progresso do edital
                  </p>
                  <span className="text-[11px] font-medium text-slate-500">
                    Prévia demonstrativa
                  </span>
                </div>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#1765dc]">
                  30%
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full w-[30%] rounded-full bg-[#1765dc]" />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  24 tópicos iniciados · 6 concluídos
                </p>
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
        <p className="mt-5 max-w-xl leading-7 text-slate-600">
          Você continua no comando. O vouRevisar conecta as partes da
          preparação.
        </p>
      </Reveal>
      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-3 border-b border-slate-200 bg-slate-50 px-6 py-5 text-sm font-bold md:grid">
          <span>Na sua preparação</span>
          <span className="text-slate-500">Organização manual</span>
          <span className="text-blue-700">Com o vouRevisar</span>
        </div>
        {comparison.map(([label, before, after]) => (
          <div
            key={label}
            className="grid gap-3 border-b border-slate-100 px-5 py-5 last:border-0 md:grid-cols-3 md:gap-6 md:px-6"
          >
            <h3 className="text-sm font-bold">{label}</h3>
            <p className="text-sm leading-6 text-slate-500">
              <span className="block text-[11px] md:hidden">
                Organização manual
              </span>
              {before}
            </p>
            <p className="flex gap-2 text-sm font-semibold leading-6">
              <Check className="mt-1 shrink-0 text-green-700" size={16} />
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
    <section className="overflow-hidden bg-[#edf3fb] py-20">
      <div
        className={`${sectionClass} grid items-center gap-12 lg:grid-cols-[0.75fr_1.25fr]`}
      >
        <Reveal>
          <h2 className={headingClass}>
            Seu estudo vai
            <br />
            com você.
          </h2>
          <p className="mt-5 leading-7 text-slate-600">
            Na mesa, no intervalo ou onde a rotina permitir. Acesse pelo
            computador, tablet ou celular.
          </p>
          <p className="mt-6 text-sm font-semibold text-blue-700">
            Uma conta. A mesma preparação.
          </p>
        </Reveal>
        <Reveal className="relative pb-24 pr-5 sm:pr-8">
          <div className="rounded-2xl bg-slate-800 p-2 pb-3 shadow-xl">
            <ProductPreview />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-3 hidden h-[220px] w-[280px] overflow-hidden rounded-[20px] border-[7px] border-slate-800 bg-white shadow-xl sm:block"
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
            className="pointer-events-none absolute bottom-0 right-0 h-[260px] w-[150px] overflow-hidden rounded-[24px] border-[6px] border-slate-800 bg-white shadow-xl"
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
          <p className="mt-5 text-sm leading-7 text-slate-600">
            Começar deve ser simples.
            <br />
            Se precisar, estamos por aqui.
          </p>
          <a
            href={getSupportEmailUrl("Dúvida sobre o vouRevisar")}
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-700"
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
              className="border-slate-200"
            >
              <AccordionTrigger className="py-5 text-left text-sm font-semibold hover:no-underline">
                {question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-slate-600">
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
      <div className="rounded-2xl bg-[#edf5e9] p-6">
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
