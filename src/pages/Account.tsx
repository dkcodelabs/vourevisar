import { Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AccountNavigation } from '@/components/account/AccountNavigation';
import Profile from '@/pages/Profile';
import SettingsPage from '@/pages/Settings';

const VALID_TABS = ['perfil', 'assinatura', 'configuracoes'] as const;
type AccountTab = (typeof VALID_TABS)[number];

const isAccountTab = (tab: string | null): tab is AccountTab =>
  tab === 'perfil' || tab === 'assinatura' || tab === 'configuracoes';

const Account = () => {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const currentTab: AccountTab = isAccountTab(requestedTab) ? requestedTab : 'perfil';

  return (
    <div className="w-full pb-10">
      <Tabs value={currentTab} className="w-full">
        <AccountNavigation current={currentTab} />

        <TabsContent value="perfil" className="m-0 outline-none">
          <Profile />
        </TabsContent>
        <TabsContent value="assinatura" className="m-0 outline-none">
          <Navigate to="/conta/assinatura" replace />
        </TabsContent>
        <TabsContent value="configuracoes" className="m-0 outline-none">
          <SettingsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Account;
