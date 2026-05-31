<#
Run this locally to create the suggested GitHub labels.

Requirements:
- GitHub CLI (`gh`) installed and authenticated (run `gh auth login`).

Usage:
.\create-github-labels.ps1
#>

$labels = @(
    @{name='security'; color='d73a4a'; description='Security-related changes and audits'},
    @{name='ci'; color='0e8a16'; description='Continuous integration / checks'},
    @{name='audit'; color='0052cc'; description='Audit findings and reports'},
    @{name='service-role-allowlist'; color='5319e7'; description='Approved allowlist changes for service-role usage'},
    @{name='allowlist-approved'; color='5319e7'; description='Alternate label accepted by allowlist guard workflow'},
    @{name='high-priority'; color='b60205'; description='High priority security fix'}
)

foreach ($lbl in $labels) {
    $name = $lbl.name
    $color = $lbl.color
    $desc = $lbl.description

    Write-Host "Creating/updating label: $name"
    gh label create $name --color $color --description "${desc}" --force 2>$null
}

Write-Host "Done. Verify labels at: https://github.com/<owner>/<repo>/labels"
