def analyze_profile(full_profile_data: dict) -> list[dict]:
    """
    Takes the response shape from /profile/{username}/full
    and returns rule-based findings about the profile itself.
    """
    findings = []

    profile = full_profile_data["profile"]
    pinned_repos = full_profile_data["pinned_repos"]
    contributions = full_profile_data["contributions"]

    # 1. Missing/weak bio
    bio = profile.get("bio")
    if not bio or len(bio.strip()) < 10:
        findings.append({
            "type": "weak_bio",
            "severity": "medium",
            "message": "Your bio is missing or very short. Add a clear one-liner about who you are and what you build."
        })

    # 2. No profile README (username/username repo)
    username = profile.get("login")
    profile_readme_exists = full_profile_data.get("has_profile_readme", False)
    if not profile_readme_exists:
        findings.append({
            "type": "missing_profile_readme",
            "severity": "high",
            "message": f"You don't have a special profile README (a repo named '{username}/{username}'). "
                       f"This appears at the top of your GitHub profile page and is a great way to introduce yourself."
        })

    # 3. No pinned repos
    if not pinned_repos:
        findings.append({
            "type": "no_pinned_repos",
            "severity": "medium",
            "message": "You haven't pinned any repositories. Pin your best 3-6 projects so visitors see your strongest work first."
        })

    # 4. Missing social/contact links
    if not profile.get("blog") and not profile.get("twitter_username"):
        findings.append({
            "type": "missing_links",
            "severity": "low",
            "message": "No website, portfolio, or social links added to your profile. Consider adding one so people can find you elsewhere."
        })

    # 5. No location/company (soft signal, low priority)
    if not profile.get("company"):
        findings.append({
            "type": "missing_company",
            "severity": "low",
            "message": "No company/organization listed. Optional, but helps recruiters and collaborators understand your current context."
        })

    # 6. Inconsistent contribution activity
    total_contributions = contributions.get("totalContributions", 0)
    if total_contributions < 50:
        findings.append({
            "type": "low_activity",
            "severity": "medium",
            "message": f"Only {total_contributions} contributions in the last year. Consistent activity signals active engagement to visitors."
        })

    return findings