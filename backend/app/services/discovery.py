import httpx
from datetime import datetime, timezone
from app.config import settings

GITHUB_SEARCH_URL = "https://api.github.com/search/repositories"
ABANDONED_THRESHOLD_DAYS = 730  # ~2 years with no updates = considered abandoned


def _days_since(date_str: str) -> int:
    updated = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - updated).days


def _calculate_score(repo: dict) -> float:
    stars = repo.get("stargazers_count", 0)
    forks = repo.get("forks_count", 0)
    open_issues = repo.get("open_issues_count", 0)
    days_since_update = _days_since(repo["updated_at"])

    # Recency factor: repos updated recently score higher, decays over time
    recency_score = max(0, 1 - (days_since_update / ABANDONED_THRESHOLD_DAYS))

    # Weighted score: stars matter most, forks show real usage,
    # recency prevents dead repos from ranking high just on old stars
    score = (stars * 0.5) + (forks * 0.3) + (recency_score * 1000 * 0.2)

    # Penalize repos with huge unresolved issue backlogs relative to size (rough health signal)
    if stars > 0:
        issue_ratio = open_issues / stars
        if issue_ratio > 0.3:
            score *= 0.85

    return score


async def search_repos_by_topic(topic: str, limit: int = 10) -> list[dict]:
    headers = {"Authorization": f"Bearer {settings.github_token}"}
    params = {
        "q": f"{topic} in:name,description,topics",
        "sort": "stars",
        "order": "desc",
        "per_page": 30,  # fetch more than needed, then filter/rank ourselves
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(GITHUB_SEARCH_URL, headers=headers, params=params)

    if response.status_code != 200:
        return []

    items = response.json().get("items", [])

    # Filter out abandoned repos
    active_repos = [
        r for r in items
        if _days_since(r["updated_at"]) < ABANDONED_THRESHOLD_DAYS
    ]

    # Score and rank
    for repo in active_repos:
        repo["_score"] = _calculate_score(repo)

    active_repos.sort(key=lambda r: r["_score"], reverse=True)

    top_repos = active_repos[:limit]

    return [
        {
            "name": r["name"],
            "full_name": r["full_name"],
            "owner": r["owner"]["login"],
            "description": r.get("description"),
            "html_url": r["html_url"],
            "stars": r["stargazers_count"],
            "forks": r["forks_count"],
            "language": r.get("language"),
            "open_issues": r["open_issues_count"],
            "topics": r.get("topics", []),
            "updated_at": r["updated_at"],
            "score": round(r["_score"], 1),
        }
        for r in top_repos
    ]