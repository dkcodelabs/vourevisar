import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicSurface } from "./PublicSurface";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <PublicSurface>
      <div className="grid min-h-full md:grid-cols-[0.85fr_1.15fr] xl:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-[#dbe5ed] md:block">
          <img
            src="/images/marketing/study-session.jpg"
            alt="Estudante concentrada em sua preparação, escrevendo ao lado do computador"
            className="absolute inset-0 h-full w-full object-cover object-[38%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101f32]/90 via-transparent to-white/30" />
          <Link
            to="/"
            className="absolute left-10 top-9 rounded-xl bg-white/95 px-4 py-3"
            aria-label="Voltar ao início"
          >
            <BrandLogo motion="entrance" />
          </Link>
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-16">
            <p className="mb-5 flex items-center gap-2 text-sm font-medium text-green-200">
              <Check size={18} />
              Um próximo passo. Todos os dias.
            </p>
            <h2 className="max-w-lg text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              Sua aprovação começa na sua rotina.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-200">
              Edital, ciclo, treino e revisão. Mais clareza para dedicar energia
              ao que importa: estudar.
            </p>
          </div>
        </aside>
        <main className="flex min-w-0 flex-col bg-white px-6 py-7 sm:px-10">
          <Link
            to="/"
            className="mb-8 inline-flex w-fit min-h-10 items-center gap-2 text-sm text-slate-600 hover:text-blue-700"
          >
            <ArrowLeft size={16} />
            Voltar ao início
          </Link>
          <div className="mx-auto my-auto w-full max-w-[420px] pb-8">
            <div className="mb-8 md:hidden">
              <BrandLogo motion="entrance" />
            </div>
            {children}
          </div>
        </main>
      </div>
    </PublicSurface>
  );
}
