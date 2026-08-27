import httpx
import base64
from app.config import settings

CODE_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb", ".php", ".md"}
MAX_FILES_TO_INGEST = 10
MAX_CHARS_PER_FILE = 4000
CHUNK_SIZE = 800   # characters per chunk
CHUNK_OVERLAP = 100  # slight overlap so context isn't lost at chunk boundaries


def chunk_text(text: str, source: str) -> list[dict]:
    """
    Splits a piece of text into overlapping chunks.
    Overlap matters: if a sentence gets cut in half at a chunk boundary,
    the overlap ensures the next chunk still has enough context.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end]
        if chunk.strip():
            chunks.append({"text": chunk, "source": source})
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


async def fetch_repo_content_for_ingestion(owner: str, repo: str) -> list[dict]:
    """
    Gathers README + key code files from a repo, returns them as
    a flat list of chunks ready to be embedded.
    """
    headers = {"Authorization": f"Bearer {settings.github_token}"}
    all_chunks = []

    async with httpx.AsyncClient() as client:
        # 1. Repo metadata (need default branch)
        meta_response = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        if meta_response.status_code != 200:
            return []
        default_branch = meta_response.json().get("default_branch", "main")

        # 2. README
        readme_response = await client.get(f"https://api.github.com/repos/{owner}/{repo}/readme", headers=headers)
        if readme_response.status_code == 200:
            data = readme_response.json()
            if data.get("encoding") == "base64":
                readme_text = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
                all_chunks.extend(chunk_text(readme_text, "README.md"))

        # 3. File tree
        tree_response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}",
            headers=headers,
            params={"recursive": "true"},
        )
        tree = tree_response.json().get("tree", []) if tree_response.status_code == 200 else []

        # 4. Pick a reasonable set of code files
        code_files = [
            item["path"] for item in tree
            if item["type"] == "blob"
            and any(item["path"].endswith(ext) for ext in CODE_EXTENSIONS)
            and item.get("size", 0) > 30
        ][:MAX_FILES_TO_INGEST]

        # 5. Fetch and chunk each file's content
        for path in code_files:
            file_response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{path}", headers=headers
            )
            if file_response.status_code == 200:
                data = file_response.json()
                if data.get("encoding") == "base64":
                    content = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")[:MAX_CHARS_PER_FILE]
                    all_chunks.extend(chunk_text(content, path))

    return all_chunks