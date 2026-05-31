#!/usr/bin/env node
// Apply branch protection to a GitHub repo branch using a token with admin rights.
// Usage: GITHUB_TOKEN=... node scripts/apply-branch-protection.js owner/repo branch

const [,, repoArg, branchArg] = process.argv;
async function main() {
  const repo = repoArg || process.env.GITHUB_REPO;
  const branch = branchArg || 'main';
  const token = process.env.GITHUB_TOKEN;
  if (!repo) {
    console.error('Missing repo. Usage: node scripts/apply-branch-protection.js owner/repo [branch]');
    process.exit(2);
  }
  if (!token) {
    console.error('Missing GITHUB_TOKEN in environment. Token must have repo:admin or repo scope and SAML approval.');
    process.exit(2);
  }

  const url = `https://api.github.com/repos/${repo}/branches/${branch}/protection`;
  const body = {
    required_status_checks: {
      strict: true,
      contexts: ["security-audit"]
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
      required_approving_review_count: 1
    },
    restrictions: null
  };

  console.log(`Applying branch protection to ${repo}@${branch}...`);
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('Failed to apply branch protection:', res.status, res.statusText);
    console.error(text);
    process.exit(1);
  }

  console.log('Branch protection applied successfully. Response:');
  try { console.log(JSON.parse(text)); } catch { console.log(text); }
}

main().catch(err => { console.error(err); process.exit(1); });
