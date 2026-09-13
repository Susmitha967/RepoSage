interface ContributionGraphProps {
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
  total: number;
}

function getColor(count: number): string {
  if (count === 0) return "bg-surface-hover";
  if (count <= 2) return "bg-primary/30";
  if (count <= 5) return "bg-primary/60";
  if (count <= 9) return "bg-primary/80";
  return "bg-primary";
}

export default function ContributionGraph({ weeks, total }: ContributionGraphProps) {
  if (!weeks || weeks.length === 0) {
    return <p className="text-sm text-muted">No contribution data available.</p>;
  }

  return (
    <div>
      <p className="text-sm text-muted mb-3">
        <span className="text-foreground font-medium">{total}</span> contributions in the last year
      </p>
      <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-2">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-1">
            {week.contributionDays.map((day) => (
              <div
                key={day.date}
                title={`${day.contributionCount} contributions on ${day.date}`}
                className={`w-2.5 h-2.5 rounded-sm ${getColor(day.contributionCount)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}