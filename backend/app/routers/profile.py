from fastapi import APIRouter, HTTPException
import httpx
from app.services.github_graphql import fetch_graphql_profile
from app.services.language_stats import get_language_breakdown
from app.services.profile_checks import analyze_profile
from app.services.github_graphql import fetch_graphql_profile, check_profile_readme_exists
from app.services.ai_client import generate_ai_suggestions


router = APIRouter()

@router.get("/profile/{username}")
async def get_profile(username: str):
    url = f"https://api.github.com/users/{username}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="GitHub user not found")

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="GitHub API error")

    return response.json()


@router.get("/profile/{username}/full")
async def get_full_profile(username: str):
    # 1. Basic REST profile
    async with httpx.AsyncClient() as client:
        basic_response = await client.get(f"https://api.github.com/users/{username}")

    if basic_response.status_code == 404:
        raise HTTPException(status_code=404, detail="GitHub user not found")

    basic_profile = basic_response.json()

    # 2. GraphQL data: pinned repos, contributions, organizations
    try:
        graphql_data = await fetch_graphql_profile(username)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 3. Repo list (for language aggregation)
    async with httpx.AsyncClient() as client:
        repos_response = await client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"per_page": 100},
        )
    repo_names = [r["name"] for r in repos_response.json()] if repos_response.status_code == 200 else []

    # 4. Language breakdown
    languages = await get_language_breakdown(username, repo_names)

    return {
        "profile": basic_profile,
        "pinned_repos": graphql_data.get("pinnedItems", {}).get("nodes", []),
        "organizations": graphql_data.get("organizations", {}).get("nodes", []),
        "contributions": graphql_data.get("contributionsCollection", {}).get("contributionCalendar", {}),
        "languages": languages,
    }
    

@router.get("/profile/{username}/suggestions")
async def get_profile_suggestions(username: str):
    async with httpx.AsyncClient() as client:
        basic_response = await client.get(f"https://api.github.com/users/{username}")

    if basic_response.status_code == 404:
        raise HTTPException(status_code=404, detail="GitHub user not found")

    basic_profile = basic_response.json()

    try:
        graphql_data = await fetch_graphql_profile(username)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    has_readme = await check_profile_readme_exists(username)

    full_data = {
        "profile": basic_profile,
        "pinned_repos": graphql_data.get("pinnedItems", {}).get("nodes", []),
        "contributions": graphql_data.get("contributionsCollection", {}).get("contributionCalendar", {}),
        "has_profile_readme": has_readme,
    }
    findings = analyze_profile(full_data)

    ai_summary = None
    if findings:
        ai_summary = await generate_ai_suggestions("GitHub profile", findings)

    return {
        "username": username,
        "issues_found": len(findings),
        "findings": findings,
        "ai_summary": ai_summary,
    }
