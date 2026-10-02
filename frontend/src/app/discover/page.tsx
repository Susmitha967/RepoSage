"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Loader2, Sparkles, Compass } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import RepoCard from "../components/RepoCard";
import RepoDetailModal from "../components/RepoDetailModal";

interface Repo {
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  license: string | null;
  updated_at: string;
  topics: string[];
  
  ai_summary?: string;
  skill_level?: string;
  key_concepts?: string[];
  score?: number;
}

interface DiscoverResponse {
  topic: string;
  count: number;
  repos: Repo[];
}

interface ExplainResponse {
  topic: string;
  explanation: string;
}

export default function DiscoverPage() {
  const [topicInput, setTopicInput] = useState("");
  const [searchedTopic, setSearchedTopic] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<{username: string, repoName: string} | null>(null);

  const { data: discoverData, isLoading: isDiscovering, isError: discoverError } = useQuery<DiscoverResponse>({
    queryKey: ["discover", searchedTopic],
    queryFn: async () => (await api.discoverByTopic(searchedTopic)) as DiscoverResponse,
    enabled: !!searchedTopic,
  });

  const { data: explainData, isLoading: isExplaining, isError: explainError } = useQuery<ExplainResponse>({
    queryKey: ["explain", searchedTopic, discoverData?.repos],
    queryFn: async () => (await api.explainTopic(searchedTopic, discoverData!.repos)) as ExplainResponse,
    enabled: !!searchedTopic && !!discoverData?.repos && discoverData.repos.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicInput.trim().length >= 2) {
      setSearchedTopic(topicInput.trim());
    }
  };

  const handleOpenDetail = (repoName: string) => {
    // We need to parse owner and name since discover API gives full_name or owner field.
    // Assuming `name` is just repo name, and `repo.owner` is available in RepoCard but let's check what RepoCard gets.
    // Wait, RepoCard expects `repo.name` which is just the repo name. It doesn't have the owner for detail modal easily unless we pass it.
    // The Discover API returns `name` and `owner`.
    const repo = discoverData?.repos.find(r => r.name === repoName);
    if (repo) {
      setSelectedRepo({ username: repo.owner, repoName: repo.name });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 mb-8 text-center max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/20">
          <Compass className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Discover by Topic</h1>
        <p className="text-muted">
          Enter a technology, framework, or concept to find the best repositories and get an AI-generated learning path.
        </p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10 relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="e.g. machine-learning, react, zero-knowledge-proofs..."
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          className="w-full pl-12 pr-32 py-4 bg-surface-hover border border-border rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg"
        />
        <button
          type="submit"
          disabled={isDiscovering || topicInput.trim().length < 2}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {isDiscovering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {discoverError && (
        <div className="glass rounded-2xl p-8 text-center text-danger">
          Failed to find repositories for this topic. Please try another one.
        </div>
      )}

      {searchedTopic && isDiscovering && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Scouring GitHub and analyzing repos with AI...</p>
        </div>
      )}

      {discoverData?.repos && discoverData.repos.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-muted">
          No active repositories found for "{searchedTopic}".
        </div>
      )}

      {discoverData?.repos && discoverData.repos.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="glass rounded-3xl p-8 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">AI Learning Guide: {searchedTopic}</h2>
            </div>
            
            {isExplaining ? (
              <div className="flex items-center gap-3 text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing a learning path from these repositories...</span>
              </div>
            ) : explainError ? (
              <p className="text-danger">Failed to generate AI explanation.</p>
            ) : explainData?.explanation ? (
              <div className="prose prose-invert max-w-none text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                <ReactMarkdown>{explainData.explanation}</ReactMarkdown>
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold tracking-tight">Recommended Repositories</h3>
              <span className="text-sm text-muted">{discoverData.count} found</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {discoverData.repos.map((repo) => (
                <RepoCard 
                  key={repo.full_name} 
                  repo={repo} 
                  onOpenDetail={() => handleOpenDetail(repo.name)} 
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {selectedRepo && (
        <RepoDetailModal
          isOpen={!!selectedRepo}
          onClose={() => setSelectedRepo(null)}
          username={selectedRepo.username}
          repoName={selectedRepo.repoName}
        />
      )}
    </div>
  );
}
