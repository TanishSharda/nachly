#!/usr/bin/env bash
# Run this locally to create the suggested GitHub labels.
# Requirements: GitHub CLI `gh` installed and authenticated (run `gh auth login`).

set -euo pipefail

labels=(
  "security:d73a4a:Security-related changes and audits"
  "ci:0e8a16:Continuous integration / checks"
  "audit:0052cc:Audit findings and reports"
  "service-role-allowlist:5319e7:Approved allowlist changes for service-role usage"
  "allowlist-approved:5319e7:Alternate label accepted by allowlist guard workflow"
  "high-priority:b60205:High priority security fix"
)

for entry in "${labels[@]}"; do
  IFS=":" read -r name color desc <<< "$entry"
  echo "Creating/updating label: $name"
  gh label create "$name" --color "$color" --description "$desc" --force || true
done

echo "Done. Verify labels at: https://github.com/<owner>/<repo>/labels"
