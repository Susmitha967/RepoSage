import httpx
from app.config import settings

GRAPHQL_URL = "https://api.github.com/graphql"

GRAPHQL_QUERY = """
query($username: String!) {
  user(login: $username) {
    organizations(first: 10) {
      nodes {
        login
        avatarUrl
      }
    }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          stargazerCount
          forkCount
          primaryLanguage {
            name
          }
        }
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
"""

async def fetch_graphql_profile(username: str):
    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "query": GRAPHQL_QUERY,
        "variables": {"username": username},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(GRAPHQL_URL, json=payload, headers=headers)

    if response.status_code != 200:
        raise Exception(f"GitHub GraphQL error: {response.status_code}")

    data = response.json()

    if "errors" in data:
        raise Exception(f"GraphQL errors: {data['errors']}")

    return data["data"]["user"]
async def check_profile_readme_exists(username: str) -> bool:
    url = f"https://api.github.com/repos/{username}/{username}"
    headers = {"Authorization": f"Bearer {settings.github_token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    return response.status_code == 200