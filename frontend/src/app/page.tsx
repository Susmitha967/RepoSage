"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, UserPlus, FolderGit2, Building2 } from "lucide-react";
import { useUsername } from "./context/UsernameContext";
import { api } from "@/lib/api";
import SearchBar from "./components/SearchBar";
import StatCard from "./components/StatCard";
import LanguageChart from "./components/LanguageChart";
import ContributionGraph from "./components/ContributionGraph";
import PinnedRepos from "./components/PinnedRepos";

export default function OverviewPage() {
  const { username } = useUsername();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fullProfile", username],
    queryFn: () => api.getFullProfile(username),
    enabled: !!username,
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Welcome to <span className="gradient-text">RepoSage</span>
        </h1>
        <p className="text-sm text-muted mb-5">
          Analyze any GitHub profile — get AI-powered insights, suggestions, and more.
        </p>
        <SearchBar />
      </div>

      {!username && (
        <div className="glass rounded-2xl p-12 text-center text-muted animate-fade-in">
          Enter a GitHub username above to get started.
        </div>
      )}

      {isLoading && (
        <div className="glass rounded-2xl p-12 text-center text-muted animate-fade-in">
          Loading profile...
        </div>
      )}

      {isError && (
        <div className="glass rounded-2xl p-12 text-center text-danger animate-fade-in">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Profile header */}
          <div className="glass rounded-2xl p-6 flex items-center gap-5">
            <img
              src={data.profile.avatar_url}
              alt={data.profile.login}
              className="w-20 h-20 rounded-2xl border border-border"
            />
            <div>
              <h2 className="text-xl font-semibold">{data.profile.name || data.profile.login}</h2>
              <p className="text-sm text-muted mb-2">@{data.profile.login}</p>
              {data.profile.bio && <p className="text-sm text-foreground/80">{data.profile.bio}</p>}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Followers" value={data.profile.followers} icon={Users} accent="primary" />
            <StatCard label="Following" value={data.profile.following} icon={UserPlus} accent="accent" />
            <StatCard label="Public Repos" value={data.profile.public_repos} icon={FolderGit2} accent="success" />
            <StatCard label="Organizations" value={data.organizations.length} icon={Building2} accent="warning" />
          </div>

          {/* Contribution graph */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-medium mb-4 text-muted">Contribution Activity</h3>
            <ContributionGraph
              weeks={data.contributions.weeks}
              total={data.contributions.totalContributions}
            />
          </div>

          {/* Language chart + Pinned repos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-medium mb-4 text-muted">Top Languages</h3>
              <LanguageChart languages={data.languages} />
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-medium mb-4 text-muted">Pinned Repositories</h3>
              <PinnedRepos repos={data.pinned_repos} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}