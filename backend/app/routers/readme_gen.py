from fastapi import APIRouter, HTTPException
from app.services.readme_generator import generate_repo_readme, generate_profile_readme

router = APIRouter()


@router.get("/repos/{username}/{repo_name}/generate-readme")
async def get_generated_repo_readme(username: str, repo_name: str):
    try:
        readme_markdown = await generate_repo_readme(username, repo_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate README: {str(e)}")

    return {
        "repo": repo_name,
        "owner": username,
        "generated_readme": readme_markdown,
    }


@router.get("/profile/{username}/generate-readme")
async def get_generated_profile_readme(username: str):
    try:
        readme_markdown = await generate_profile_readme(username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate README: {str(e)}")

    return {
        "username": username,
        "generated_readme": readme_markdown,
    }