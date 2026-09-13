const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface FullProfile {
  profile: {
    login: string;
    name: string | null;
    bio: string | null;
    avatar_url: string;
    followers: number;
    following: number;
    public_repos: number;
    created_at: string;
    company: string | null;
    location: string | null;
    blog: string | null;
  };
  pinned_repos: {
    name: string;
    description: string | null;
    url: string;
    stargazerCount: number;
    forkCount: number;
    primaryLanguage: { name: string } | null;
  }[];
  organizations: { login: string; avatarUrl: string }[];
  contributions: {
    totalContributions: number;
    weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
  };
  languages: { language: string; bytes: number; percentage: number }[];
}

export const api = {
  getFullProfile: (username: string) =>
    apiFetch<FullProfile>(`/profile/${username}/full`),

  getRepos: (username: string) =>
    apiFetch<unknown[]>(`/repos/${username}`),

  getProfileSuggestions: (username: string) =>
    apiFetch<unknown>(`/profile/${username}/suggestions`),

  getBulkRepoSuggestions: (username: string) =>
    apiFetch<unknown>(`/repos/${username}/suggestions`),

  getRepoDeepDive: (username: string, repo: string) =>
    apiFetch<unknown>(`/repos/${username}/${repo}/deep-dive`),

  generateRepoReadme: (username: string, repo: string) =>
    apiFetch<unknown>(`/repos/${username}/${repo}/generate-readme`),

  generateProfileReadme: (username: string) =>
    apiFetch<unknown>(`/profile/${username}/generate-readme`),

  discoverByTopic: (topic: string, limit = 10) =>
    apiFetch<unknown>(`/discover?topic=${encodeURIComponent(topic)}&limit=${limit}`),

  explainTopic: (topic: string, repos: unknown[]) =>
    apiFetch<unknown>(`/discover/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, repos }),
    }),

  ingestRepoForChat: (username: string, repo: string) =>
    apiFetch<unknown>(`/repos/${username}/${repo}/chat/ingest`, { method: "POST" }),

  chatWithRepo: (username: string, repo: string, question: string) =>
    apiFetch<unknown>(`/repos/${username}/${repo}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
};