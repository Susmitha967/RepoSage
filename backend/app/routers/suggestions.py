
from fastapi import APIRouter, HTTPException
import httpx
import asyncio
from app.services.repo_checks import analyze_repo
from app.services.ai_client import generate_ai_suggestions

router = APIRouter()

router = APIRouter()


@router.get("/repos/{username}/suggestions")
async def get_bulk_repo_suggestions(username: str):
    # Reuse the same simplified repo fetch logic
    url = f"https://api.github.com/users/{username}/repos"
    params = {"per_page": 100, "sort": "updated"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="GitHub user not found")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="GitHub API error")

    repos = response.json()

    simplified_repos = [
        {
            "name": r["name"],
            "description": r["description"],
            "html_url": r["html_url"],
            "language": r["language"],
            "license": r["license"]["name"] if r["license"] else None,
            "topics": r.get("topics", []),
            "fork": r["fork"],
        }
        for r in repos
        if not r["fork"]  # skip forked repos — not the user's own work
    ]

    # Run all repo analyses concurrently instead of one-by-one
    results = await asyncio.gather(
        *[analyze_repo(username, repo) for repo in simplified_repos]
    )

    total_issues = sum(r["health_issues_count"] for r in results)

    # Flatten all findings across all repos for one combined AI summary
    all_findings = []
    for r in results:
        for f in r["findings"]:
            all_findings.append({**f, "message": f"[{r['repo']}] {f['message']}"})

    ai_summary = None
    if all_findings:
        # Cap at top 15 findings to keep the prompt reasonable
        ai_summary = await generate_ai_suggestions("GitHub repositories (bulk)", all_findings[:15])

    return {
        "username": username,
        "repos_analyzed": len(results),
        "total_issues_found": total_issues,
        "repos": results,
        "ai_summary": ai_summary,
    }