import type { ReactNode } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { legalProvider, isLegalProviderConfigured } from '@/config/legalProvider';
import { TracerLogo } from '@/components/ui/TracerLogo';

interface LegalDocumentLayoutProps {
  eyebrow: string;
  title: string;
  version: string;
  children: ReactNode;
}

export const LegalDocumentLayout = ({
  eyebrow,
  title,
  version,
  children,
}: LegalDocumentLayoutProps) => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Ir para a página inicial" className="inline-flex items-center gap-3">
            <TracerLogo className="h-9 w-9" />
            <span className="text-sm font-black">vouRevisar</span>
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        <article className="mt-8 rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{title}</h1>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">Versão {version}</p>

        {!isLegalProviderConfigured ? (
          <div role="alert" className="mt-6 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm font-bold leading-6">
            Este documento ainda não está pronto para publicação. A identificação legal do fornecedor precisa ser configurada antes de ativar o aceite contratual.
          </div>
        ) : (
          <dl className="mt-6 grid gap-3 rounded-2xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
            <div><dt className="font-black">Fornecedor</dt><dd className="mt-1 text-muted-foreground">{legalProvider.name}</dd></div>
            <div><dt className="font-black">CPF/CNPJ</dt><dd className="mt-1 text-muted-foreground">{legalProvider.registration}</dd></div>
            <div><dt className="font-black">Endereço</dt><dd className="mt-1 text-muted-foreground">{legalProvider.address}</dd></div>
            <div><dt className="font-black">Contato eletrônico</dt><dd className="mt-1 break-all text-muted-foreground">{legalProvider.email}</dd></div>
          </dl>
        )}

        <div className="prose prose-slate mt-8 max-w-none text-sm leading-7 dark:prose-invert prose-headings:font-black prose-a:text-primary">
          {children}
        </div>
        </article>
      </div>
    </main>
  );
};
