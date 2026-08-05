"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

async function fetchProfile(username: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/${username}`);
  if (!res.ok) {
    throw new Error("User not found");
  }
  return res.json();
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profile", searchTerm],
    queryFn: () => fetchProfile(searchTerm),
    enabled: !!searchTerm,
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">RepoSage</h1>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Enter GitHub username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-4 py-2 rounded bg-gray-800 border border-gray-700 flex-1"
        />
        <button
          onClick={() => setSearchTerm(username)}
          className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {isLoading && <p>Loading...</p>}
      {isError && <p className="text-red-500">{(error as Error).message}</p>}

      {data && (
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
          <img src={data.avatar_url} alt="avatar" className="w-24 h-24 rounded-full mb-4" />
          <h2 className="text-xl font-semibold">{data.name || data.login}</h2>
          <p className="text-gray-400">{data.bio}</p>
          <p className="mt-2 text-sm text-gray-500">
            Followers: {data.followers} · Following: {data.following} · Public Repos: {data.public_repos}
          </p>
        </div>
      )}
    </main>
  );
}