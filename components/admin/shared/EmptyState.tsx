interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-zinc-700 p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-zinc-200">{title}</p>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}

