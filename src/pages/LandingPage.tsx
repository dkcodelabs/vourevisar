import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowRight, Check, Menu, RotateCcw, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PricingSection } from "@/components/PricingSection";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useStripeCatalog } from "@/features/billing/hooks/useStripeBilling";
import { buildStripePricingPlans } from "@/features/billing/utils/catalogPricing";
import { PublicSurface } from "@/components/marketing/PublicSurface";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import {
  TrialLink,
  sectionClass,
  headingClass,
} from "@/components/marketing/MarketingPrimitives";
import {
  LandingJourney,
  LandingResources,
  LandingComparison,
  LandingDevices,
  LandingQuestions,
  LandingTrust,
} from "@/components/marketing/LandingSections";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const catalog = useStripeCatalog();
  const plans = buildStripePricingPlans(catalog.data);
  const [menuOpen, setMenuOpen] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const pricing = useRef<HTMLElement>(null);
  const devices = useRef<HTMLDivElement>(null);
  const heroVisible = useInView(hero);
  const pricesVisible = useInView(pricing);
  const devicesVisible = useInView(devices, { amount: 0.25 });
  const reduced = useReducedMotion();
  const scrollRoot = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRoot });
  const previewY = useTransform(scrollY, [0, 700], [0, -24]);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (query.get("error") || hash.get("error"))
      navigate(
        `/auth/callback${window.location.search}${window.location.hash}`,
      );
    else if (query.get("type") === "recovery" && query.get("token_hash"))
      navigate(`/reset-password${window.location.search}`);
  }, [navigate]);
  const links = [
    ["Como funciona", "#funcionalidades"],
    ["Recursos", "#recursos"],
    ["Planos", "#precos"],
  ];
  return (
    <PublicSurface scrollRef={scrollRoot} className="motion-safe:scroll-smooth">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b09]/96 backdrop-blur-xl">
        <nav
          aria-label="Navegação principal"
          className={`${sectionClass} flex h-[76px] items-center justify-between gap-5`}
        >
          <Link to="/" aria-label="vouRevisar início">
            <BrandLogo motion="entrance" className="!text-white" />
          </Link>
          <div className="hidden items-center gap-7 lg:flex">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-white/65 transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
            <Link to="/login" className="text-sm font-bold text-white">
              Entrar
            </Link>
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="grid size-11 place-items-center rounded-xl border border-white/15 text-white lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={21} />
              </button>
            </SheetTrigger>
            <SheetContent className="border-white/10 bg-[#0b110e] text-white">
              <SheetTitle>Menu vouRevisar</SheetTitle>
              <div className="mt-10 flex flex-col gap-6">
                {links.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="font-semibold"
                  >
                    {label}
                  </a>
                ))}
                <Link to="/login">Entrar</Link>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </header>
      <main>
        <section ref={hero} className="relative isolate overflow-hidden border-b border-white/10">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_42%,rgba(42,161,82,0.23),transparent_31%),radial-gradient(circle_at_54%_18%,rgba(47,128,255,0.12),transparent_26%)]" />
          <div aria-hidden="true" className="absolute -right-32 top-20 -z-10 size-[520px] rounded-full bg-[#34d058]/10 blur-[110px]" />
          <div className={`${sectionClass} grid items-center gap-8 pb-16 pt-10 sm:gap-12 sm:pb-20 sm:pt-16 lg:min-h-[760px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:py-24`}>
            <motion.div
              initial={false}
              animate={reduced ? undefined : { y: [15, 0], opacity: [0.7, 1] }}
              transition={{ duration: 0.7 }}
              className="relative z-10"
            >
            <h1 className="max-w-[720px] text-[clamp(2.65rem,5.75vw,5.6rem)] font-extrabold leading-[0.96] tracking-[-0.04em] text-white">
              Pare de esquecer.
              <br />
              Comece a{" "}
              <span className="relative inline-block text-[#70dc51]">
                Revisar
                <span
                  aria-hidden="true"
                  className="absolute -bottom-2 left-0 h-1 w-[104%] -rotate-1 rounded-full bg-[#2f80ff]"
                />
              </span>
              .
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/68 sm:mt-7 sm:text-lg sm:leading-8">
              Seu edital, ciclo, foco e revisões em uma rotina que deixa claro o
              que fazer agora — e por que continuar.
            </p>
            <div className="mt-6 flex flex-row items-center gap-4 sm:mt-8 sm:gap-5">
              <TrialLink authenticated={Boolean(user)} />
              <a
                href="#funcionalidades"
                className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-white/78 transition-colors hover:text-white"
              >
                Ver como funciona
                <ArrowRight size={16} />
              </a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-white/52 sm:mt-5">
              <Check size={15} className="text-[#70dc51]" />7 dias grátis. Sem
              cartão. Sem cobrança automática.
            </p>
            </motion.div>
            <motion.div
              style={reduced ? undefined : { y: previewY }}
              className="relative mx-auto w-full max-w-[660px] lg:mx-0"
            >
            <div aria-hidden="true" className="absolute inset-[12%_8%] rounded-full bg-[#35d05b]/25 blur-[80px]" />
            <div className="relative rounded-[28px] border border-white/10 bg-[#111713]/90 p-2 shadow-[0_38px_90px_-32px_rgba(0,0,0,0.92)] sm:p-3">
              <ProductPreview />
            </div>
            <motion.div
              animate={reduced ? undefined : { y: [0, -7, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-1 -top-4 block w-[148px] rounded-2xl border border-white/10 bg-[#151b17]/95 p-3 shadow-[0_22px_48px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:-left-3 sm:top-7 sm:w-48 sm:p-4 lg:-left-16"
            >
              <Target className="mb-3 text-[#70dc51]" size={20} />
              <p className="text-xs font-bold text-white">Próxima ação definida</p>
              <p className="mt-1 text-xs leading-5 text-white/55">Revisar Direito Constitucional</p>
            </motion.div>
            <motion.div
              animate={reduced ? undefined : { y: [0, 8, 0] }}
              transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-1 top-16 block w-[150px] rounded-2xl border border-[#70dc51]/20 bg-[#111713]/95 p-3 shadow-[0_22px_48px_-24px_rgba(53,208,91,0.55)] backdrop-blur-xl sm:bottom-4 sm:right-0 sm:top-auto sm:w-52 sm:p-4 lg:-right-8"
            >
              <div className="flex items-center justify-between gap-3">
                <RotateCcw className="text-[#70dc51]" size={19} />
                <span className="text-xs font-bold text-[#9deb78]">Hoje</span>
              </div>
              <p className="mt-3 text-xs font-bold text-white">Revisão no momento certo</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/4 rounded-full bg-[#70dc51]" />
              </div>
            </motion.div>
            <div className="absolute right-3 top-36 hidden size-11 place-items-center rounded-xl bg-[#2f80ff] text-white shadow-[0_14px_34px_-14px_rgba(47,128,255,0.9)] sm:right-4 sm:top-8 sm:grid">
              <Sparkles size={19} aria-hidden="true" />
            </div>
            <p className="relative mt-5 text-center text-xs text-white/45">
              Componentes reais do produto, com dados de demonstração.
            </p>
            </motion.div>
          </div>
        </section>
        <div className="border-b border-white/10 bg-[#0a100d]">
          <div
            className={`${sectionClass} flex flex-wrap items-center justify-between gap-x-5 gap-y-4 py-6 text-sm font-semibold text-white/52`}
          >
            {[
              "Edital organizado",
              "IA que estrutura seu conteúdo",
              "Ciclo e cronômetro de foco",
              "Treino com questões e flashcards",
              "Revisões e evolução",
            ].map((label) => (
              <span key={label} className="flex items-center gap-2">
                <Check size={15} className="text-[#70dc51]" />
                {label}
              </span>
            ))}
          </div>
        </div>
        <LandingJourney />
        <LandingResources />
        <LandingComparison />
        <div ref={devices}>
          <LandingDevices />
        </div>
        <section
          ref={pricing}
          className={`${sectionClass} py-20 lg:py-28 [&_#precos]:scroll-mt-24`}
        >
          <div className="rounded-[28px] bg-[#f7f9fc] p-5 text-[#172033] shadow-[0_30px_80px_-38px_rgba(53,208,91,0.35)] sm:p-8 lg:p-10">
            {catalog.isError || (!catalog.isLoading && !plans) ? (
            <div
              id="precos"
              className="scroll-mt-24 rounded-2xl bg-slate-100 p-8"
            >
              <h2 className="mb-3 text-2xl font-bold">Conheça os planos.</h2>
              <p>Os preços oficiais estão temporariamente indisponíveis.</p>
              <button
                onClick={() => void catalog.refetch()}
                className="mt-4 font-bold text-blue-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <PricingSection
              plans={plans}
              loading={catalog.isLoading}
              onPlanSelect={(plan) =>
                user
                  ? navigate(`/checkout?plan=${plan}`)
                  : navigate("/login?mode=register", {
                      state: {
                        from: {
                          pathname: "/checkout",
                          search: `?plan=${plan}`,
                        },
                      },
                    })
              }
            />
            )}
            <LandingTrust />
          </div>
        </section>
        <LandingQuestions />
        <section className="relative overflow-hidden border-y border-white/10 bg-[#0c1510] py-16 sm:py-20">
          <div aria-hidden="true" className="absolute right-0 top-0 size-72 rounded-full bg-[#70dc51]/10 blur-[90px]" />
          <div
            className={`${sectionClass} flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center`}
          >
            <div>
              <h2 className={`${headingClass} max-w-2xl`}>
                Sua preparação já tem conteúdo.
                <br />
                <span className="text-[#70dc51]">
                  Dê a ela uma próxima ação.
                </span>
              </h2>
              <p className="mt-5 text-sm text-white/60">
                Comece com o seu edital. O próximo passo vem junto.
              </p>
            </div>
            <TrialLink authenticated={Boolean(user)} />
          </div>
        </section>
      </main>
      <footer
        className={`${sectionClass} flex flex-col gap-8 py-10 pb-28 sm:pb-10`}
      >
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <BrandLogo className="!text-white" />
          <div className="flex flex-wrap gap-5 text-xs text-white/55">
            {[
              ["Privacidade", "/privacidade"],
              ["Termos", "/termos"],
              ["Cancelamento e reembolso", "/cancelamento-e-reembolso"],
              ["Contato", "/contato"],
            ].map(([label, to]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} vouRevisar. Cada próximo passo conta.
        </p>
      </footer>
      {!user && !heroVisible && !pricesVisible && !devicesVisible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a100d]/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:rounded-2xl sm:border sm:p-2"
        >
          <TrialLink compact className="w-full" />
        </motion.div>
      )}
    </PublicSurface>
  );
}
