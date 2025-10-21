# 🎯 Cenários Práticos - Sistema de Roles

## 📋 Guia de Implementação por Tipo de Negócio

### 🚀 SaaS/Plataforma Digital

#### Estrutura Recomendada
```
👑 Founder/CEO (Owner)
├── 👨‍💼 CTO (Admin)
├── 👩‍💼 Head of Product (Admin)  
├── 👨‍💻 Senior Developer (Moderator)
├── 👩‍💻 Support Manager (Moderator)
└── 👤 Junior Developers (User)
```

#### Implementação Prática
```tsx
// Dashboard executivo - apenas para founders
function ExecutiveDashboard() {
  return (
    <OwnerOnly>
      <div className="executive-metrics">
        <RevenueMetrics />
        <ChurnAnalysis />
        <CompetitorIntelligence />
        <InvestorReports />
      </div>
    </OwnerOnly>
  )
}

// Métricas de produto - para heads e CTOs
function ProductMetrics() {
  return (
    <AdminOnly>
      <div className="product-dashboard">
        <UserEngagement />
        <FeatureUsage />
        <PerformanceMetrics />
        <BugReports />
      </div>
    </AdminOnly>
  )
}

// Suporte ao cliente - para moderators
function CustomerSupport() {
  return (
    <ModeratorOnly>
      <div className="support-panel">
        <TicketQueue />
        <UserLookup />
        <QuickActions />
        <EscalationTools />
      </div>
    </ModeratorOnly>
  )
}
```

### 🏪 E-commerce/Marketplace

#### Estrutura Recomendada
```
👑 Dono da Loja (Owner)
├── 👨‍💼 Gerente Geral (Admin)
├── 👩‍💼 Gerente de Vendas (Admin)
├── 👨‍💻 Atendimento (Moderator)
├── 👩‍💻 Estoque (Moderator)
└── 👤 Vendedores (User)
```

#### Casos de Uso Específicos
```tsx
// Relatórios financeiros sensíveis
function FinancialReports() {
  return (
    <OwnerOnly>
      <div className="financial-dashboard">
        <ProfitMargins />
        <TaxReports />
        <CashFlow />
        <ROIAnalysis />
      </div>
    </OwnerOnly>
  )
}

// Gestão de produtos e preços
function ProductManagement() {
  return (
    <AdminOnly>
      <div className="product-management">
        <PriceAdjustments />
        <InventoryControl />
        <PromotionManager />
        <VendorRelations />
      </div>
    </AdminOnly>
  )
}

// Atendimento ao cliente
function CustomerService() {
  return (
    <ModeratorOnly>
      <div className="customer-service">
        <OrderTracking />
        <RefundProcessing />
        <CustomerHistory />
        <LiveChat />
      </div>
    </ModeratorOnly>
  )
}
```

### 🏥 Clínica/Consultório

#### Estrutura Recomendada
```
👑 Médico Proprietário (Owner)
├── 👨‍⚕️ Médico Sócio (Admin)
├── 👩‍⚕️ Médico Associado (Moderator)
├── 👨‍💼 Administrador (Moderator)
└── 👤 Recepcionistas (User)
```

#### Implementação com Compliance
```tsx
// Dados financeiros da clínica
function ClinicFinancials() {
  return (
    <OwnerOnly>
      <div className="clinic-financials">
        <RevenueByDoctor />
        <ExpenseTracking />
        <TaxCompliance />
        <InsuranceReports />
      </div>
    </OwnerOnly>
  )
}

// Gestão de pacientes
function PatientManagement() {
  return (
    <AdminOnly>
      <div className="patient-management">
        <PatientRecords />
        <AppointmentScheduling />
        <TreatmentPlans />
        <MedicalHistory />
      </div>
    </AdminOnly>
  )
}

// Recepção e agendamento
function Reception() {
  return (
    <ModeratorOnly>
      <div className="reception-panel">
        <AppointmentBooking />
        <PatientCheckIn />
        <InsuranceVerification />
        <BasicReports />
      </div>
    </ModeratorOnly>
  )
}
```

### 🎓 Escola/Curso Online

#### Estrutura Recomendada
```
👑 Diretor/Fundador (Owner)
├── 👨‍🏫 Coordenador Pedagógico (Admin)
├── 👩‍🏫 Professor Senior (Admin)
├── 👨‍💻 Tutor (Moderator)
└── 👤 Professores (User)
```

