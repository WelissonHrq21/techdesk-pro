import {
  CheckCircle,
  ClipboardCheck,
  FilePenLine,
  FilePlus2,
  PackageMinus,
  Play,
  RotateCcw,
  Send,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";
import type { ServiceOrderAction } from "../utils/getAvailableActions";

type ServiceOrderActionsProps = {
  actions: ServiceOrderAction[];
  onAction: (action: ServiceOrderAction) => void;
};

const actionConfig: Record<
  ServiceOrderAction,
  {
    label: string;
    icon: typeof Play;
    tone: "primary" | "neutral" | "danger";
  }
> = {
  START_ANALYSIS: {
    label: "Iniciar análise",
    icon: Play,
    tone: "primary",
  },
  EDIT_DIAGNOSIS: {
    label: "Diagnóstico",
    icon: FilePenLine,
    tone: "neutral",
  },
  CREATE_BUDGET: {
    label: "Criar orçamento",
    icon: FilePlus2,
    tone: "primary",
  },
  SEND_FOR_APPROVAL: {
    label: "Enviar para aprovação",
    icon: Send,
    tone: "primary",
  },
  APPROVE_BUDGET: {
    label: "Aprovar orçamento",
    icon: CheckCircle,
    tone: "primary",
  },
  REJECT_BUDGET: {
    label: "Rejeitar orçamento",
    icon: XCircle,
    tone: "danger",
  },
  RETURN_TO_ANALYSIS: {
    label: "Voltar para análise",
    icon: RotateCcw,
    tone: "primary",
  },
  START_MAINTENANCE: {
    label: "Iniciar manutenção",
    icon: Wrench,
    tone: "primary",
  },
  CONSUME_PART: {
    label: "Consumir peça",
    icon: PackageMinus,
    tone: "neutral",
  },
  REVISE_BUDGET: {
    label: "Revisar orçamento",
    icon: FilePlus2,
    tone: "neutral",
  },
  FINISH: {
    label: "Finalizar",
    icon: ClipboardCheck,
    tone: "primary",
  },
  MARK_AWAITING_PICKUP: {
    label: "Aguardando retirada",
    icon: Truck,
    tone: "primary",
  },
  DELIVER: {
    label: "Registrar entrega",
    icon: CheckCircle,
    tone: "primary",
  },
};

const toneStyles: Record<(typeof actionConfig)[ServiceOrderAction]["tone"], string> = {
  primary: "bg-sky-600 text-white hover:bg-sky-700",
  neutral: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
};

export function ServiceOrderActions({
  actions,
  onAction,
}: ServiceOrderActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const config = actionConfig[action];
        const Icon = config.icon;

        return (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold ${toneStyles[config.tone]}`}
          >
            <Icon size={17} />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
