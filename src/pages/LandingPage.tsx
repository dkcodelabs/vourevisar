import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="bg-brand-light text-slate-800 overflow-x-hidden font-sans">
      {/* NAVBAR */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* LOGO APLICADO */}
            <div className="flex-shrink-0 flex items-center cursor-pointer">
              <img src="/logo.png" alt="vouRevisar Logo" className="h-10 w-auto" />
            </div>

            {/* MENU DESKTOP */}
            <div className="hidden md:flex space-x-8 items-center">
              <a href="#funcionalidades" className="text-slate-600 hover:text-brand-blue font-medium transition">Como funciona</a>
              <a href="#precos" className="text-slate-600 hover:text-brand-blue font-medium transition">Planos</a>
              <Link to="/login" className="text-slate-900 font-bold hover:text-brand-blue transition">Entrar</Link>
              <Link to="/login" className="bg-brand-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold transition shadow-lg shadow-blue-500/30">
                Começar Grátis
              </Link>
            </div>

            {/* MENU MOBILE BUTTON */}
            <div className="md:hidden flex items-center">
              <button className="text-slate-600 hover:text-slate-900 focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
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
              O <strong>vouRevisar</strong> organiza os seus estudos automaticamente. Use repetição espaçada e flashcards para garantir que nunca mais esquece o que aprendeu.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-forwards">
              <Link to="/login" className="bg-brand-blue hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-xl font-bold transition shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                Criar conta grátis
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-lg px-8 py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Ver demonstração
              </button>
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
                  98%
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Retenção</p>
                  <p className="text-sm font-bold text-slate-800">Alta Performance</p>
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
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">O método cientificamente comprovado para transformar informação em memória de longo prazo.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-blue-50 transition duration-300 border border-slate-100 hover:border-blue-100">
              <div className="w-14 h-14 bg-blue-100 text-brand-blue rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                {/* Ícone Ciclo */}
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Ciclo de Repetição</h3>
              <p className="text-slate-600">O nosso algoritmo sabe exatamente quando você está prestes a esquecer e agenda a revisão no momento certo.</p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-green-50 transition duration-300 border border-slate-100 hover:border-green-100">
              <div className="w-14 h-14 bg-green-100 text-brand-green rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                {/* Ícone Check */}
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Check de Progresso</h3>
              <p className="text-slate-600">Visualize o seu avanço. Cada matéria revisada é um "check" verde no seu painel de conquistas.</p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-purple-50 transition duration-300 border border-slate-100 hover:border-purple-100">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Biblioteca Inteligente</h3>
              <p className="text-slate-600">Organize os seus resumos, PDFs e notas num único lugar, integrados diretamente com o seu calendário.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Investimento Acessível</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">Menos que um café por mês para garantir sua aprovação.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-brand-blue/30 transition-all shadow-sm hover:shadow-md">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Mensal</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-slate-900">R$ 9,90</span>
                <span className="text-slate-500">/mês</span>
              </div>
              <p className="text-slate-600 mb-8">Para quem quer flexibilidade total.</p>
              <ul className="space-y-4 mb-8">
                {[
                  "Acesso completo a todas as funções",
                  "Sem fidelidade, cancele quando quiser",
                  "Suporte prioritário",
                  "7 dias de teste grátis"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-brand-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login" className="block w-full">
                <button className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-brand-blue hover:text-brand-blue transition">
                  Escolher Mensal
                </button>
              </Link>
            </div>

            {/* Annual Plan */}
            <div className="p-8 rounded-3xl bg-white border-2 border-brand-blue relative shadow-xl shadow-blue-900/5 transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-blue text-white text-sm font-bold rounded-full shadow-lg">
                MAIS POPULAR
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Anual</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-slate-900">R$ 99,90</span>
                <span className="text-slate-500">/ano</span>
              </div>
              <p className="text-slate-600 mb-8">Economize e garanta seu ano de estudos.</p>
              <ul className="space-y-4 mb-8">
                {[
                  "Tudo do plano mensal",
                  "2 meses grátis (economize 16%)",
                  "Acesso antecipado a novidades",
                  "Badge exclusivo de assinante",
                  "7 dias de teste grátis"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-brand-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login" className="block w-full">
                <button className="w-full h-12 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 transition">
                  Começar Teste Grátis
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=')]"></div>

        <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para o seu próximo "check" verde?</h2>
          <p className="text-slate-300 text-lg mb-8">Junte-se a milhares de estudantes que trocaram a ansiedade pela organização.</p>
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
          <div className="opacity-90 hover:opacity-100 transition duration-300">
            <img src="/logo.png" alt="vouRevisar Logo" className="h-8 w-auto" />
          </div>

          <div className="flex gap-6 text-slate-500 text-sm font-medium">
            <a href="#" className="hover:text-brand-blue">Sobre</a>
            <a href="#" className="hover:text-brand-blue">Privacidade</a>
            <a href="#" className="hover:text-brand-blue">Termos</a>
            <a href="#" className="hover:text-brand-blue">Contacto</a>
          </div>

          <p className="text-slate-400 text-sm">© 2023 vouRevisar. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