#### Sistema Educacional
```tsx
// Métricas institucionais
function InstitutionalMetrics() {
  return (
    <OwnerOnly>
      <div className="institutional-dashboard">
        <StudentRetention />
        <RevenuePerCourse />
        <TeacherPerformance />
        <ComplianceReports />
      </div>
    </OwnerOnly>
  )
}

// Gestão acadêmica
function AcademicManagement() {
  return (
    <AdminOnly>
      <div className="academic-panel">
        <CurriculumDesign />
        <GradeManagement />
        <StudentProgress />
        <CourseAnalytics />
      </div>
    </AdminOnly>
  )
}

// Suporte aos alunos
function StudentSupport() {
  return (
    <ModeratorOnly>
      <div className="student-support">
        <HelpDesk />
        <TechnicalSupport />
        <ProgressTracking />
        <CommunicationTools />
      </div>
    </ModeratorOnly>
  )
}
```

## 🔄 Fluxos de Trabalho Comuns

### 1. Onboarding de Novo Funcionário

```tsx
function EmployeeOnboarding() {
  const { isAdmin } = useUserRole()
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    role: 'user',
    department: '',
    startDate: new Date()
  })

  const handleOnboard = async () => {
    // 1. Criar usuário no sistema
    await createUser(newEmployee.email)
    
    // 2. Atribuir role inicial
    await assignRole(newEmployee.email, newEmployee.role)
    
    // 3. Enviar email de boas-vindas
    await sendWelcomeEmail(newEmployee)
    
    // 4. Agendar treinamento
    await scheduleTraining(newEmployee)
  }

  return (
    <AdminOnly>
      <div className="onboarding-form">
        <h3>Novo Funcionário</h3>
        <input 
          placeholder="Email"
          value={newEmployee.email}
          onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
        />
        <select 
          value={newEmployee.role}
          onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
        >
          <option value="user">Usuário</option>
          <option value="moderator">Moderador</option>
          <option value="admin">Administrador</option>
        </select>
        <button onClick={handleOnboard}>Cadastrar Funcionário</button>
      </div>
    </AdminOnly>
  )
}
```

### 2. Sistema de Aprovações

```tsx
function ApprovalSystem() {
  const { isAdmin, isModerator, isOwner } = useUserRole()
  const [pendingRequests, setPendingRequests] = useState([])

  const approveRequest = async (requestId, level) => {
    if (level === 'high' && !isOwner) {
      alert('Apenas owners podem aprovar solicitações de alto nível')
      return
    }
    
    if (level === 'medium' && !isAdmin) {
      alert('Apenas admins podem aprovar solicitações de nível médio')
      return
    }

    await updateRequestStatus(requestId, 'approved')
    // Notificar solicitante
    await notifyRequester(requestId, 'approved')
  }

  return (
    <div className="approval-system">
      <h3>Solicitações Pendentes</h3>
      {pendingRequests.map(request => (
        <div key={request.id} className="request-card">
          <h4>{request.title}</h4>
          <p>{request.description}</p>
          <div className="approval-actions">
            {(request.level === 'low' && isModerator) && (
              <button onClick={() => approveRequest(request.id, 'low')}>
                Aprovar (Moderador)
              </button>
            )}
            {(request.level === 'medium' && isAdmin) && (
              <button onClick={() => approveRequest(request.id, 'medium')}>
                Aprovar (Admin)
              </button>
            )}
            {(request.level === 'high' && isOwner) && (
              <button onClick={() => approveRequest(request.id, 'high')}>
                Aprovar (Owner)
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 3. Relatórios Hierárquicos

```tsx
function HierarchicalReports() {
  const { isOwner, isAdmin, isModerator } = useUserRole()

  return (
    <div className="reports-dashboard">
      {/* Relatórios básicos - todos podem ver */}
      <div className="basic-reports">
        <UserActivityReport />
        <SystemHealthReport />
      </div>

      {/* Relatórios moderados - moderators+ */}
      <ModeratorOnly>
        <div className="moderate-reports">
          <CustomerSatisfactionReport />
          <SupportTicketAnalysis />
        </div>
      </ModeratorOnly>

      {/* Relatórios administrativos - admins+ */}
      <AdminOnly>
        <div className="admin-reports">
          <PerformanceMetrics />
          <UserGrowthAnalysis />
          <RevenueReports />
        </div>
      </AdminOnly>

      {/* Relatórios executivos - apenas owners */}
      <OwnerOnly>
        <div className="executive-reports">
          <ProfitLossStatement />
          <CompetitiveAnalysis />
          <StrategicMetrics />
          <BoardReports />
        </div>
      </OwnerOnly>
    </div>
  )
}
```

## 🛡️ Cenários de Segurança

### 1. Auditoria de Acesso

```sql
-- Verificar quem acessou informações sensíveis
SELECT 
  ur.user_id,
  p.email,
  ur.role,
  al.action,
  al.resource,
  al.created_at
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
JOIN audit_log al ON ur.user_id = al.user_id
WHERE al.resource LIKE '%financial%'
  OR al.resource LIKE '%sensitive%'
