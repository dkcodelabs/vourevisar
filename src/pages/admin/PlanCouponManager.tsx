import React, { useState, useEffect } from 'react';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { PlanConfig } from '@/hooks/usePlanConfigs';
import { createAdminCoupon, fetchAdminCoupons, fetchAdminPlans, toggleAdminCoupon, updateAdminPlan, type AdminCoupon } from '@/services/adminPlanCouponService';

type Coupon = AdminCoupon;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Erro desconhecido';

export default function PlanCouponManager() {
  const { user } = useAuth();
  const { isOwner, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'plans' | 'coupons'>('plans');

  // Plan State
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Coupon State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  // Forms State
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState<{
    code: string;
    discount_type: 'PERCENTAGE' | 'FIXED';
    discount_value: number;
    max_uses: number | '';
    valid_until: string | '';
  }>({
    code: '',
    discount_type: 'PERCENTAGE',
    discount_value: 0,
    max_uses: '',
    valid_until: ''
  });
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isOwner) {
      navigate('/dashboard');
      toastGate.notifyError('Acesso negado. Apenas proprietários podem acessar esta área.', 'PAGES-ADMIN-PLANCOUPONMANAGER-01', { severity: 'medium' });
    }
  }, [isOwner, roleLoading, navigate]);

  useEffect(() => {
    if (isOwner) {
      fetchPlans();
      fetchCoupons();
    }
  }, [isOwner]);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      setPlans(await fetchAdminPlans());
    } catch (err: unknown) {
      toastGate.notifyError(getErrorMessage(err), 'FETCH_PLANS');
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      setCoupons(await fetchAdminCoupons());
    } catch (err: unknown) {
      toastGate.notifyError(getErrorMessage(err), 'FETCH_COUPONS');
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleUpdatePlan = async (plan: PlanConfig) => {
    setSavingPlan(plan.id);
    try {
      await updateAdminPlan(plan);
      toast.success('Plano atualizado com sucesso!');
      fetchPlans();
    } catch (err: unknown) {
      toastGate.notifyError(getErrorMessage(err), 'UPDATE_PLAN');
    } finally {
      setSavingPlan(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || newCoupon.discount_value <= 0) {
      toast.warning('Preencha os dados do cupom corretamente.');
      return;
    }
    
    setSavingCoupon(true);
    try {
      const payload = {
        code: newCoupon.code.toUpperCase(),
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        max_uses: newCoupon.max_uses === '' ? null : Number(newCoupon.max_uses),
        valid_until: newCoupon.valid_until === '' ? null : new Date(newCoupon.valid_until).toISOString(),
        active: true
      };

      await createAdminCoupon(payload);
      
      toast.success('Cupom criado com sucesso!');
      setIsCouponModalOpen(false);
      setNewCoupon({ code: '', discount_type: 'PERCENTAGE', discount_value: 0, max_uses: '', valid_until: '' });
      fetchCoupons();
    } catch (err: unknown) {
      toastGate.notifyError(getErrorMessage(err), 'CREATE_COUPON');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      await toggleAdminCoupon(coupon.id, !coupon.active);
      toast.success(`Cupom ${!coupon.active ? 'ativado' : 'desativado'}!`);
      fetchCoupons();
    } catch (err: unknown) {
      toastGate.notifyError(getErrorMessage(err), 'TOGGLE_COUPON');
    }
  };

  if (roleLoading) {
    return <div className="p-8 text-center text-slate-400">Carregando permissões...</div>;
  }

  if (!isOwner) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gerenciar Planos e Cupons</h1>
        <p className="text-muted-foreground">Área exclusiva para proprietários configurarem os preços do sistema e gerarem cupons de desconto.</p>
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'plans' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-white/5'
          }`}
        >
          Planos de Assinatura
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'coupons' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-white/5'
          }`}
        >
          Cupons de Desconto
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold mb-4">Configuração de Planos</h2>
            {loadingPlans ? (
              <div className="animate-pulse flex gap-4">
                <div className="h-40 bg-white/5 rounded-xl w-full border border-white/10"></div>
                <div className="h-40 bg-white/5 rounded-xl w-full border border-white/10"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {plans.map((plan) => (
                  <PlanEditorCard 
                    key={plan.id} 
                    plan={plan} 
                    onSave={handleUpdatePlan} 
                    isSaving={savingPlan === plan.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Gerenciamento de Cupons</h2>
              <button 
                onClick={() => setIsCouponModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
              >
                + Novo Cupom
              </button>
            </div>
            
            {loadingCoupons ? (
              <div className="animate-pulse h-32 bg-white/5 rounded-xl w-full border border-white/10"></div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-background/50">
                <p className="text-muted-foreground">Nenhum cupom gerado ainda.</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Código</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Limite</th>
                      <th className="px-4 py-3 font-medium">Validade</th>
                      <th className="px-4 py-3 font-medium text-center">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                        <td className="px-4 py-3">{c.discount_type === 'PERCENTAGE' ? 'Porcentagem (%)' : 'Fixo (R$)'}</td>
                        <td className="px-4 py-3 font-medium">
                          {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}%` : `R$ ${c.discount_value.toFixed(2).replace('.', ',')}`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.max_uses ? `${c.uses_count} / ${c.max_uses}` : `${c.uses_count} (Ilimitado)`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.valid_until ? new Date(c.valid_until).toLocaleDateString('pt-BR') : 'Sem validade'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${c.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {c.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleToggleCoupon(c)}
                            className={`font-medium text-xs px-2 py-1 rounded transition-colors ${c.active ? 'text-red-400 hover:text-red-300 bg-red-400/10' : 'text-green-400 hover:text-green-300 bg-green-400/10'}`}
                          >
                            {c.active ? 'Desativar' : 'Ativar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {isCouponModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold">Criar Novo Cupom</h3>
              <p className="text-sm text-muted-foreground mt-1">Configure as regras de desconto e validade.</p>
            </div>
            
            <form onSubmit={handleCreateCoupon} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Código do Cupom</label>
                <input 
                  required 
                  type="text" 
                  value={newCoupon.code}
                  onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono uppercase"
                  placeholder="EX: VOUAPROVAR20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Desconto</label>
                  <select 
                    value={newCoupon.discount_type}
                    onChange={e => setNewCoupon(p => ({ ...p, discount_type: e.target.value as 'PERCENTAGE'|'FIXED' }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm"
                  >
                    <option value="PERCENTAGE">Porcentagem (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Valor do Desconto</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={newCoupon.discount_value}
                    onChange={e => setNewCoupon(p => ({ ...p, discount_value: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Limite de Usos Totais</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newCoupon.max_uses}
                    onChange={e => setNewCoupon(p => ({ ...p, max_uses: e.target.value ? Number(e.target.value) : '' }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm"
                    placeholder="Ilimitado"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Data de Validade</label>
                  <input 
                    type="date"
                    value={newCoupon.valid_until}
                    onChange={e => setNewCoupon(p => ({ ...p, valid_until: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 font-medium text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >Cancelar</button>
                <button 
                  type="submit"
                  disabled={savingCoupon}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center min-w-24 disabled:opacity-50 transition-all"
                >
                  {savingCoupon ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanEditorCard({ plan, onSave, isSaving }: { plan: PlanConfig, onSave: (p: PlanConfig) => void, isSaving: boolean }) {
  const [editedPlan, setEditedPlan] = useState<PlanConfig>({ ...plan });

  useEffect(() => {
    setEditedPlan({ ...plan });
  }, [plan]);

  const handleChange = (field: keyof PlanConfig, value: unknown) => {
    setEditedPlan(prev => ({ ...prev, [field]: value }));
  };

  const handleFeaturesChange = (text: string) => {
    // Basic comma separated parsing for features
    const featuresList = text.split('\n').map(s => s.trim()).filter(Boolean);
    handleChange('features', featuresList);
  };

  const isDirty = JSON.stringify(plan) !== JSON.stringify(editedPlan);

  return (
    <div className={`p-5 rounded-2xl border ${editedPlan.active ? 'border-border bg-background/50' : 'border-red-500/30 bg-red-500/5'} flex flex-col gap-4 relative`}>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Status:</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={editedPlan.active} 
            onChange={(e) => handleChange('active', e.target.checked)} 
          />
          <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>

      <div>
        <h3 className="text-lg font-bold">Plano: {plan.slug === 'annual' ? 'Anual' : 'Mensal'}</h3>
        <p className="text-xs text-muted-foreground font-mono">ID: {plan.id}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome Exibido</label>
          <input 
            type="text" 
            value={editedPlan.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Valor Final (R$)</label>
          <input 
            type="number" 
            step="0.01"
            value={editedPlan.value} 
            onChange={(e) => handleChange('value', parseFloat(e.target.value))} 
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Subtítulo / Descrição</label>
        <input 
          type="text" 
          value={editedPlan.description || ''} 
          onChange={(e) => handleChange('description', e.target.value)} 
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          placeholder="Ex: Acesso completo sem fidelidade"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Badge MKT (ex: Mais Vendido)</label>
        <input 
          type="text" 
          value={editedPlan.badge || ''} 
          onChange={(e) => handleChange('badge', e.target.value)} 
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          placeholder="Deixe em branco para remover"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Benefícios (1 por linha)</label>
        <textarea 
          value={((editedPlan.features as string[]) || []).join('\n')} 
          onChange={(e) => handleFeaturesChange(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm max-h-40 min-h-20"
          placeholder={"Acesso Total\nSuporte 24h\nSem Fidelidade"}
        />
      </div>

      <div className="mt-2 pt-4 border-t border-border flex justify-end gap-2">
        {isDirty && (
          <button 
            type="button" 
            onClick={() => setEditedPlan({ ...plan })}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
          >
            Descartar
          </button>
        )}
        <button
          onClick={() => onSave(editedPlan)}
          disabled={!isDirty || isSaving}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center justify-center min-w-28 disabled:opacity-50 transition-all"
        >
          {isSaving ? (
             <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
