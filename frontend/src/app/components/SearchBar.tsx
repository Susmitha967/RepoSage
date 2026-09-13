"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useUsername } from "../context/UsernameContext";

export default function SearchBar() {
  const { username, setUsername } = useUsername();
  const [input, setInput] = useState(username);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!input.trim()) return;
    setLoading(true);
    setUsername(input.trim());
    setTimeout(() => setLoading(false), 400); // brief visual feedback
  };

  return (
    <div className="flex items-center gap-3 max-w-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Enter a GitHub username..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>
      <button
        onClick={handleSearch}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
      </button>
    </div>
  );
}