<#
.SYNOPSIS
    Ralph loop runner for Train Signal.

.DESCRIPTION
    Repeatedly invokes Claude Code with a fresh context against agent/prompts/ralph.md.
    Each iteration picks one task from agent/PLAN.md, completes it, records it, exits.

    State lives on disk, so this is safe to stop and restart at any time.

.PARAMETER Once
    Run a single iteration and stop. Use this the first time.

.PARAMETER MaxIterations
    Stop after this many iterations. 0 means run until stopped.

.PARAMETER DelaySeconds
    Pause between iterations. Gives you a window to Ctrl-C.

.EXAMPLE
    ./agent/ralph.ps1 -Once
    ./agent/ralph.ps1 -MaxIterations 10
    ./agent/ralph.ps1
#>

[CmdletBinding()]
param(
    [switch]$Once,
    [int]$MaxIterations = 0,
    [int]$DelaySeconds = 5
)

$ErrorActionPreference = 'Stop'

$RepoRoot   = Split-Path -Parent $PSScriptRoot
$PromptFile = Join-Path $PSScriptRoot 'prompts\ralph.md'
$JournalFile= Join-Path $PSScriptRoot 'JOURNAL.md'
$LogDir     = Join-Path $PSScriptRoot 'logs'

if (-not (Test-Path $PromptFile)) { throw "Prompt not found: $PromptFile" }
if (-not (Test-Path $LogDir))     { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

Set-Location $RepoRoot

# winget installs GitHub CLI to a location that only lands on PATH in shells started
# after the install. A loop that cannot find gh fails at the PR step every iteration
# and the reason is not obvious from the log, so resolve it here instead.
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    $ghCandidates = @(
        "$env:ProgramFiles\GitHub CLI",
        "${env:ProgramFiles(x86)}\GitHub CLI",
        "$env:LOCALAPPDATA\Programs\GitHub CLI"
    )
    foreach ($dir in $ghCandidates) {
        if (Test-Path (Join-Path $dir 'gh.exe')) {
            $env:PATH = "$dir;$env:PATH"
            Write-Host "  Found gh at $dir - added to PATH for this session." -ForegroundColor DarkGray
            break
        }
    }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host '  gh not found. Iterations will commit and push but cannot open PRs.' -ForegroundColor Yellow
    Write-Host '  Fix with: winget install GitHub.cli' -ForegroundColor Yellow
}

if ($Once) { $MaxIterations = 1 }

$prompt    = Get-Content $PromptFile -Raw
$iteration = 0
$failures  = 0

Write-Host ''
Write-Host '  Train Signal - Ralph loop' -ForegroundColor Cyan
Write-Host '  ------------------------------------------------' -ForegroundColor DarkGray
Write-Host "  Repo:       $RepoRoot" -ForegroundColor DarkGray
if ($MaxIterations -gt 0) {
    Write-Host "  Iterations: $MaxIterations" -ForegroundColor DarkGray
} else {
    Write-Host '  Iterations: unlimited (Ctrl-C to stop)' -ForegroundColor DarkGray
}
Write-Host '  ------------------------------------------------' -ForegroundColor DarkGray
Write-Host ''

while ($true) {
    $iteration++
    if ($MaxIterations -gt 0 -and $iteration -gt $MaxIterations) {
        Write-Host "`n  Reached $MaxIterations iterations. Stopping." -ForegroundColor Cyan
        break
    }

    $stamp   = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logFile = Join-Path $LogDir ("iteration-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

    Write-Host "  [$stamp] Iteration $iteration starting..." -ForegroundColor Green

    try {
        # Fresh context every time - that is the whole point of the pattern.
        # --dangerously-skip-permissions is required for unattended running; the
        # guard rails are the CI gates and the git workflow, not interactive prompts.
        claude -p $prompt `
            --dangerously-skip-permissions `
            --output-format text 2>&1 | Tee-Object -FilePath $logFile

        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-Host "  [$stamp] Iteration $iteration complete." -ForegroundColor Green
            $failures = 0
        } else {
            $failures++
            Write-Host "  [$stamp] Iteration $iteration exited with code $exitCode (consecutive failures: $failures)." -ForegroundColor Yellow
        }
    }
    catch {
        $failures++
        Write-Host "  [$stamp] Iteration $iteration threw: $_" -ForegroundColor Red
        Add-Content -Path $JournalFile -Encoding utf8 -Value @"

## $stamp - runner error
**Did:** Iteration $iteration failed to run.
**Verify:** n/a
**Learned:** Runner exception: $_
**Next:** Investigate before relying on further iterations.
"@
    }

    # Three consecutive failures means something structural is wrong. Grinding on
    # burns tokens and makes the journal useless. Stop and let a human look.
    if ($failures -ge 3) {
        Write-Host "`n  Three consecutive failures. Stopping." -ForegroundColor Red
        Write-Host "  Check agent/JOURNAL.md and $LogDir" -ForegroundColor Red
        break
    }

    if ($MaxIterations -gt 0 -and $iteration -ge $MaxIterations) { continue }

    Write-Host "  Next iteration in $DelaySeconds seconds (Ctrl-C to stop)..." -ForegroundColor DarkGray
    Start-Sleep -Seconds $DelaySeconds
}

Write-Host ''
Write-Host '  Loop finished.' -ForegroundColor Cyan
Write-Host '  Read:  agent/JOURNAL.md      what happened' -ForegroundColor DarkGray
Write-Host '  Read:  agent/QUESTIONS.md    anything waiting on you' -ForegroundColor DarkGray
Write-Host ''
