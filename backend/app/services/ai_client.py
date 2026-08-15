from groq import Groq
from app.config import settings

client = Groq(api_key=settings.groq_api_key)

MODEL = "llama-3.3-70b-versatile"


async def generate_ai_suggestions(context: str, findings: list[dict]) -> str:
    """
    Takes rule-based findings and context, returns a polished,
    prioritized explanation from the AI.
    """
    findings_text = "\n".join(
        f"- [{f['severity'].upper()}] {f['message']}" for f in findings
    )

    prompt = f"""You are a helpful GitHub profile/repo advisor. Below is context about a developer's {context}, followed by a list of automatically detected issues.

Detected issues:
{findings_text}

Turn this into a friendly, prioritized set of recommendations. Group by priority (High, Medium, Low). For each item, briefly explain WHY it matters, not just what's missing. Keep it concise — no more than 2 sentences per issue. Use a warm, encouraging tone, not a scolding one. Format as clean markdown with headers per priority level."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=800,
    )

    return response.choices[0].message.content