import httpx
from app.config import settings
from collections import defaultdict

async def get_language_breakdown(username: str, repo_names: list[str]):
    headers = {"Authorization": f"Bearer {settings.github_token}"}
    totals = defaultdict(int)

    async with httpx.AsyncClient() as client:
        for repo_name in repo_names:
            url = f"https://api.github.com/repos/{username}/{repo_name}/languages"
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                for lang, bytes_count in response.json().items():
                    totals[lang] += bytes_count

    total_bytes = sum(totals.values())
    if total_bytes == 0:
        return []

    breakdown = [
        {
            "language": lang,
            "bytes": count,
            "percentage": round((count / total_bytes) * 100, 1),
        }
        for lang, count in totals.items()
    ]

    breakdown.sort(key=lambda x: x["bytes"], reverse=True)
    return breakdown