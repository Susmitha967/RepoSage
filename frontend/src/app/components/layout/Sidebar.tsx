"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Sparkles,
  MessageSquareText,
  Compass,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: FolderGit2 },
  { href: "/suggestions", label: "AI Suggestions", icon: Sparkles },
  { href: "/chat", label: "Chat with Repo", icon: MessageSquareText },
  { href: "/discover", label: "Discover", icon: Compass },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border glass flex flex-col p-4 sticky top-0 h-screen">
      <div className="flex items-center gap-2 px-2 py-4 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Search className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">RepoSage</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 py-4 text-xs text-muted">
        RepoSage v1.0 · Powered by Groq
      </div>
    </aside>
  );
}