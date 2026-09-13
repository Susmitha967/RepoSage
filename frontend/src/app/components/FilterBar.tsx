"use client";

import { Search } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  languageFilter: string;
  onLanguageChange: (val: string) => void;
  languages: string[];
  sortBy: string;
  onSortChange: (val: string) => void;
  sortOptions: { value: string; label: string }[];
}

export default function FilterBar({
  search,
  onSearchChange,
  languageFilter,
  onLanguageChange,
  languages,
  sortBy,
  onSortChange,
  sortOptions,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <select
        value={languageFilter}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <option value="all">All Languages</option>
        {languages.map((lang) => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}