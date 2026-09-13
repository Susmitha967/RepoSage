"use client";

import { Star, GitFork, Scale, Clock, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Finding {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
}

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

interface RepoCardProps {
  repo: Repo;
  findings?: Finding[];
  onOpenDetail: (repoName: string) => void;
}

const severityColor = {
  high: "text-danger bg-danger/10 border-danger/20",
  medium: "text-warning bg-warning/10 border-warning/20",
  low: "text-muted bg-surface-hover border-border",
};

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function RepoCard({ repo, findings, onOpenDetail }: RepoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const issueCount = findings?.length || 0;

  return (
    <div className="glass rounded-2xl p-5 hover:border-primary/30 transition-colors animate-slide-up">
      <div className="flex items-start justify-between mb-2">
        <button
          type="button"
          onClick={() => onOpenDetail(repo.name)}
          className="font-medium text-sm hover:text-primary transition-colors text-left cursor-pointer"
        >
          {repo.name}
        </button>
        <div className="flex items-center gap-1.5">
          {findings !== undefined && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                issueCount > 0
                  ? "text-warning bg-warning/10 border-warning/20"
                  : "text-success bg-success/10 border-success/20"
              }`}
            >
              {issueCount > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3" /> {issueCount}
                </>
              ) : (
                "Healthy"
              )}
              {issueCount > 0 && (expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
          )}
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
            title="Open on GitHub"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <p className="text-xs text-muted line-clamp-2 mb-4 min-h-[2rem]">
        {repo.description || "No description"}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" /> {repo.stars}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="w-3 h-3" /> {repo.forks}
        </span>
        {repo.license && (
          <span className="flex items-center gap-1">
            <Scale className="w-3 h-3" /> {repo.license}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeAgo(repo.updated_at)}
        </span>
      </div>

      {expanded && findings && findings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-2 animate-fade-in">
          {findings.map((f, i) => (
            <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${severityColor[f.severity]}`}>
              {f.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
