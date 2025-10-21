# 🎨 Templates Prontos por Tipo de Negócio

## 🚀 Template: SaaS/Software

### Estrutura de Roles
```sql
-- Inserir roles específicas para SaaS
INSERT INTO user_roles (user_id, role) VALUES
('founder@empresa.com', 'owner'),
('cto@empresa.com', 'admin'),
('product-manager@empresa.com', 'admin'),
('senior-dev@empresa.com', 'moderator'),
('support-lead@empresa.com', 'moderator'),
('junior-dev@empresa.com', 'user');
```

### Dashboard SaaS
```tsx
import React from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { OwnerOnly, AdminOnly, ModeratorOnly } from '@/components/ProtectedComponent'

export function SaaSDashboard() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <div className="saas-dashboard">
      <h1>Dashboard SaaS</h1>
      
      {/* Métricas Executivas - Apenas Founders */}
      <OwnerOnly>
        <div className="executive-section">
          <h2>📊 Métricas Executivas</h2>
          <div className="metrics-grid">
            <MetricCard title="MRR" value="R$ 45.000" trend="+12%" />
            <MetricCard title="Churn Rate" value="2.3%" trend="-0.5%" />
            <MetricCard title="LTV" value="R$ 2.400" trend="+8%" />
            <MetricCard title="CAC" value="R$ 180" trend="-15%" />
          </div>
          <FinancialChart />
          <InvestorReports />
        </div>
      </OwnerOnly>

      {/* Métricas de Produto - CTOs e PMs */}
      <AdminOnly>
        <div className="product-section">
          <h2>🎯 Métricas de Produto</h2>
          <div className="product-metrics">
            <MetricCard title="DAU" value="1.250" trend="+5%" />
            <MetricCard title="Feature Adoption" value="68%" trend="+12%" />
            <MetricCard title="API Calls" value="2.3M" trend="+18%" />
            <MetricCard title="Uptime" value="99.9%" trend="stable" />
          </div>
          <FeatureUsageChart />
          <UserEngagementAnalysis />
        </div>
      </AdminOnly>

      {/* Suporte e Desenvolvimento - Moderators */}
      <ModeratorOnly>
        <div className="operations-section">
          <h2>🛠️ Operações</h2>
          <div className="operations-metrics">
            <MetricCard title="Tickets Abertos" value="23" trend="-8" />
            <MetricCard title="Tempo Resposta" value="2.4h" trend="-0.3h" />
            <MetricCard title="Satisfação" value="4.7/5" trend="+0.2" />
            <MetricCard title="Bugs Ativos" value="12" trend="-5" />
          </div>
          <SupportQueue />
          <BugTracker />
        </div>
      </ModeratorOnly>

      {/* Seção para todos */}
      <div className="general-section">
        <h2>📈 Visão Geral</h2>
        <UserGrowthChart />
        <SystemStatus />
      </div>
    </div>
  )
}

// Componentes auxiliares
function MetricCard({ title, value, trend }) {
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <div className="metric-value">{value}</div>
      <div className={`metric-trend ${trend.startsWith('+') ? 'positive' : 'negative'}`}>
        {trend}
      </div>
    </div>
  )
}
```

### Configuração de Navegação SaaS
```tsx
export function SaaSNavigation() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <nav className="saas-nav">
      <NavItem to="/dashboard" icon="📊">Dashboard</NavItem>
      
      <ModeratorOnly>
        <NavItem to="/support" icon="🎧">Suporte</NavItem>
        <NavItem to="/users" icon="👥">Usuários</NavItem>
      </ModeratorOnly>
      
      <AdminOnly>
        <NavItem to="/analytics" icon="📈">Analytics</NavItem>
        <NavItem to="/features" icon="⚡">Features</NavItem>
        <NavItem to="/api" icon="🔌">API</NavItem>
      </AdminOnly>
      
      <OwnerOnly>
        <NavItem to="/financials" icon="💰">Financeiro</NavItem>
        <NavItem to="/investors" icon="📋">Investidores</NavItem>
        <NavItem to="/strategy" icon="🎯">Estratégia</NavItem>
      </OwnerOnly>
    </nav>
  )
}
```

---

## 🏪 Template: E-commerce

