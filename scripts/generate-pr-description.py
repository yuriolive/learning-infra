import json
import os
import re
import subprocess

import requests


def get_pr_diff():
    # Fetch base branch to compare against
    base_ref = os.environ.get("GITHUB_BASE_REF") or "main"

    # Validate base_ref to prevent command injection or malicious input
    # Only allow alphanumeric, hyphens, underscores, or forward slashes
    if not re.match(r"^[a-zA-Z0-9\-\_\/]+$", base_ref):
        raise ValueError(f"Invalid GITHUB_BASE_REF: {base_ref}")

    subprocess.run(["git", "fetch", "origin", "--", base_ref], check=True)
    # Get the diff
    result = subprocess.run(
        ["git", "diff", "--", f"origin/{base_ref}...HEAD"], capture_output=True, text=True, check=True
    )
    return result.stdout


def generate_description(diff, api_key):
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")
    temperature = float(os.environ.get("GEMINI_TEMPERATURE", "0.7"))

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    print(f"Calling Gemini API (model: {model}, temp: {temperature})...")

    custom_prompt = os.environ.get("GEMINI_PROMPT")
    
    # Try to read PR template
    pr_template = ""
    template_path = ".github/pull_request_template.md"
    if os.path.exists(template_path):
        with open(template_path, "r") as f:
            pr_template = f.read()

    if custom_prompt:
        prompt = f"{custom_prompt}\n\nGit Diff:\n{diff[:15000]}"
    else:
        system_instruction = """You are an expert software engineer.
Review the following git diff and generate a concise, professional Pull Request title and description."""
        
        if pr_template:
            system_instruction += f"\n\nUse the following Pull Request Template for the body:\n\n{pr_template}\n\nIMPORTANT: Maintain the structure of the template."""
        
        prompt = f"""{system_instruction}

IMPORTANT: You MUST return the response as a valid JSON object with the following keys:
- "title": A concise, descriptive title for the PR.
- "body": The description body in Markdown format. If a template is provided, follow it.
  Do NOT include any header like "# PR Description" or a title inside the body.

Git Diff:
{diff[:15000]}
"""

    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "responseMimeType": "application/json"},
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        response.raise_for_status()
        res_data = response.json()
        json_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(json_text)
    except requests.exceptions.HTTPError as e:
        print(f"Gemini API Error ({e.response.status_code}): {e.response.text}")
        raise
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"Error parsing AI response: {e}")
        # Fallback if AI fails to return valid JSON
        return {"title": "AI PR Update", "body": "AI failed to generate structural JSON description."}


def update_pr(title, body, github_token, repo, pr_number):
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    print(f"Updating PR at: {url}")

    data = {"title": title, "body": body}
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
    }

    try:
        response = requests.patch(url, json=data, headers=headers, timeout=30)
        response.raise_for_status()
        print("Successfully updated PR title and description.")
    except requests.exceptions.HTTPError as e:
        print(f"GitHub API Error ({e.response.status_code}): {e.response.text}")
        raise


def main():
    try:
        if not os.environ.get("GITHUB_EVENT_PATH"):
            print("Not running in GitHub Actions.")
            return

        with open(os.environ["GITHUB_EVENT_PATH"], "r") as f:
            event = json.load(f)

        pr_number = os.environ.get("PR_NUMBER")
        if not pr_number:
            if "pull_request" in event:
                pr_number = event["pull_request"]["number"]
            elif "issue" in event:
                pr_number = event["issue"]["number"]
            else:
                pr_number = event.get("number")
        repo = os.environ["GITHUB_REPOSITORY"]
        github_token = os.environ["GITHUB_TOKEN"]
        api_key = os.environ["GEMINI_API_KEY"]

        print(f"Generating details for PR #{pr_number}...")
        diff = get_pr_diff()

        if not diff.strip():
            print("No changes found.")
            return

        ai_res = generate_description(diff, api_key)
        update_pr(ai_res.get("title", "AI Updated PR"), ai_res.get("body", ""), github_token, repo, pr_number)

    except Exception as e:
        print(f"Error: {e}")
        exit(1)


if __name__ == "__main__":
    main()
