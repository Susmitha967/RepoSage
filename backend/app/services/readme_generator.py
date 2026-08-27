import httpx
import base64
from app.config import settings
from app.services.ai_client import client, MODEL

README_SYSTEM_PROMPT = """You are an expert technical writer who creates clear, professional GitHub README files.
Always respond with ONLY the raw markdown content of the README — no preamble, no explanation, no code fences wrapping the whole thing."""

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb", ".php",
    ".env", ".yml", ".yaml", ".json", ".ipynb", ".csv", ".sql", ".r"
}
MAX_CODE_FILES_TO_READ = 6
MAX_CHARS_PER_FILE = 2000

async def gather_repo_context(owner: str, repo: str) -> dict:
    headers = {"Authorization": f"Bearer {settings.github_token}"}

    async with httpx.AsyncClient() as client_http:
        meta_response = await client_http.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        if meta_response.status_code != 200:
            return {"error": "Repository not found"}

        meta = meta_response.json()
        default_branch = meta.get("default_branch", "main")

        tree_response = await client_http.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}",
            headers=headers,
            params={"recursive": "true"},
        )
        tree = tree_response.json().get("tree", []) if tree_response.status_code == 200 else []

        languages_response = await client_http.get(
            f"https://api.github.com/repos/{owner}/{repo}/languages", headers=headers
        )
        languages = list(languages_response.json().keys()) if languages_response.status_code == 200 else []

        # Existing README (if any) — gives the AI real prior context instead of starting blind
        existing_readme = None
        readme_response = await client_http.get(f"https://api.github.com/repos/{owner}/{repo}/readme", headers=headers)
        if readme_response.status_code == 200:
            data = readme_response.json()
            if data.get("encoding") == "base64":
                existing_readme = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")[:3000]

        # Dependency file (package.json / requirements.txt / pyproject.toml)
        dep_file_content = None
        dep_file_name = None
        for dep_file in ["package.json", "requirements.txt", "pyproject.toml"]:
            file_response = await client_http.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{dep_file}", headers=headers
            )
            if file_response.status_code == 200:
                data = file_response.json()
                if data.get("encoding") == "base64":
                    dep_file_content = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")[:1500]
                    dep_file_name = dep_file
                    break

        # Pick real code files to actually read (biggest signal for accurate explanation)
        code_file_paths = [
            item["path"] for item in tree
            if item["type"] == "blob"
            and any(item["path"].endswith(ext) for ext in CODE_EXTENSIONS)
            and item.get("size", 0) > 50  # skip near-empty files
        ]

        # Prioritize likely entry-point / main files first
        priority_names = {"main", "app", "index", "server", "run", "__init__"}
        code_file_paths.sort(key=lambda p: 0 if any(p.lower().split("/")[-1].startswith(n) for n in priority_names) else 1)

        selected_files = code_file_paths[:MAX_CODE_FILES_TO_READ]

        code_samples = []
        for path in selected_files:
            file_response = await client_http.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{path}", headers=headers
            )
            if file_response.status_code == 200:
                data = file_response.json()
                if data.get("encoding") == "base64":
                    content = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
                    code_samples.append({
                        "path": path,
                        "content": content[:MAX_CHARS_PER_FILE],
                    })

    top_level_paths = [item["path"] for item in tree if "/" not in item["path"]][:30]

    return {
        "name": repo,
        "description": meta.get("description"),
        "languages": languages,
        "topics": meta.get("topics", []),
        "license": meta.get("license", {}).get("name") if meta.get("license") else None,
        "top_level_files": top_level_paths,
        "dependency_file_name": dep_file_name,
        "dependency_snippet": dep_file_content,
        "existing_readme": existing_readme,
        "code_samples": code_samples,
        "stars": meta.get("stargazers_count", 0),
        "homepage": meta.get("homepage"),
    }