### Estrutura de Roles E-commerce
```sql
-- Roles para loja online
INSERT INTO user_roles (user_id, role) VALUES
('dono@loja.com', 'owner'),
('gerente@loja.com', 'admin'),
('vendas@loja.com', 'admin'),
('atendimento@loja.com', 'moderator'),
('estoque@loja.com', 'moderator'),
('vendedor@loja.com', 'user');
```

### Dashboard E-commerce
```tsx
export function EcommerceDashboard() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <div className="ecommerce-dashboard">
      <h1>Dashboard E-commerce</h1>
      
      {/* Financeiro - Apenas Donos */}
      <OwnerOnly>
        <div className="financial-section">
          <h2>💰 Financeiro</h2>
          <div className="financial-metrics">
            <MetricCard title="Faturamento Mensal" value="R$ 125.000" trend="+18%" />
            <MetricCard title="Margem de Lucro" value="32%" trend="+2%" />
            <MetricCard title="Custos Operacionais" value="R$ 45.000" trend="-5%" />
            <MetricCard title="ROI Marketing" value="4.2x" trend="+0.8x" />
          </div>
          <ProfitChart />
          <TaxReports />
        </div>
      </OwnerOnly>

      {/* Vendas e Marketing - Gerentes */}
      <AdminOnly>
        <div className="sales-section">
          <h2>📈 Vendas & Marketing</h2>
          <div className="sales-metrics">
            <MetricCard title="Vendas Hoje" value="R$ 4.200" trend="+12%" />
            <MetricCard title="Conversão" value="3.2%" trend="+0.4%" />
            <MetricCard title="Ticket Médio" value="R$ 85" trend="+R$ 8" />
            <MetricCard title="Abandono Carrinho" value="68%" trend="-5%" />
          </div>
          <SalesChart />
          <ProductPerformance />
          <MarketingCampaigns />
        </div>
      </AdminOnly>

      {/* Operações - Moderators */}
      <ModeratorOnly>
        <div className="operations-section">
          <h2>📦 Operações</h2>
          <div className="operations-metrics">
            <MetricCard title="Pedidos Pendentes" value="47" trend="+12" />
            <MetricCard title="Estoque Baixo" value="23 itens" trend="-8" />
            <MetricCard title="Devoluções" value="8%" trend="-1%" />
            <MetricCard title="Tempo Entrega" value="2.3 dias" trend="-0.2" />
          </div>
          <OrderQueue />
          <InventoryAlerts />
          <CustomerService />
        </div>
      </ModeratorOnly>
    </div>
  )
}
```

---

## 🏥 Template: Clínica/Consultório

### Estrutura de Roles Médica
```sql
-- Roles para clínica
INSERT INTO user_roles (user_id, role) VALUES
('dr.proprietario@clinica.com', 'owner'),
('dr.socio@clinica.com', 'admin'),
('dr.associado@clinica.com', 'moderator'),
('administrador@clinica.com', 'moderator'),
('recepcao@clinica.com', 'user');
```

### Dashboard Clínica
```tsx
export function ClinicDashboard() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <div className="clinic-dashboard">
      <h1>Dashboard Clínica</h1>
      
      {/* Gestão Financeira - Proprietários */}
      <OwnerOnly>
        <div className="financial-section">
          <h2>💰 Gestão Financeira</h2>
          <div className="financial-metrics">
            <MetricCard title="Receita Mensal" value="R$ 85.000" trend="+15%" />
            <MetricCard title="Consultas Pagas" value="340" trend="+22" />
            <MetricCard title="Inadimplência" value="5%" trend="-2%" />
            <MetricCard title="Margem Líquida" value="28%" trend="+3%" />
          </div>
          <RevenueByDoctor />
          <ExpenseTracking />
          <TaxCompliance />
        </div>
      </OwnerOnly>

      {/* Gestão Médica - Médicos Sócios */}
      <AdminOnly>
        <div className="medical-section">
          <h2>👨‍⚕️ Gestão Médica</h2>
          <div className="medical-metrics">
            <MetricCard title="Consultas Hoje" value="28" trend="+5" />
            <MetricCard title="Taxa Ocupação" value="85%" trend="+8%" />
            <MetricCard title="Tempo Médio" value="25 min" trend="-2 min" />
            <MetricCard title="Satisfação" value="4.8/5" trend="+0.2" />
          </div>
          <AppointmentSchedule />
          <PatientRecords />
          <TreatmentPlans />
        </div>
      </AdminOnly>

      {/* Operações - Administradores */}
      <ModeratorOnly>
        <div className="operations-section">
          <h2>📋 Operações</h2>
          <div className="operations-metrics">
            <MetricCard title="Agendamentos Hoje" value="32" trend="+8" />
            <MetricCard title="Cancelamentos" value="4" trend="-2" />
            <MetricCard title="Lista Espera" value="15" trend="+3" />
            <MetricCard title="Confirmações" value="28/32" trend="87%" />
          </div>
          <AppointmentQueue />
          <PatientCheckIn />
          <InsuranceVerification />
        </div>
      </ModeratorOnly>
    </div>
  )
}
```

