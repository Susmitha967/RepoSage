import re
import base64

# Common secret patterns — intentionally conservative to avoid false positives
SECRET_PATTERNS = [
    ("AWS Access Key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("AWS Secret Key", re.compile(r"(?i)aws_secret_access_key\s*=\s*['\"][A-Za-z0-9/+=]{40}['\"]")),
    ("Generic API Key", re.compile(r"(?i)(api[_-]?key|apikey)\s*[:=]\s*['\"][A-Za-z0-9_\-]{20,}['\"]")),
    ("Private Key Block", re.compile(r"-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----")),
    ("GitHub Token", re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}")),
    ("Slack Token", re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}")),
    ("Generic Secret/Password assignment", re.compile(r"(?i)(password|secret|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]")),
    ("Stripe Key", re.compile(r"sk_live_[0-9a-zA-Z]{24,}")),
]

RISKY_FILE_EXTENSIONS = {".env", ".pem", ".key", ".pfx", ".p12"}


def scan_content_for_secrets(filename: str, content: str) -> list[dict]:
    findings = []

    # Flag risky file types outright
    if any(filename.endswith(ext) for ext in RISKY_FILE_EXTENSIONS):
        findings.append({
            "file": filename,
            "type": "risky_file_type",
            "message": f"'{filename}' is a sensitive file type that likely shouldn't be committed to version control."
        })

    for label, pattern in SECRET_PATTERNS:
        if pattern.search(content):
            findings.append({
                "file": filename,
                "type": "hardcoded_secret",
                "message": f"Possible {label} detected in '{filename}'. Review and remove if it's a real credential."
            })

    return findings


def decode_github_content(base64_content: str) -> str:
    try:
        return base64.b64decode(base64_content).decode("utf-8", errors="ignore")
    except Exception:
        return ""