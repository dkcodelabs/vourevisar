import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowRight, Check, Menu } from "lucide-react";
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
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-[#f7f9fc]/95 backdrop-blur-lg">
        <nav
          aria-label="Navegação principal"
          className={`${sectionClass} flex h-[76px] items-center justify-between gap-5`}
        >
          <Link to="/" aria-label="vouRevisar início">
            <BrandLogo motion="entrance" className="!text-[#172033]" />
          </Link>
          <div className="hidden items-center gap-7 lg:flex">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-slate-600 hover:text-blue-700"
              >
                {label}
              </a>
            ))}
            <Link to="/login" className="text-sm font-bold">
              Entrar
            </Link>
            <TrialLink authenticated={Boolean(user)} compact />
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="grid size-11 place-items-center rounded-xl border border-slate-200 lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={21} />
              </button>
            </SheetTrigger>
            <SheetContent className="bg-white text-slate-900">
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
                <TrialLink
                  onClick={() => setMenuOpen(false)}
                  authenticated={Boolean(user)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </header>
      <main>
        <section
          ref={hero}
          className={`${sectionClass} grid items-center gap-12 pb-16 pt-12 lg:min-h-[690px] lg:grid-cols-[0.95fr_1.05fr] lg:py-20`}
        >
          <motion.div
            initial={false}
            animate={reduced ? undefined : { y: [15, 0], opacity: [0.7, 1] }}
            transition={{ duration: 0.7 }}
          >
            <p className="mb-6 text-sm font-semibold text-blue-700">
              Sua preparação em movimento
            </p>
            <h1 className="text-[clamp(2.5rem,4.4vw,3.65rem)] font-extrabold leading-[1.09] tracking-[-0.04em]">
              Seu edital vira
              <br />
              um plano.
              <br />
              <span className="text-[#1765dc]">
                Você sabe o que
                <br className="hidden xl:block" /> fazer agora.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
              Organize ciclo, treino e revisões em uma rotina que sempre entrega
              o próximo passo.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <TrialLink authenticated={Boolean(user)} />
              <a
                href="#funcionalidades"
                className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold"
              >
                Ver como funciona
                <ArrowRight size={16} />
              </a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <Check size={15} className="text-green-700" />7 dias grátis. Sem
              cartão. Sem cobrança automática.
            </p>
          </motion.div>
          <motion.div
            style={reduced ? undefined : { y: previewY }}
            className="relative rounded-[32px] bg-[#e9f0fc] p-3 sm:p-5"
          >
            <ProductPreview />
            <p className="mt-4 text-center text-[11px] text-slate-500">
              Componentes reais do produto, com dados de demonstração.
            </p>
          </motion.div>
        </section>
        <div className="border-y border-slate-200 bg-white">
          <div
            className={`${sectionClass} flex flex-wrap items-center justify-between gap-x-5 gap-y-4 py-6 text-sm font-semibold text-slate-500`}
          >
            {[
              "Edital organizado",
              "Ciclo de estudos",
              "Treino contextual",
              "Revisões espaçadas",
              "Evolução real",
            ].map((label) => (
              <span key={label} className="flex items-center gap-2">
                <Check size={15} className="text-green-700" />
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
          className={`${sectionClass} py-20 lg:py-24 [&_#precos]:scroll-mt-24`}
        >
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
        </section>
        <LandingQuestions />
        <section className="bg-[#e9f1ff] py-16 sm:py-20">
          <div
            className={`${sectionClass} flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center`}
          >
            <div>
              <h2 className={`${headingClass} max-w-2xl`}>
                Sua preparação já tem conteúdo.
                <br />
                <span className="text-[#1765dc]">
                  Dê a ela uma próxima ação.
                </span>
              </h2>
              <p className="mt-5 text-sm text-slate-600">
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
          <BrandLogo className="!text-[#172033]" />
          <div className="flex flex-wrap gap-5 text-xs text-slate-600">
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
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} vouRevisar. Cada próximo passo conta.
        </p>
      </footer>
      {!user && !heroVisible && !pricesVisible && !devicesVisible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:rounded-2xl sm:border sm:p-2"
        >
          <TrialLink compact className="w-full" />
        </motion.div>
      )}
    </PublicSurface>
  );
}
