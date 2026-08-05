from fastapi import APIRouter, HTTPException
import httpx

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