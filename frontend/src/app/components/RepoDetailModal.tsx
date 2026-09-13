"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, FileText, Copy, Check, ShieldAlert, FolderTree, BookOpen, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import Modal from "./Modal";

interface RepoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  repoName: string;
}

type Tab = "deep-dive" | "readme";

interface ReadmeResponse {
  generated_readme: string;
}

interface Finding {
  message: string;
  type?: string;
}

interface DeepDiveResponse {
  ai_summary?: string;
  readme_findings: Finding[];
  structure_findings: Finding[];
  security_findings: Finding[];
  total_issues: number;
}

const severityStyle = {
  high: "text-danger bg-danger/10 border-danger/20",
  medium: "text-warning bg-warning/10 border-warning/20",
  low: "text-muted bg-surface-hover border-border",
};

export default function RepoDetailModal({ isOpen, onClose, username, repoName }: RepoDetailModalProps) {
  const [tab, setTab] = useState<Tab>("deep-dive");
  const [copied, setCopied] = useState(false);

  const deepDive = useQuery<DeepDiveResponse>({
    queryKey: ["deepDive", username, repoName],
    queryFn: async (): Promise<DeepDiveResponse> =>
      (await api.getRepoDeepDive(username, repoName)) as DeepDiveResponse,
    enabled: isOpen && tab === "deep-dive",
  });

  const readme = useQuery<ReadmeResponse>({
    queryKey: ["readmeGen", username, repoName],
    queryFn: async (): Promise<ReadmeResponse> =>
      (await api.generateRepoReadme(username, repoName)) as ReadmeResponse,
    enabled: isOpen && tab === "readme",
  });

  const handleCopy = () => {
    if (readme.data?.generated_readme) {
      navigator.clipboard.writeText(readme.data.generated_readme);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={repoName}>
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("deep-dive")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "deep-dive" ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-hover"
          }`}
        >
          <FileSearch className="w-3.5 h-3.5" /> Deep-Dive Analysis
        </button>
        <button
          onClick={() => setTab("readme")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "readme" ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-hover"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Generate README
        </button>
      </div>

      {tab === "deep-dive" && (
        <div className="space-y-5">
          {deepDive.isLoading && <p className="text-sm text-muted">Analyzing repository...</p>}
          {deepDive.isError && <p className="text-sm text-danger">Failed to analyze this repository.</p>}

          {deepDive.data && (
            <>
              {deepDive.data.ai_summary && (
                <div className="bg-surface rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {deepDive.data.ai_summary}
                </div>
              )}

              <FindingsSection
                icon={BookOpen}
                title="README Quality"
                findings={deepDive.data.readme_findings}
              />
              <FindingsSection
                icon={FolderTree}
                title="Structure"
                findings={deepDive.data.structure_findings}
              />
              <FindingsSection
                icon={ShieldAlert}
                title="Security"
                findings={deepDive.data.security_findings}
              />

              {deepDive.data.total_issues === 0 && (
                <p className="text-sm text-success">No issues found — this repo looks healthy.</p>
              )}
            </>
          )}
        </div>
      )}

      {tab === "readme" && (
        <div>
          {readme.isLoading && <p className="text-sm text-muted">Generating README from repository content...</p>}
          {readme.isError && <p className="text-sm text-danger">Failed to generate README.</p>}

          {readme.data && (
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-hover text-xs hover:bg-border transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <pre className="bg-surface rounded-xl p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {readme.data.generated_readme}
              </pre>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function FindingsSection({
  icon: Icon,
  title,
  findings,
}: {
  icon: LucideIcon;
  title: string;
  findings: Finding[];
}) {
  if (!findings || findings.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted">
        <Icon className="w-3.5 h-3.5" /> {title}
      </div>
      <div className="space-y-1.5">
        {findings.map((f, i) => (
          <div key={i} className="text-xs px-3 py-2 rounded-lg border text-foreground/80 bg-surface-hover border-border">
            {f.message}
          </div>
        ))}
      </div>
    </div>
  );
}