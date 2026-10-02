"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Loader2, User, FolderGit2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useUsername } from "../context/UsernameContext";
import { api } from "@/lib/api";

const severityColor = {
  high: "text-danger bg-danger/10 border-danger/20",
  medium: "text-warning bg-warning/10 border-warning/20",
  low: "text-muted bg-surface-hover border-border",
};

export default function SuggestionsPage() {
  const { username } = useUsername();

  const { data: profileSugg, isLoading: profileLoading } = useQuery({
    queryKey: ["profileSuggestions", username],
    queryFn: async () => (await api.getProfileSuggestions(username)) as any,
    enabled: !!username,
  });

  const { data: repoSugg, isLoading: repoLoading } = useQuery({
    queryKey: ["repoSuggestions", username],
    queryFn: async () => (await api.getBulkRepoSuggestions(username)) as any,
    enabled: !!username,
  });

  if (!username) {
    return (
      <div className="p-8 max-w-6xl mx-auto h-[80vh] flex flex-col justify-center">
        <div className="glass rounded-2xl p-12 text-center text-muted max-w-lg mx-auto w-full">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No User Selected</h2>
          <p>Please search for a GitHub username on the Overview page first.</p>
        </div>
      </div>
    );
  }

  const isLoading = profileLoading || repoLoading;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Health Suggestions</h1>
            <p className="text-sm text-muted">Holistic analysis of your profile and repositories</p>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Analyzing...
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        {profileSugg && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Profile Health</h2>
              {profileSugg.issues_found === 0 ? (
                <span className="ml-2 flex items-center gap-1 text-xs px-2 py-1 bg-success/10 text-success rounded-full border border-success/20">
                  <CheckCircle2 className="w-3 h-3" /> Perfect
                </span>
              ) : (
                <span className="ml-2 flex items-center gap-1 text-xs px-2 py-1 bg-warning/10 text-warning rounded-full border border-warning/20">
                  <AlertTriangle className="w-3 h-3" /> {profileSugg.issues_found} issues
                </span>
              )}
            </div>

            {profileSugg.ai_summary && (
              <div className="glass rounded-2xl p-6 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2 text-primary font-medium text-sm">
                  <Sparkles className="w-4 h-4" /> AI Summary
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {profileSugg.ai_summary}
                </div>
              </div>
            )}

            {profileSugg.findings?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {profileSugg.findings.map((f: any, i: number) => (
                  <div key={i} className={`glass rounded-xl p-4 border ${severityColor[f.severity as keyof typeof severityColor]}`}>
                    <div className="text-sm font-medium mb-1 capitalize flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {f.severity} Priority
                    </div>
                    <div className="text-xs opacity-90 leading-relaxed">{f.message}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Repositories Section */}
        {repoSugg && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold">Repository Health</h2>
              <span className="ml-2 text-xs text-muted font-medium">
                ({repoSugg.repos_analyzed} repos analyzed)
              </span>
            </div>

            {repoSugg.ai_summary && (
              <div className="glass rounded-2xl p-6 border-accent/20 bg-accent/5">
                <div className="flex items-center gap-2 mb-2 text-accent font-medium text-sm">
                  <Sparkles className="w-4 h-4" /> AI Summary
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {repoSugg.ai_summary}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 mt-4">
              {repoSugg.repos.filter((r: any) => r.findings?.length > 0).map((r: any) => (
                <div key={r.repo} className="glass rounded-xl p-5 hover:border-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground/90">{r.repo}</h3>
                    <div className="flex gap-3 text-sm">
                      <span className="text-muted">Health: {r.health_score}/100</span>
                      <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> {r.health_issues_count} issues</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {r.findings.map((f: any, i: number) => (
                      <div key={i} className={`text-xs px-3 py-2.5 rounded-lg border flex items-start gap-2 ${severityColor[f.severity as keyof typeof severityColor]}`}>
                        <div className="mt-0.5"><AlertTriangle className="w-3 h-3" /></div>
                        <div className="leading-relaxed">{f.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {repoSugg.repos.filter((r: any) => r.findings?.length > 0).length === 0 && (
                <div className="glass rounded-xl p-8 text-center text-muted">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-success opacity-50" />
                  <p>All your active repositories look incredibly healthy!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
