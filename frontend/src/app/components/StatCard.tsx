import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "success" | "warning";
}

const accentMap = {
  primary: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
};

export default function StatCard({ label, value, icon: Icon, accent = "primary" }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4 animate-slide-up">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accentMap[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}