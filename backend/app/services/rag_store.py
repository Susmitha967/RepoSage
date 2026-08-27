import chromadb
from sentence_transformers import SentenceTransformer

# Loaded once at startup — this is the local embedding model.
# It converts any text into a 384-number vector representing its meaning.
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Local, file-based vector database — persists to disk so you don't
# re-embed the same repo every single time
chroma_client = chromadb.PersistentClient(path="./chroma_data")


def get_collection_name(owner: str, repo: str) -> str:
    # One "collection" (like a table) per repo, so different repos'
    # chunks never get mixed together during search
    return f"{owner}_{repo}".replace("-", "_").replace(".", "_")


def embed_and_store_chunks(owner: str, repo: str, chunks: list[dict]):
    collection_name = get_collection_name(owner, repo)

    # Delete any old data for this repo first (in case of re-ingestion)
    try:
        chroma_client.delete_collection(collection_name)
    except Exception:
        pass

    collection = chroma_client.create_collection(collection_name)

    texts = [c["text"] for c in chunks]
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": c["source"]} for c in chunks]

    embeddings = embedding_model.encode(texts).tolist()

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    return len(chunks)


def search_similar_chunks(owner: str, repo: str, query: str, top_k: int = 5) -> list[dict]:
    collection_name = get_collection_name(owner, repo)

    try:
        collection = chroma_client.get_collection(collection_name)
    except Exception:
        return []  # repo hasn't been ingested yet

    query_embedding = embedding_model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
    )

    matches = []
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    for doc, meta in zip(documents, metadatas):
        matches.append({"text": doc, "source": meta.get("source", "unknown")})

    return matches


def collection_exists(owner: str, repo: str) -> bool:
    collection_name = get_collection_name(owner, repo)
    try:
        chroma_client.get_collection(collection_name)
        return True
    except Exception:
        return False