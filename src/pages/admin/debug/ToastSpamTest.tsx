import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toastGate } from '@/lib/errors/toastGate';

export default function ToastSpamTest() {
    // Hardening: Only allow in Dev or if explictly enabled
    const isDev = import.meta.env.DEV;

    if (!isDev) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <h1 className="text-xl font-bold">Acesso Negado</h1>
                <p>Esta ferramenta de debug está disponível apenas em ambiente de desenvolvimento.</p>
            </div>
        );
    }

    const triggerScenarioA = () => {
        // Enviar 5 erros idênticos em sequência rápida (Consolidação)
        console.log('--- Triggering Scenario A ---');
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                toastGate.notifyError("Erro de Conexão com Servidor", `ERR-CON-${i}`, {
                    flowKey: 'connection-flow',
                    severity: 'medium'
                });
            }, i * 200); // 200ms delay between each
        }
    };

    const triggerScenarioB = () => {
        // Enviar 3 erros diferentes (Concorrência Max 2)
        console.log('--- Triggering Scenario B ---');
        toastGate.notifyError("Erro no Módulo de Usuários", "ERR-USER-01", { flowKey: 'user-flow', severity: 'medium' });

        setTimeout(() => {
            toastGate.notifyError("Erro no Módulo Financeiro", "ERR-FIN-01", { flowKey: 'finance-flow', severity: 'medium' });
        }, 500);

        setTimeout(() => {
            // Este deve forçar a saída do primeiro ou ser ignorado/fila
            toastGate.notifyError("Erro no Módulo de Auditoria", "ERR-AUDIT-01", { flowKey: 'audit-flow', severity: 'medium' });
        }, 1000);
    };

    const triggerScenarioC = () => {
        // Erro repetido > 30s (Throttle check)
        // Simular enviando agora e depois avisar para testar dnv em 30s
        console.log('--- Triggering Scenario C ---');
        toastGate.notifyError("Erro Recorrente", "ERR-REC-01", { fingerprint: 'rec-error-123', severity: 'low' });

        setTimeout(() => {
            toastGate.notifyError("Erro Recorrente (Ignorado)", "ERR-REC-02", { fingerprint: 'rec-error-123', severity: 'low' });
        }, 2000);
    };

    const triggerScenarioD = () => {
        // Prioridade: Low/Medium ativos, chega Critical
        console.log('--- Triggering Scenario D ---');
        toastGate.notifyError("Aviso Baixo Risco", "ERR-LOW-01", { flowKey: 'low-flow', severity: 'low' });

        setTimeout(() => {
            toastGate.notifyError("Erro Médio Risco", "ERR-MED-01", { flowKey: 'med-flow', severity: 'medium' });
        }, 500);

        setTimeout(() => {
            // Critical deve "matar" o Low para aparecer, mantendo o Medium (ou o mais recente)
            toastGate.notifyError("ERRO CRÍTICO DE SISTEMA", "ERR-CRIT-99", { flowKey: 'crit-flow', severity: 'critical' });
        }, 1500);
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-bold">Debug: Toast Anti-Spam Gate</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Cenário A: Consolidação</CardTitle>
                        <CardDescription>5 erros idênticos em 2s. Deve aparecer 1 toast que atualiza o contador.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={triggerScenarioA}>Disparar 5x (Flow Key Igual)</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cenário B: Concorrência</CardTitle>
                        <CardDescription>3 erros distintos. Máximo 2 visíveis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={triggerScenarioB} variant="secondary">Disparar 3x Distintos</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cenário C: Throttle (Dedupe)</CardTitle>
                        <CardDescription>Mesmo erro em &lt; 30s deve ser ignorado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={triggerScenarioC} variant="outline">Disparar Repetido</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cenário D: Prioridade</CardTitle>
                        <CardDescription>Critical deve substituir Low se cheio.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={triggerScenarioD} variant="destructive">Disparar Low -&gt; Med -&gt; Critical</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
