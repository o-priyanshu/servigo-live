import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

const EmptyState = ({ title, description, icon, className = "" }: EmptyStateProps) => {
  return (
    <div className={`rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center ${className}`}>
      <div className="mb-4 inline-flex rounded-full bg-muted p-4">
        {icon || <SearchX size={32} className="text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

export default EmptyState;
