"use client";

interface CriteriaSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description?: string;
}

const levels = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" },
] as const;

export default function CriteriaSlider({ label, value, onChange, description }: CriteriaSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <p className="text-sm font-semibold text-foreground">{value}/5</p>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {levels.map((level) => {
          const active = level.value <= value;
          return (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              className={`rounded-md border px-2 py-2 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
              aria-pressed={active}
            >
              <span className="block">{level.value}★</span>
              <span className="mt-0.5 block">{level.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
