import { CreditCard, Settings, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AccountSubscriptionTab } from '@/components/account/AccountSubscriptionTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Profile from '@/pages/Profile';
import SettingsPage from '@/pages/Settings';

const VALID_TABS = ['perfil', 'assinatura', 'configuracoes'] as const;
type AccountTab = (typeof VALID_TABS)[number];

const isAccountTab = (tab: string | null): tab is AccountTab =>
  tab === 'perfil' || tab === 'assinatura' || tab === 'configuracoes';

const Account = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const currentTab: AccountTab = isAccountTab(requestedTab) ? requestedTab : 'perfil';

  const handleTabChange = (value: string) => {
    if (isAccountTab(value)) {
      setSearchParams({ tab: value });
    }
  };

  return (
    <div className="w-full pb-10">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl border border-border/60 bg-black/5 p-1 dark:bg-white/5 sm:w-auto">
            <TabsTrigger
              value="perfil"
              className="gap-2 rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-background"
            >
              <User size={15} />
              Perfil
            </TabsTrigger>
            <TabsTrigger
              value="assinatura"
              className="gap-2 rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-background"
            >
              <CreditCard size={15} />
              Assinatura
            </TabsTrigger>
            <TabsTrigger
              value="configuracoes"
              className="gap-2 rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-background"
            >
              <Settings size={15} />
              Configurações
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="perfil" className="m-0 outline-none">
          <Profile />
        </TabsContent>
        <TabsContent value="assinatura" className="m-0 outline-none">
          <AccountSubscriptionTab />
        </TabsContent>
        <TabsContent value="configuracoes" className="m-0 outline-none">
          <SettingsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Account;
