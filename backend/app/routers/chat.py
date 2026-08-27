from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.rag_ingest import fetch_repo_content_for_ingestion
from app.services.rag_store import embed_and_store_chunks, collection_exists
from app.services.rag_chat import answer_repo_question

router = APIRouter()


@router.post("/repos/{username}/{repo_name}/chat/ingest")
async def ingest_repo_for_chat(username: str, repo_name: str):
    chunks = await fetch_repo_content_for_ingestion(username, repo_name)

    if not chunks:
        raise HTTPException(status_code=404, detail="No content found to ingest for this repository")

    chunk_count = embed_and_store_chunks(username, repo_name, chunks)

    return {
        "repo": repo_name,
        "owner": username,
        "chunks_ingested": chunk_count,
        "status": "ready",
    }


class ChatRequest(BaseModel):
    question: str


@router.post("/repos/{username}/{repo_name}/chat")
async def chat_with_repo(username: str, repo_name: str, payload: ChatRequest):
    if not collection_exists(username, repo_name):
        raise HTTPException(
            status_code=400,
            detail="This repository hasn't been ingested yet. Call /chat/ingest first."
        )

    result = await answer_repo_question(username, repo_name, payload.question)

    return {
        "repo": repo_name,
        "owner": username,
        "question": payload.question,
        "answer": result["answer"],
        "sources": result["sources"],
    }