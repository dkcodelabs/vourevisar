import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  RotateCcw,
  ChartNoAxesCombined,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { NextBestActionCard } from "@/components/dashboard-decision/NextBestActionCard";
import { ProgressSummaryCard } from "@/components/dashboard-decision/ProgressSummaryCard";
import { demoAction, trialHref } from "./marketingContent";

/** Actual presentation components with explicitly illustrative, non-persisted data. */
export function ProductPreview({
  compact = false,
  view = 0,
}: {
  compact?: boolean;
  view?: number;
}) {
  const navigate = useNavigate();
  const action =
    view === 1
      ? {
          ...demoAction,
          kind: "start_cycle_topic" as const,
          primaryLabel: "Iniciar estudo",
          title: "Iniciar próximo tópico",
          reason: "Continue a fila de matérias do seu ciclo.",
          target: {
            subjectName: "Língua Portuguesa",
            topicName: "Compreensão e interpretação de textos",
          },
        }
      : demoAction;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_28px_75px_-35px_rgba(34,63,110,0.5)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <BrandLogo className="!text-[#172033] [&_.brand-wordmark]:!text-[14px] [&_svg]:!h-7 [&_svg]:!w-8" />
        <span className="text-[10px] font-medium text-slate-500">
          Prévia demonstrativa
        </span>
      </div>
      <div className={`flex ${compact ? "" : "min-h-[370px]"}`}>
        {!compact && (
          <aside
            aria-hidden="true"
            className="hidden w-12 shrink-0 flex-col items-center gap-6 border-r border-slate-100 bg-slate-50/60 py-6 sm:flex"
          >
            {[
              LayoutDashboard,
              ListTodo,
              BookOpen,
              RotateCcw,
              ChartNoAxesCombined,
            ].map((Icon, i) => (
              <Icon
                key={i}
                size={16}
                className={i === view ? "text-blue-600" : "text-slate-400"}
              />
            ))}
          </aside>
        )}
        <div className={`min-w-0 flex-1 ${compact ? "p-3" : "p-4 sm:p-5"}`}>
          {!compact && (
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">
                  Seu espaço de preparação
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  Um passo de cada vez.
                </h3>
              </div>
              <ArrowUpRight className="text-slate-400" size={18} />
            </div>
          )}
          {view === 4 ? (
            <ProgressSummaryCard
              summary={{
                startedTopics: 24,
                inProgressTopics: 18,
                completedTopics: 6,
                totalTopics: 80,
                editalProgressPercentage: 30,
              }}
              unstartedTopics={56}
              onNavigate={() => navigate(trialHref)}
            />
          ) : (
            <NextBestActionCard
              action={action}
              onNavigate={() => navigate(trialHref)}
            />
          )}
          {!compact && view !== 4 && (
            <div className="mt-4">
              <ProgressSummaryCard
                summary={{
                  startedTopics: 24,
                  inProgressTopics: 18,
                  completedTopics: 6,
                  totalTopics: 80,
                  editalProgressPercentage: 30,
                }}
                unstartedTopics={56}
                onNavigate={() => navigate(trialHref)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