---

## 🎓 Template: Escola/Curso Online

### Estrutura de Roles Educacional
```sql
-- Roles para instituição de ensino
INSERT INTO user_roles (user_id, role) VALUES
('diretor@escola.com', 'owner'),
('coordenador@escola.com', 'admin'),
('professor.senior@escola.com', 'admin'),
('tutor@escola.com', 'moderator'),
('professor@escola.com', 'user');
```

### Dashboard Educacional
```tsx
export function EducationDashboard() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <div className="education-dashboard">
      <h1>Dashboard Educacional</h1>
      
      {/* Métricas Institucionais - Diretores */}
      <OwnerOnly>
        <div className="institutional-section">
          <h2>🏛️ Métricas Institucionais</h2>
          <div className="institutional-metrics">
            <MetricCard title="Receita Mensal" value="R$ 180.000" trend="+12%" />
            <MetricCard title="Alunos Ativos" value="1.250" trend="+85" />
            <MetricCard title="Taxa Retenção" value="92%" trend="+3%" />
            <MetricCard title="NPS" value="8.4" trend="+0.6" />
          </div>
          <RevenueByCourse />
          <StudentRetention />
          <TeacherPerformance />
        </div>
      </OwnerOnly>

      {/* Gestão Acadêmica - Coordenadores */}
      <AdminOnly>
        <div className="academic-section">
          <h2>📚 Gestão Acadêmica</h2>
          <div className="academic-metrics">
            <MetricCard title="Cursos Ativos" value="24" trend="+3" />
            <MetricCard title="Taxa Conclusão" value="78%" trend="+5%" />
            <MetricCard title="Média Notas" value="7.8" trend="+0.3" />
            <MetricCard title="Certificados" value="156" trend="+28" />
          </div>
          <CourseAnalytics />
          <StudentProgress />
          <CurriculumManagement />
        </div>
      </AdminOnly>

      {/* Suporte Educacional - Tutores */}
      <ModeratorOnly>
        <div className="support-section">
          <h2>🎧 Suporte Educacional</h2>
          <div className="support-metrics">
            <MetricCard title="Dúvidas Pendentes" value="18" trend="-5" />
            <MetricCard title="Tempo Resposta" value="1.2h" trend="-0.3h" />
            <MetricCard title="Satisfação" value="4.6/5" trend="+0.1" />
            <MetricCard title="Aulas Assistidas" value="89%" trend="+4%" />
          </div>
          <StudentSupport />
          <TechnicalHelp />
          <ProgressTracking />
        </div>
      </ModeratorOnly>
    </div>
  )
}
```

---

## 🏢 Template: Agência/Consultoria

### Estrutura de Roles Agência
```sql
-- Roles para agência
INSERT INTO user_roles (user_id, role) VALUES
('ceo@agencia.com', 'owner'),
('diretor.comercial@agencia.com', 'admin'),
('gerente.projetos@agencia.com', 'admin'),
('account.manager@agencia.com', 'moderator'),
('desenvolvedor@agencia.com', 'user');
```

