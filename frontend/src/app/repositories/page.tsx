"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { useUsername } from "../context/UsernameContext";
import { api } from "@/lib/api";
import RepoCard from "../components/RepoCard";
import FilterBar from "../components/FilterBar";
// import { useState } from "react";
import RepoDetailModal from "../components/RepoDetailModal"; 


interface Repo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  license: string | null;
  updated_at: string;
  topics: string[];
}

interface Finding {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
}

interface BulkSuggestionsResponse {
  username: string;
  repos_analyzed: number;
  total_issues_found: number;
  repos: { repo: string; findings: Finding[] }[];
  ai_summary: string | null;
}

function filterBySearch(repos: Repo[], search: string): Repo[] {
  if (!search) return repos;
  return repos.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
}

function filterByLanguage(repos: Repo[], languageFilter: string): Repo[] {
  if (languageFilter === "all") return repos;
  return repos.filter((r) => r.language === languageFilter);
}

function sortRepos(repos: Repo[], sortBy: string): Repo[] {
  const sorted = [...repos];
  if (sortBy === "stars") sorted.sort((a, b) => b.stars - a.stars);
  if (sortBy === "forks") sorted.sort((a, b) => b.forks - a.forks);
  if (sortBy === "updated") {
    sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
  return sorted;
}

export default function RepositoriesPage() {
  const { username } = useUsername();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("stars");
  const [analysisRequested, setAnalysisRequested] = useState(false);

  const { data: repos, isLoading, isError } = useQuery<Repo[]>({
    queryKey: ["repos", username],
    queryFn: async (): Promise<Repo[]> => (await api.getRepos(username)) as Repo[],
    enabled: !!username,
  });

  const {
    data: suggestions,
    isLoading: suggestionsLoading,
    refetch: runAnalysis,
  } = useQuery<BulkSuggestionsResponse>({
    queryKey: ["bulkSuggestions", username],
    queryFn: async (): Promise<BulkSuggestionsResponse> =>
      (await api.getBulkRepoSuggestions(username)) as BulkSuggestionsResponse,
    enabled: false,
  });

  const handleRunAnalysis = () => {
    setAnalysisRequested(true);
    runAnalysis();
  };

  const findingsByRepo = useMemo(() => {
    const map: Record<string, Finding[]> = {};
    if (!suggestions) return map;
    for (const r of suggestions.repos) {
      map[r.repo] = r.findings;
    }
    return map;
  }, [suggestions]);

  const languages = useMemo(() => {
    if (!repos) return [];
    const unique = new Set(repos.map((r) => r.language).filter((l): l is string => Boolean(l)));
    return Array.from(unique);
  }, [repos]);

  const filteredRepos = useMemo(() => {
    if (!repos) return [];
    const searched = filterBySearch(repos, search);
    const filtered = filterByLanguage(searched, languageFilter);
    return sortRepos(filtered, sortBy);
  }, [repos, search, languageFilter, sortBy]);

  if (!username) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="glass rounded-2xl p-12 text-center text-muted">
          Search a GitHub username from the Overview page first.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Repositories</h1>
          <p className="text-sm text-muted">
            {repos ? `${repos.length} repositories` : "Loading..."}
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={suggestionsLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {suggestionsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Run AI Health Check
        </button>
      </div>

      {suggestions && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">AI Summary</h3>
          </div>
          <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {suggestions.ai_summary}
          </div>
        </motion.div>
      )}

      {isLoading && (
        <div className="glass rounded-2xl p-12 text-center text-muted">Loading repositories...</div>
      )}
      {isError && (
        <div className="glass rounded-2xl p-12 text-center text-danger">Failed to load repositories.</div>
      )}

      {repos && (
        <>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            languageFilter={languageFilter}
            onLanguageChange={setLanguageFilter}
            languages={languages}
            sortBy={sortBy}
            onSortChange={setSortBy}
            sortOptions={[
              { value: "stars", label: "Sort: Most Stars" },
              { value: "forks", label: "Sort: Most Forks" },
              { value: "updated", label: "Sort: Recently Updated" },
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepos.map((repo) => (
              <RepoCard
                key={repo.name}
                repo={repo}
                findings={analysisRequested ? findingsByRepo[repo.name] : undefined}
                onOpenDetail={(repoName) => setSelectedRepo(repoName)}
              />
            ))}
          </div>

                    {filteredRepos.length === 0 && (
            <p className="text-center text-muted mt-8">No repositories match your filters.</p>
          )}
        </>
      )}

      {selectedRepo && (
        <RepoDetailModal
          isOpen={!!selectedRepo}
          onClose={() => setSelectedRepo(null)}
          username={username}
          repoName={selectedRepo}
        />
      )}
    </div>
  );
}