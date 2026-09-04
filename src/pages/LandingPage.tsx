import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { PricingSection } from '@/components/PricingSection';
import { useStripeCatalog } from '@/features/billing/hooks/useStripeBilling';
import { buildStripePricingPlans } from '@/features/billing/utils/catalogPricing';

const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const catalog = useStripeCatalog();
  const pricingPlans = buildStripePricingPlans(catalog.data);

  const handlePlanClick = (plan: 'monthly' | 'annual', e?: React.MouseEvent) => {
    e?.preventDefault();
    if (user) {
      navigate(`/checkout?plan=${plan}`);
    } else {
      navigate('/login', {
        state: {
          from: {
            pathname: '/checkout',
            search: `?plan=${plan}`,
          },
        },
      });
    }
  };

  // Handle direct recovery links that might hit the root path instead of /reset-password
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const authError = searchParams.get('error') || hashParams.get('error');

    if (authError) {
      navigate(`/auth/callback${window.location.search}${window.location.hash}`);
      return;
    }

    const type = searchParams.get('type');
    const token_hash = searchParams.get('token_hash');

    // If it's a recovery link, redirect to the reset password page preserving the params
    if (type === 'recovery' && token_hash) {
      navigate(`/reset-password${window.location.search}`);
    }
  }, [navigate]);

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-brand-light text-slate-800 overflow-y-auto overflow-x-hidden font-sans">
      {/* NAVBAR */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* LOGO APLICADO */}
            <div className="flex-shrink-0 flex items-center h-10 cursor-pointer">
              <AnimatedLogo collapsed={false} className="h-full !text-slate-900" />
            </div>

            {/* MENU DESKTOP */}
            <div className="hidden md:flex space-x-8 items-center">
              <a href="#funcionalidades" className="text-slate-600 hover:text-brand-blue font-medium transition">Como funciona</a>
              <a href="#precos" className="text-slate-600 hover:text-brand-blue font-medium transition">Planos</a>

              {user ? (
                <Link to="/dashboard" className="bg-brand-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold transition shadow-lg shadow-blue-500/30">
                  Ir para o Painel
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-slate-900 font-bold hover:text-brand-blue transition">Entrar</Link>
                  <Link to="/login" className="bg-brand-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold transition shadow-lg shadow-blue-500/30">
                    Começar Grátis
                  </Link>
                </>
              )}
            </div>

            {/* MENU MOBILE BUTTON */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 animate-in slide-in-from-top-5 duration-200">
            <div className="px-4 pt-2 pb-6 space-y-2 shadow-xl">
              <a
                href="#funcionalidades"
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-brand-blue hover:bg-blue-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Como funciona
              </a>
              <a
                href="#precos"
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-brand-blue hover:bg-blue-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Planos
              </a>

              <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col items-center gap-3">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="bg-brand-blue hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Ir para o Painel
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="w-fit mx-auto text-center text-slate-700 font-bold border border-slate-200 px-8 py-4 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Entrar
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                    <Link
                      to="/login"
                      className="bg-brand-blue hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Começar Grátis
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 relative overflow-hidden">
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-green-100 blur-3xl opacity-50"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-brand-blue px-4 py-1.5 rounded-full text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="w-2 h-2 rounded-full bg-brand-blue"></span>
              A nova forma de aprender
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100 fill-mode-forwards">
              Pare de esquecer.<br />
              Comece a <span className="text-brand-blue relative inline-block">
                Revisar
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-green-400 opacity-60" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.00025 6.99997C58.5002 6.99999 48.5001 5.60001 48.5001 6.20002C82.5001 6.80003 134.5 7.40004 197 2.00005" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              </span>.
            </h1>

            <p className="text-xl text-slate-600 mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 fill-mode-forwards">
              O <strong>vouRevisar</strong> organiza os seus estudos automaticamente. Use a repetição espaçada para garantir que nunca mais esquece o que aprendeu.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-forwards">
              {user ? (
                <Link to="/dashboard" className="bg-brand-blue hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-xl font-bold transition shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                  Acessar meu Painel
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              ) : (
                <Link to="/login" className="bg-brand-blue hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-xl font-bold transition shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                  Criar conta grátis
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              )}

            </div>
          </div>

          {/* DASHBOARD PREVIEW (MOCKUP) */}
          <div className="mt-20 relative mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-forwards">
            <div className="bg-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-800">
              <div className="bg-white rounded-xl overflow-hidden aspect-[16/9] relative flex items-center justify-center bg-slate-50">
                {/* Mockup Simples do Interior da App */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-green/10 rounded-full mb-4">
                    <svg className="w-10 h-10 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Revisão Concluída!</h3>
                  <p className="text-slate-500">Você dominou 15 novos conceitos hoje.</p>
                  <div className="mt-6 flex justify-center gap-2">
                    <div className="h-2 w-32 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-green w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating Element */}
            <div className="absolute -right-4 -bottom-8 bg-white p-4 rounded-lg shadow-xl border border-slate-100 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-brand-blue font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Próxima ação</p>
                  <p className="text-sm font-bold text-slate-800">Clara e organizada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funcionalidades" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Tudo o que precisa para passar</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">Uma suíte completa de ferramentas desenhada para maximizar sua retenção e consistência.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Ciclo de Repetição */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-blue-50 transition duration-300 border border-slate-100 hover:border-blue-100">
              <div className="w-14 h-14 bg-blue-100 text-brand-blue rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Ciclo Automático</h3>
              <p className="text-slate-600">O sistema gera automaticamente as revisões para cada tópico estudado. Nunca mais perca tempo planejando o que revisar.</p>
            </div>

            {/* Feature 2: Consistência (Revisões do Dia) */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-green-50 transition duration-300 border border-slate-100 hover:border-green-100">
              <div className="w-14 h-14 bg-green-100 text-brand-green rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Consistência Diária</h3>
              <p className="text-slate-600">Saiba exatamente o que revisar hoje. O sistema destaca pendências e organiza sua fila para manter o ritmo constante.</p>
            </div>

            {/* Feature 3: Estatísticas Avançadas */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-purple-50 transition duration-300 border border-slate-100 hover:border-purple-100">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Estatísticas Avançadas</h3>
              <p className="text-slate-600">Acompanhe sua evolução com gráficos detalhados. Identifique pontos fortes e onde precisa focar mais energia.</p>
            </div>

            {/* Feature 4: Anotações e Resumos */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-orange-50 transition duration-300 border border-slate-100 hover:border-orange-100">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Caderno Digital</h3>
              <p className="text-slate-600">Adicione anotações e resumos diretamente em cada matéria. Centralize seu conhecimento em um só lugar.</p>
            </div>

            {/* Feature 5: Visualização de Progresso */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-pink-50 transition duration-300 border border-slate-100 hover:border-pink-100">
              <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Progresso Visual</h3>
              <p className="text-slate-600">O sistema registra visualmente seus dias de estudo e revisão. Transforme sua disciplina em uma corrente de conquistas.</p>
            </div>

            {/* Feature 6: Calendário */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-indigo-50 transition duration-300 border border-slate-100 hover:border-indigo-100">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Calendário Inteligente</h3>
              <p className="text-slate-600">Tenha uma visão clara do seu mês. Acompanhe atividades diárias e o panorama geral do seu progresso.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      {catalog.isError ? (
        <section id="precos" className="bg-white px-4 py-16 text-center">
          <p className="text-sm font-bold text-slate-700">Os preços oficiais estão temporariamente indisponíveis.</p>
          <button
            type="button"
            onClick={() => void catalog.refetch()}
            className="mt-4 rounded-xl bg-brand-blue px-5 py-3 text-xs font-black uppercase tracking-wider text-white"
          >
            Tentar novamente
          </button>
        </section>
      ) : (
        <PricingSection
          onPlanSelect={handlePlanClick}
          plans={pricingPlans}
          loading={catalog.isLoading}
        />
      )}

      {/* CTA FINAL */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=')]"></div>

        <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para o seu próximo "check" verde?</h2>
          <p className="text-slate-300 text-lg mb-8">Transforme um edital extenso em um plano claro para estudar, revisar e avançar todos os dias.</p>
          <Link to="/login" className="inline-block bg-brand-green hover:bg-green-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-900/50 transition transform hover:-translate-y-1">
            Começar Gratuitamente
          </Link>
          <p className="text-slate-400 text-sm mt-4">Não requer cartão de crédito.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">

          {/* Logo Pequeno (Rodapé) */}
          <div className="opacity-90 hover:opacity-100 transition duration-300 h-8">
            <AnimatedLogo collapsed={false} className="h-full !text-slate-900" />
          </div>

          <div className="flex gap-6 text-slate-500 text-sm font-medium">
            <Link to="/privacidade" className="hover:text-brand-blue">Privacidade</Link>
            <Link to="/termos" className="hover:text-brand-blue">Termos</Link>
            <Link to="/cancelamento-e-reembolso" className="hover:text-brand-blue">Cancelamento</Link>
            <Link to="/contato" className="hover:text-brand-blue">Contato</Link>
          </div>

          <p className="text-slate-400 text-sm">© 2023 vouRevisar. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