### Dashboard Agência
```tsx
export function AgencyDashboard() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <div className="agency-dashboard">
      <h1>Dashboard Agência</h1>
      
      {/* Visão Executiva - CEOs */}
      <OwnerOnly>
        <div className="executive-section">
          <h2>🎯 Visão Executiva</h2>
          <div className="executive-metrics">
            <MetricCard title="Faturamento" value="R$ 320.000" trend="+22%" />
            <MetricCard title="Margem Líquida" value="35%" trend="+5%" />
            <MetricCard title="Clientes Ativos" value="28" trend="+6" />
            <MetricCard title="Pipeline" value="R$ 180.000" trend="+15%" />
          </div>
          <ProfitabilityAnalysis />
          <ClientPortfolio />
          <BusinessGrowth />
        </div>
      </OwnerOnly>

      {/* Gestão Comercial - Diretores */}
      <AdminOnly>
        <div className="commercial-section">
          <h2>💼 Gestão Comercial</h2>
          <div className="commercial-metrics">
            <MetricCard title="Propostas Enviadas" value="12" trend="+4" />
            <MetricCard title="Taxa Conversão" value="42%" trend="+8%" />
            <MetricCard title="Ticket Médio" value="R$ 25.000" trend="+R$ 3k" />
            <MetricCard title="Tempo Fechamento" value="18 dias" trend="-3 dias" />
          </div>
          <SalesPipeline />
          <ClientAcquisition />
          <ProposalTracking />
        </div>
      </AdminOnly>

      {/* Gestão de Projetos - Account Managers */}
      <ModeratorOnly>
        <div className="projects-section">
          <h2>📋 Gestão de Projetos</h2>
          <div className="projects-metrics">
            <MetricCard title="Projetos Ativos" value="15" trend="+2" />
            <MetricCard title="No Prazo" value="87%" trend="+5%" />
            <MetricCard title="Satisfação Cliente" value="4.7/5" trend="+0.2" />
            <MetricCard title="Horas Faturáveis" value="320h" trend="+45h" />
          </div>
          <ProjectTimeline />
          <ClientCommunication />
          <ResourceAllocation />
        </div>
      </ModeratorOnly>
    </div>
  )
}
```

---

## 🛠️ Componentes Reutilizáveis

### Sistema de Notificações por Role
```tsx
export function RoleBasedNotifications() {
  const { highestRole } = useUserRole()
  
  const notificationTypes = {
    owner: ['financial-alerts', 'strategic-updates', 'critical-issues'],
    admin: ['performance-alerts', 'user-issues', 'system-updates'],
    moderator: ['support-requests', 'user-reports', 'daily-summaries'],
    user: ['personal-updates', 'task-assignments', 'announcements']
  }

  return (
    <div className="role-notifications">
      <NotificationCenter types={notificationTypes[highestRole]} />
    </div>
  )
}
```

### Sidebar Adaptativa
```tsx
export function AdaptiveSidebar() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <aside className="adaptive-sidebar">
      <SidebarSection title="Principal">
        <SidebarItem to="/dashboard" icon="📊">Dashboard</SidebarItem>
        <SidebarItem to="/profile" icon="👤">Perfil</SidebarItem>
      </SidebarSection>

      <ModeratorOnly>
        <SidebarSection title="Operações">
          <SidebarItem to="/support" icon="🎧">Suporte</SidebarItem>
          <SidebarItem to="/users" icon="👥">Usuários</SidebarItem>
        </SidebarSection>
      </ModeratorOnly>

      <AdminOnly>
        <SidebarSection title="Gestão">
          <SidebarItem to="/analytics" icon="📈">Analytics</SidebarItem>
          <SidebarItem to="/reports" icon="📋">Relatórios</SidebarItem>
          <SidebarItem to="/settings" icon="⚙️">Configurações</SidebarItem>
        </SidebarSection>
      </AdminOnly>

      <OwnerOnly>
        <SidebarSection title="Executivo">
          <SidebarItem to="/financials" icon="💰">Financeiro</SidebarItem>
          <SidebarItem to="/strategy" icon="🎯">Estratégia</SidebarItem>
          <SidebarItem to="/admin" icon="🔧">Administração</SidebarItem>
        </SidebarSection>
      </OwnerOnly>
    </aside>
  )
}
```

---

**💡 Escolha o template que mais se adequa ao seu tipo de negócio e customize conforme suas necessidades específicas. Cada template pode ser combinado e adaptado para criar a solução perfeita para sua empresa.**