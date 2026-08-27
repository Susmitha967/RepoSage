from app.services.ai_client import client, MODEL
from app.services.rag_store import search_similar_chunks

CHAT_SYSTEM_PROMPT = """You are a helpful assistant answering questions about a specific GitHub repository. You MUST answer based ONLY on the provided context chunks from the actual repository. If the context doesn't contain enough information to answer confidently, say so honestly rather than guessing or making things up."""


async def answer_repo_question(owner: str, repo: str, question: str) -> dict:
    relevant_chunks = search_similar_chunks(owner, repo, question, top_k=5)

    if not relevant_chunks:
        return {
            "answer": "This repository hasn't been indexed for chat yet, or no relevant content was found. Please ingest it first.",
            "sources": [],
        }

    context_text = "\n\n".join(
        f"--- From {chunk['source']} ---\n{chunk['text']}" for chunk in relevant_chunks
    )

    prompt = f"""Context from the repository (retrieved as most relevant to the question):

{context_text}

Question: {question}

Answer the question using only the context above. Reference specific files by name where relevant. Keep the answer clear and concise."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,  # low temperature — we want grounded, factual answers, not creative ones
        max_tokens=800,
    )

    sources = list({chunk["source"] for chunk in relevant_chunks})  # unique file names used

    return {
        "answer": response.choices[0].message.content,
        "sources": sources,
    }