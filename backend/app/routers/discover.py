from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from app.services.discovery import search_repos_by_topic
from app.services.discovery_ai import enrich_repos_with_ai, explain_topic_using_repos

router = APIRouter()


@router.get("/discover")
async def discover_by_topic(topic: str = Query(..., min_length=2), limit: int = 10):
    repos = await search_repos_by_topic(topic, limit=limit)

    if not repos:
        raise HTTPException(status_code=404, detail=f"No active repositories found for topic '{topic}'")

    try:
        enriched_repos = await enrich_repos_with_ai(topic, repos)
    except Exception:
        enriched_repos = repos  # fail gracefully, return raw data if AI enrichment breaks

    return {
        "topic": topic,
        "count": len(enriched_repos),
        "repos": enriched_repos,
    }


class ExplainRequest(BaseModel):
    topic: str
    repos: list[dict]


@router.post("/discover/explain")
async def explain_topic(req: ExplainRequest):
    if not req.repos:
        raise HTTPException(status_code=400, detail="No repos provided to explain from")

    explanation = await explain_topic_using_repos(req.topic, req.repos)

    return {
        "topic": req.topic,
        "explanation": explanation,
    }