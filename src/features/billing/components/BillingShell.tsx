import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BillingArtwork } from '@/features/billing/components/BillingArtwork';

interface BillingShellProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  backTo?: string;
  backLabel?: string;
  compactArtwork?: boolean;
  layout?: 'content' | 'checkout';
}

export const BillingShell = ({
  children,
  eyebrow = 'Assinatura vouRevisar',
  title,
  description,
  backTo = '/planos',
  backLabel = 'Voltar aos planos',
  compactArtwork = false,
  layout = 'content',
}: BillingShellProps) => {
  if (layout === 'checkout') {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f8f6ff] text-[#17122b]">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#c9bbff]/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-[#9edbff]/35 blur-3xl" />
        <div className="relative mx-auto grid min-h-screen max-w-[1440px] gap-8 px-5 py-5 sm:px-8 sm:py-7 lg:grid-cols-[minmax(0,0.82fr)_minmax(32rem,0.98fr)] lg:items-center lg:px-10 xl:gap-14 xl:px-14">
          <section className="min-w-0 self-center lg:py-4">
            <Link
              to={backTo}
              className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full px-1 text-sm font-extrabold text-[#4f4669] transition-colors hover:text-[#5b47eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47eb]"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
            <div className="max-w-[34rem]">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#6652ee]">{eyebrow}</p>
              <h1 className="text-3xl font-black leading-[1.02] tracking-[-0.045em] sm:text-4xl xl:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-[32rem] text-sm font-medium leading-6 text-[#655d79] sm:text-base sm:leading-7">
                {description}
              </p>
            </div>
            <div className="mt-7 hidden max-w-[26rem] lg:block">
              <BillingArtwork nextStep="Finalizar assinatura" />
            </div>
          </section>
          <section className="mx-auto w-full max-w-[42rem] self-center">{children}</section>
        </div>
      </main>
    );
  }

  return (
  <main className="relative min-h-screen overflow-hidden bg-[#f8f6ff] text-[#17122b]">
    <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#c9bbff]/35 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-[#9edbff]/35 blur-3xl" />
    <div className="relative mx-auto grid min-h-screen max-w-[1500px] items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 xl:gap-20">
      <section className={compactArtwork ? 'hidden lg:block' : 'order-2 lg:order-1'}>
        <BillingArtwork />
      </section>
      <section className="order-1 mx-auto w-full max-w-2xl lg:order-2">
        <Link
          to={backTo}
          className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-extrabold text-[#4f4669] transition-colors hover:text-[#5b47eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47eb]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#6652ee]">{eyebrow}</p>
        <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base font-medium leading-7 text-[#655d79]">{description}</p>
        <div className="mt-8">{children}</div>
      </section>
    </div>
  </main>
  );
};
