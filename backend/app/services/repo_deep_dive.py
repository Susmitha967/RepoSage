import httpx
from app.config import settings
from app.services.secret_scanner import scan_content_for_secrets, decode_github_content

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb", ".php",
    ".env", ".yml", ".yaml", ".json", ".ipynb", ".csv", ".sql", ".r"
}
MAX_FILES_TO_SCAN = 15  # cap to avoid huge repos taking forever / hitting rate limits


async def get_repo_tree(client: httpx.AsyncClient, headers: dict, owner: str, repo: str, default_branch: str):
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}"
    response = await client.get(url, headers=headers, params={"recursive": "true"})
    if response.status_code == 200:
        return response.json().get("tree", [])
    return []


async def get_file_content(client: httpx.AsyncClient, headers: dict, owner: str, repo: str, path: str):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    response = await client.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data.get("encoding") == "base64":
            return decode_github_content(data["content"])
    return ""


async def get_readme_content(client: httpx.AsyncClient, headers: dict, owner: str, repo: str):
    url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    response = await client.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data.get("encoding") == "base64":
            return decode_github_content(data["content"])
    return None


def analyze_readme_quality(readme_content: str | None) -> list[dict]:
    findings = []

    if readme_content is None:
        findings.append({
            "type": "no_readme",
            "message": "No README found at all."
        })
        return findings

    word_count = len(readme_content.split())

    if word_count < 50:
        findings.append({
            "type": "thin_readme",
            "message": f"README is very short ({word_count} words). Consider expanding with setup instructions, usage examples, and project purpose."
        })

    has_code_block = "```" in readme_content
    if not has_code_block:
        findings.append({
            "type": "no_code_examples",
            "message": "README has no code examples/blocks. Adding usage snippets helps visitors understand the project faster."
        })

    has_headers = "#" in readme_content
    if not has_headers:
        findings.append({
            "type": "no_structure",
            "message": "README lacks section headers. Structuring it (Installation, Usage, etc.) improves readability."
        })

    return findings


def analyze_structure(tree: list[dict]) -> list[dict]:
    findings = []

    root_files = [item for item in tree if "/" not in item["path"] and item["type"] == "blob"]
    root_dirs = [item for item in tree if "/" not in item["path"] and item["type"] == "tree"]

    code_files_in_root = [
        f for f in root_files
        if any(f["path"].endswith(ext) for ext in CODE_EXTENSIONS)
    ]

    # Flag if there are many code files dumped in root with no subfolder organization
    if len(code_files_in_root) > 8 and len(root_dirs) == 0:
        findings.append({
            "type": "flat_structure",
            "message": f"Found {len(code_files_in_root)} code files directly in the root with no subfolders. "
                       f"Consider organizing into folders (e.g. src/, tests/, docs/) as the project grows."
        })

    return findings


async def deep_dive_repo(owner: str, repo: str) -> dict:
    headers = {"Authorization": f"Bearer {settings.github_token}"}

    async with httpx.AsyncClient() as client:
        # Get repo metadata (need default branch)
        meta_response = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        if meta_response.status_code != 200:
            return {"error": "Repository not found"}

        meta = meta_response.json()
        default_branch = meta.get("default_branch", "main")

        # Get file tree
        tree = await get_repo_tree(client, headers, owner, repo, default_branch)

        # Get README and analyze quality
        readme_content = await get_readme_content(client, headers, owner, repo)
        readme_findings = analyze_readme_quality(readme_content)

        # Analyze folder structure
        structure_findings = analyze_structure(tree)

        # Scan a capped number of code/config files for secrets
        scannable_files = [
            item for item in tree
            if item["type"] == "blob" and any(item["path"].endswith(ext) for ext in CODE_EXTENSIONS)
        ][:MAX_FILES_TO_SCAN]

        security_findings = []
        for file_item in scannable_files:
            content = await get_file_content(client, headers, owner, repo, file_item["path"])
            if content:
                security_findings.extend(scan_content_for_secrets(file_item["path"], content))

    return {
        "repo": repo,
        "owner": owner,
        "description": meta.get("description"),
        "stars": meta.get("stargazers_count"),
        "readme_findings": readme_findings,
        "structure_findings": structure_findings,
        "security_findings": security_findings,
        "files_scanned": len(scannable_files),
    }