ORDER BY al.created_at DESC;
```

### 2. Rotação de Roles

```tsx
function RoleRotation() {
  const { isOwner } = useUserRole()
  
  const rotateAdminRoles = async () => {
    // Cenário: Rotacionar admins a cada 6 meses por segurança
    const currentAdmins = await getCurrentAdmins()
    
    for (const admin of currentAdmins) {
      if (admin.roleAge > 180) { // 6 meses
        await demoteToModerator(admin.userId)
        await notifyRoleChange(admin.userId, 'Rotação de segurança')
      }
    }
  }

  return (
    <OwnerOnly>
      <div className="security-panel">
        <h3>Rotação de Roles</h3>
        <button onClick={rotateAdminRoles}>
          Executar Rotação Semestral
        </button>
        <AdminAgeReport />
      </div>
    </OwnerOnly>
  )
}
```

### 3. Acesso de Emergência

```sql
-- Criar acesso temporário de emergência
INSERT INTO user_roles (user_id, role, expires_at, reason) VALUES
('emergency-admin@empresa.com', 'admin', NOW() + INTERVAL '24 hours', 'Acesso de emergência - incidente crítico');

-- Revogar automaticamente após 24h
CREATE OR REPLACE FUNCTION revoke_expired_roles()
RETURNS void AS $$
BEGIN
  DELETE FROM user_roles 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Executar automaticamente
SELECT cron.schedule('revoke-expired-roles', '0 * * * *', 'SELECT revoke_expired_roles();');
```

## 📊 Métricas de Negócio

### Dashboard por Role

```tsx
function RoleBasedDashboard() {
  const { highestRole } = useUserRole()

  const dashboardConfig = {
    owner: {
      metrics: ['revenue', 'profit', 'growth', 'churn', 'ltv'],
      charts: ['financial-trends', 'market-analysis', 'competitive-intel'],
      actions: ['strategic-decisions', 'investment-planning', 'exit-strategy']
    },
    admin: {
      metrics: ['users', 'engagement', 'conversion', 'support-tickets'],
      charts: ['user-growth', 'feature-usage', 'performance'],
      actions: ['user-management', 'feature-flags', 'system-config']
    },
    moderator: {
      metrics: ['daily-active-users', 'support-resolution', 'user-satisfaction'],
      charts: ['support-trends', 'user-feedback'],
      actions: ['user-support', 'content-moderation', 'basic-reports']
    },
    user: {
      metrics: ['personal-stats', 'team-performance'],
      charts: ['individual-progress'],
      actions: ['profile-management', 'basic-tasks']
    }
  }

  const config = dashboardConfig[highestRole] || dashboardConfig.user

  return (
    <div className="role-based-dashboard">
      <MetricsGrid metrics={config.metrics} />
      <ChartsSection charts={config.charts} />
      <ActionsPanel actions={config.actions} />
    </div>
  )
}
```

## 🎯 Implementação Gradual

### Fase 1: Básico (Semana 1)
- [ ] Implementar roles básicas (owner, admin, user)
- [ ] Proteger rotas administrativas
- [ ] Criar página de gerenciamento simples

### Fase 2: Intermediário (Semana 2-3)
- [ ] Adicionar role moderator
- [ ] Implementar sistema de auditoria
- [ ] Criar relatórios por role

### Fase 3: Avançado (Semana 4+)
- [ ] Roles contextuais por projeto
- [ ] Sistema de aprovações
- [ ] Integração com sistemas externos
- [ ] Dashboard analytics avançado

---

**💡 Use este guia para adaptar o sistema de roles às necessidades específicas do seu negócio. Cada implementação pode ser customizada conforme sua realidade empresarial.**