async def generate_repo_readme(owner: str, repo: str) -> str:
    context = await gather_repo_context(owner, repo)

    if "error" in context:
        raise ValueError(context["error"])

    code_samples_text = ""
    for sample in context["code_samples"]:
        code_samples_text += f"\n\n--- File: {sample['path']} ---\n{sample['content']}"

    existing_readme_note = (
        f"\n\nAn existing README was found — use it as context for the project's intent, but improve and expand it:\n{context['existing_readme']}"
        if context["existing_readme"] else ""
    )

    prompt = f"""You are analyzing a real GitHub repository to write a comprehensive, accurate README.md. Study the actual code samples below carefully — base your explanation of what the project does on what the code actually shows, not assumptions.

REPOSITORY METADATA
Name: {context['name']}
Existing description: {context['description'] or 'None provided'}
Languages used: {', '.join(context['languages']) or 'Unknown'}
Topics/tags: {', '.join(context['topics']) or 'None'}
License: {context['license'] or 'None specified'}
Top-level files/folders: {', '.join(context['top_level_files']) or 'Unknown'}
Stars: {context['stars']}

DEPENDENCY FILE ({context['dependency_file_name'] or 'none found'}):
{context['dependency_snippet'] or 'Not available'}
{existing_readme_note}

ACTUAL CODE SAMPLES FROM THE REPOSITORY:
{code_samples_text or 'No readable code samples found.'}

Now write a thorough, professional README.md with ALL of these sections, fully filled out based on the real evidence above:

1. **Project Title** with a one-line tagline
2. **Overview** — a substantial paragraph (4-6 sentences) explaining what this project actually does, based on the code you read, not generic description
3. **Features** — a real bullet list of specific functionality you can see evidence of in the code (not generic placeholders)
4. **Tech Stack** — list of languages/frameworks/libraries actually detected
5. **Project Structure** — briefly describe what the key files/folders do, based on top-level files given
6. **Installation** — realistic step-by-step setup instructions, inferring the correct package manager from the dependency file (npm/pip/etc.)
7. **Requirements** — list actual dependencies found in the dependency file, if available
8. **Usage** — a realistic example of how to run/use this project, based on entry-point files you saw
9. **License** — mention the license if one was found

Be specific and detailed — this should read as if a developer who deeply understands this exact codebase wrote it, not a generic template. If certain information genuinely isn't available from the evidence given, say so briefly rather than inventing it. Use proper markdown with code blocks for commands."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": README_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=2500,
    )

    return response.choices[0].message.content


async def generate_profile_readme(username: str) -> str:
    headers = {"Authorization": f"Bearer {settings.github_token}"}

    async with httpx.AsyncClient() as client_http:
        profile_response = await client_http.get(f"https://api.github.com/users/{username}", headers=headers)
        repos_response = await client_http.get(
            f"https://api.github.com/users/{username}/repos",
            headers=headers,
            params={"per_page": 100, "sort": "updated"},
        )

    if profile_response.status_code != 200:
        raise ValueError("User not found")

    profile = profile_response.json()
    repos = repos_response.json() if repos_response.status_code == 200 else []

    top_repos = sorted(repos, key=lambda r: r.get("stargazers_count", 0), reverse=True)[:5]
    top_repo_names = [r["name"] for r in top_repos]

    languages = list({r["language"] for r in repos if r.get("language")})[:8]

    prompt = f"""Generate a GitHub profile README.md (the special one shown at the top of a user's profile page) based on this real information. Do not invent achievements, job titles, or projects that aren't given below.

Name: {profile.get('name') or profile.get('login')}
Bio: {profile.get('bio') or 'None provided'}
Company: {profile.get('company') or 'Not specified'}
Location: {profile.get('location') or 'Not specified'}
Public repos: {profile.get('public_repos', 0)}
Followers: {profile.get('followers', 0)}
Top languages used across repos: {', '.join(languages) or 'Unknown'}
Notable repositories: {', '.join(top_repo_names) or 'None'}
Blog/website: {profile.get('blog') or 'None'}

Create a warm, professional profile README with sections like: a friendly intro/greeting, "About Me" bullet points, "Tech Stack" (based on the languages given), and "Featured Projects" (based on the repo names given, without inventing what each project does beyond its name). Use markdown, and light use of emoji is fine (not excessive). Keep it genuine, not overly salesy."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": README_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
        max_tokens=1000,
    )

    return response.choices[0].message.content