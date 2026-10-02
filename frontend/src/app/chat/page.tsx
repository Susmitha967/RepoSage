"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageSquareText, Loader2, Send, Database, AlertCircle, FileCode2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUsername } from "../context/UsernameContext";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "ai";
  text: string;
  sources?: string[];
}

export default function ChatPage() {
  const { username } = useUsername();
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isIngested, setIsIngested] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ["repos", username],
    queryFn: async () => (await api.getRepos(username)) as any[],
    enabled: !!username,
  });

  const ingestMutation = useMutation({
    mutationFn: () => api.ingestRepoForChat(username, selectedRepo),
    onSuccess: () => {
      setIsIngested(true);
      setMessages([
        {
          role: "ai",
          text: "Repository ingested successfully! I've analyzed the README and key source files. What would you like to know about this codebase?",
        },
      ]);
    },
  });

  const chatMutation = useMutation({
    mutationFn: (question: string) => api.chatWithRepo(username, selectedRepo, question),
    onSuccess: (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.answer,
          sources: data.sources,
        },
      ]);
    },
    onError: (error: any) => {
      // If error is related to not being ingested, we could handle it, but we force ingestion first anyway.
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `Error: ${error.message || "Failed to get an answer."}`,
        },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRepo(e.target.value);
    setIsIngested(false);
    setMessages([]);
  };

  const handleIngest = () => {
    if (!selectedRepo) return;
    ingestMutation.mutate();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    chatMutation.mutate(question);
  };

  if (!username) {
    return (
      <div className="p-8 max-w-6xl mx-auto h-[80vh] flex flex-col justify-center">
        <div className="glass rounded-2xl p-12 text-center text-muted max-w-lg mx-auto w-full">
          <MessageSquareText className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No User Selected</h2>
          <p>Please search for a GitHub username on the Overview page first before chatting with their repositories.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto h-[90vh] flex flex-col">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
          <MessageSquareText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat with Repo</h1>
          <p className="text-sm text-muted">Ask questions about a repository's codebase and documentation</p>
        </div>
      </div>

      <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden border-primary/10 relative shadow-xl">
        {/* Repo Selector Header */}
        <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <span className="text-sm font-medium text-muted">Select Repository:</span>
            {reposLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading repos...
              </div>
            ) : (
              <select
                value={selectedRepo}
                onChange={handleRepoChange}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary max-w-md w-full"
              >
                <option value="" disabled>-- Select a repository --</option>
                {repos?.map((repo) => (
                  <option key={repo.name} value={repo.name}>
                    {repo.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {selectedRepo && !isIngested && (
            <button
              onClick={handleIngest}
              disabled={ingestMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {ingestMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Preparing...</>
              ) : (
                <><Database className="w-4 h-4" /> Prepare Repo for Chat</>
              )}
            </button>
          )}
          {isIngested && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
              <Database className="w-3 h-3" /> Ready
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface/30">
          {!selectedRepo ? (
            <div className="h-full flex flex-col items-center justify-center text-muted opacity-60">
              <MessageSquareText className="w-16 h-16 mb-4" />
              <p>Select a repository to start chatting</p>
            </div>
          ) : !isIngested ? (
            <div className="h-full flex flex-col items-center justify-center text-muted">
              {ingestMutation.isPending ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-2xl animate-spin" />
                    <Database className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Ingesting Repository</h3>
                  <p className="max-w-md text-center text-sm">
                    Downloading code files and documentation, splitting them into chunks, and creating vector embeddings...
                  </p>
                </>
              ) : (
                <>
                  <Database className="w-12 h-12 mb-4 opacity-50" />
                  <p>Click "Prepare Repo for Chat" to ingest the codebase.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-surface-hover border border-border rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.role === "ai" ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-surface prose-pre:border prose-pre:border-border">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                    )}
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-xs text-muted mb-2 font-medium">
                          <FileCode2 className="w-3.5 h-3.5" /> Sources:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-surface border border-border text-muted-foreground break-all">
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {chatMutation.isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-surface-hover border border-border rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted">Analyzing codebase...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-surface shrink-0">
          <form
            onSubmit={handleSend}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isIngested ? "Ask a question about this repository..." : "Prepare the repo first..."}
              disabled={!isIngested || chatMutation.isPending}
              className="w-full bg-surface-hover border border-border rounded-xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || !isIngested || chatMutation.isPending}
              className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
