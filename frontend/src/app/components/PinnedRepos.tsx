import { Star, GitFork } from "lucide-react";

interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string } | null;
}

export default function PinnedRepos({ repos }: { repos: PinnedRepo[] }) {
  if (repos.length === 0) {
    return <p className="text-sm text-muted">No pinned repositories yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {repos.map((repo) => (

		<a
          key={repo.name}
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-xl p-4 hover:border-primary/40 transition-colors"
        >
          <h4 className="font-medium text-sm mb-1">{repo.name}</h4>
          <p className="text-xs text-muted line-clamp-2 mb-3 min-h-[2rem]">
            {repo.description || "No description"}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted">
            {repo.primaryLanguage && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {repo.primaryLanguage.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" /> {repo.stargazerCount}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" /> {repo.forkCount}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}