import { CreditCard, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export type AccountSection = 'perfil' | 'assinatura' | 'configuracoes';

const sections = [
  { value: 'perfil', label: 'Perfil', icon: User, to: '/conta?tab=perfil' },
  { value: 'assinatura', label: 'Assinatura', icon: CreditCard, to: '/conta/assinatura' },
  { value: 'configuracoes', label: 'Configurações', icon: Settings, to: '/conta?tab=configuracoes' },
] as const;

export const AccountNavigation = ({ current }: { current: AccountSection }) => (
  <nav
    aria-label="Seções da conta"
    className="mb-6 grid h-auto w-full grid-cols-3 rounded-xl border border-border/60 bg-black/5 p-1 dark:bg-white/5 sm:w-fit"
  >
    {sections.map(({ value, label, icon: Icon, to }) => {
      const active = current === value;

      return (
        <Link
          key={value}
          to={to}
          aria-current={active ? 'page' : undefined}
          className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:px-4 ${
            active
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
          }`}
        >
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      );
    })}
  </nav>
);
