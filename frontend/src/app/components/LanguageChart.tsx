"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface LanguageChartProps {
  languages: { language: string; percentage: number }[];
}

const COLORS = ["#8b7ef8", "#2dd4bf", "#fb923c", "#f472b6", "#60a5fa", "#a3e635", "#facc15"];

export default function LanguageChart({ languages }: LanguageChartProps) {
  const data = languages.slice(0, 7);

  if (data.length === 0) {
    return <p className="text-sm text-muted">No language data available.</p>;
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-40 h-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="percentage"
              nameKey="language"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(222 40% 9%)",
                border: "1px solid hsl(222 20% 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((lang, index) => (
          <div key={lang.language} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-foreground">{lang.language}</span>
            </div>
            <span className="text-muted font-mono text-xs">{lang.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}