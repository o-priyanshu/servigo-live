export default function SkeletonBlock({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-10 w-full bg-zinc-900" />
      ))}
    </div>
  );
}

