from fastapi import APIRouter, HTTPException
from app.services.repo_deep_dive import deep_dive_repo
from app.services.ai_client import generate_ai_suggestions

router = APIRouter()


@router.get("/repos/{username}/{repo_name}/deep-dive")
async def get_repo_deep_dive(username: str, repo_name: str):
    result = await deep_dive_repo(username, repo_name)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Combine all findings for the AI summary
    all_findings = []

    for f in result["readme_findings"]:
        all_findings.append({"severity": "medium", "message": f"[README] {f['message']}"})

    for f in result["structure_findings"]:
        all_findings.append({"severity": "low", "message": f"[Structure] {f['message']}"})

    for f in result["security_findings"]:
        all_findings.append({"severity": "high", "message": f"[Security] {f['message']}"})

    ai_summary = None
    if all_findings:
        ai_summary = await generate_ai_suggestions(f"repository '{repo_name}' (deep dive)", all_findings)

    return {
        **result,
        "total_issues": len(all_findings),
        "ai_summary": ai_summary,
    }