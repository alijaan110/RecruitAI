import { LucideIcon } from "lucide-react"
import { Button } from "../ui/button"

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
      <div className="bg-surface-100 rounded-xl p-3 flex items-center justify-center w-12 h-12 mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-sm font-medium text-slate-700">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 text-center max-w-[200px] mt-1">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
