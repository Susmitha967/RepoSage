import httpx
from app.config import settings

VAGUE_COMMIT_WORDS = {"fix", "update", "changes", "wip", "misc", "stuff", "minor", "fixes", "test"}


async def get_repo_root_contents(client: httpx.AsyncClient, headers: dict, owner: str, repo: str):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents"
    response = await client.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return []


async def has_workflows(client: httpx.AsyncClient, headers: dict, owner: str, repo: str):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/.github/workflows"
    response = await client.get(url, headers=headers)
    return response.status_code == 200 and len(response.json()) > 0


async def get_recent_commit_messages(client: httpx.AsyncClient, headers: dict, owner: str, repo: str, limit: int = 10):
    url = f"https://api.github.com/repos/{owner}/{repo}/commits"
    response = await client.get(url, headers=headers, params={"per_page": limit})
    if response.status_code != 200:
        return []
    commits = response.json()
    return [c["commit"]["message"].split("\n")[0] for c in commits]


def check_commit_quality(messages: list[str]) -> bool:
    """Returns True if commit messages look vague/low-quality."""
    if not messages:
        return False
    vague_count = 0
    for msg in messages:
        cleaned = msg.strip().lower()
        word_count = len(cleaned.split())
        if word_count <= 2 or cleaned in VAGUE_COMMIT_WORDS or any(cleaned.startswith(w) for w in VAGUE_COMMIT_WORDS):
            vague_count += 1
    return vague_count >= (len(messages) / 2)  # 50%+ vague = flag it


async def analyze_repo(owner: str, repo_meta: dict) -> dict:
    """
    repo_meta comes from the simplified repo object we already build in /repos/{username}
    (name, description, license, topics, etc.)
    """
    headers = {"Authorization": f"Bearer {settings.github_token}"}
    repo_name = repo_meta["name"]
    findings = []

    async with httpx.AsyncClient() as client:
        root_contents = await get_repo_root_contents(client, headers, owner, repo_name)
        file_names = [item["name"].lower() for item in root_contents if item["type"] == "file"]
        dir_names = [item["name"].lower() for item in root_contents if item["type"] == "dir"]

        workflows_exist = await has_workflows(client, headers, owner, repo_name)
        commit_messages = await get_recent_commit_messages(client, headers, owner, repo_name)

    # --- Rule-based checks ---

    if not any(f.startswith("readme") for f in file_names):
        findings.append({
            "type": "missing_readme",
            "severity": "high",
            "message": "No README file found. Add one to explain what this project does and how to use it."
        })

    if not repo_meta.get("license"):
        findings.append({
            "type": "missing_license",
            "severity": "medium",
            "message": "No license specified. Add a LICENSE file so others know how they can use this code."
        })

    if not repo_meta.get("description"):
        findings.append({
            "type": "missing_description",
            "severity": "medium",
            "message": "No repository description set. Add a short summary in the repo settings."
        })

    if not repo_meta.get("topics"):
        findings.append({
            "type": "missing_topics",
            "severity": "low",
            "message": "No topics/tags added. Topics help others discover this repo via GitHub search."
        })

    if not workflows_exist:
        findings.append({
            "type": "no_ci_cd",
            "severity": "medium",
            "message": "No GitHub Actions workflows found. Consider adding CI/CD for automated testing/builds."
        })

    if ".gitignore" not in file_names:
        findings.append({
            "type": "missing_gitignore",
            "severity": "low",
            "message": "No .gitignore file found. This can lead to accidentally committing unwanted files."
        })

    if "contributing.md" not in file_names:
        findings.append({
            "type": "missing_contributing",
            "severity": "low",
            "message": "No CONTRIBUTING.md found. Consider adding contribution guidelines if this is a collaborative project."
        })

    test_indicators = {"test", "tests", "__tests__", "spec"}
    if not (test_indicators & set(dir_names)):
        findings.append({
            "type": "no_tests",
            "severity": "medium",
            "message": "No test folder detected. Consider adding tests to improve code reliability."
        })

    if check_commit_quality(commit_messages):
        findings.append({
            "type": "poor_commit_messages",
            "severity": "low",
            "message": "Recent commit messages look vague (e.g. 'fix', 'update'). Consider more descriptive commit messages."
        })

    return {
        "repo": repo_name,
        "url": repo_meta["html_url"],
        "health_issues_count": len(findings),
        "findings": findings,
    }