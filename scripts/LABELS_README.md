Create GitHub labels used by security workflows.

Run locally (requires `gh`):

PowerShell:
```powershell
.
scripts\create-github-labels.ps1
```

Bash/macOS/Linux:
```bash
./scripts/create-github-labels.sh
```

Notes:
- Scripts use `gh label create --force` to idempotently create or update labels.
- Replace the placeholder URL in the scripts' final message with your repo URL.
