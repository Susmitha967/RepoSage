from app.services.ai_client import client, MODEL

DISCOVERY_SYSTEM_PROMPT = """You output ONLY valid JSON, no other text, no markdown code fences."""


async def enrich_repos_with_ai(topic: str, repos: list[dict]) -> list[dict]:
    """
    For each repo, generate a short summary, relevance note, skill level,
    and key concepts — using only the metadata already fetched (name,
    description, language, topics). One combined call, not one per repo,
    to keep this fast and cheap.
    """
    repo_list_text = "\n".join(
        f"{i+1}. {r['full_name']} — {r['description'] or 'No description'} "
        f"(Language: {r['language'] or 'Unknown'}, Stars: {r['stars']}, Topics: {', '.join(r['topics']) or 'none'})"
        for i, r in enumerate(repos)
    )

    prompt = f"""A developer is exploring the topic "{topic}". Here are {len(repos)} real GitHub repositories found for this topic:

{repo_list_text}

For EACH repository listed (in the same order, 1 to {len(repos)}), provide:
- "summary": a 1-2 sentence plain-English explanation of what it does and why it's relevant to "{topic}"
- "skill_level": one of "beginner", "intermediate", or "advanced" (based on apparent complexity)
- "key_concepts": an array of 2-4 short key concepts/skills someone would learn from exploring this repo

Respond with ONLY a JSON array (no other text), in this exact format:
[
  {{"index": 1, "summary": "...", "skill_level": "...", "key_concepts": ["...", "..."]}},
  {{"index": 2, "summary": "...", "skill_level": "...", "key_concepts": ["...", "..."]}}
]"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": DISCOVERY_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1500,
    )

    import json
    raw = response.choices[0].message.content.strip()

    # Defensive cleanup in case the model wraps in code fences despite instructions
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        ai_data = json.loads(raw)
    except json.JSONDecodeError:
        # If parsing fails, return repos without AI enrichment rather than crashing
        return repos

    ai_by_index = {item["index"]: item for item in ai_data}

    enriched = []
    for i, repo in enumerate(repos):
        ai_info = ai_by_index.get(i + 1, {})
        enriched.append({
            **repo,
            "ai_summary": ai_info.get("summary"),
            "skill_level": ai_info.get("skill_level"),
            "key_concepts": ai_info.get("key_concepts", []),
        })

    return enriched


async def explain_topic_using_repos(topic: str, repos: list[dict]) -> str:
    repo_list_text = "\n".join(
        f"- {r['full_name']}: {r.get('ai_summary') or r['description'] or 'No description'}"
        for r in repos[:5]
    )

    prompt = f"""Explain the topic "{topic}" to a developer who wants to learn it, using these real GitHub repositories as concrete reference points:

{repo_list_text}

Write a clear, educational explanation (4-6 paragraphs) of what "{topic}" is, why it matters, and how someone could use the repositories above to learn it hands-on. Reference the actual repos by name where relevant. Format as markdown."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=1200,
    )

    return response.choices[0].message.content