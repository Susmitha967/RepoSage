from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()

@router.get("/repos/{username}")
async def get_repos(username: str):
    url = f"https://api.github.com/users/{username}/repos"
    params = {"per_page": 100, "sort": "updated"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="GitHub user not found")

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="GitHub API error")

    repos = response.json()

    # Return only the fields we actually need on the frontend
    simplified = [
        {
            "name": repo["name"],
            "description": repo["description"],
            "html_url": repo["html_url"],
            "language": repo["language"],
            "stars": repo["stargazers_count"],
            "forks": repo["forks_count"],
            "license": repo["license"]["name"] if repo["license"] else None,
            "updated_at": repo["updated_at"],
            "topics": repo.get("topics", []),
        }
        for repo in repos
    ]

    return simplified