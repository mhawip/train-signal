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
$PauseFile  = Join-Path $PSScriptRoot 'PAUSE'

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

# Hitting a subscription usage limit is not a failure - the iteration never started.
# Counting it as one trips the three-strikes abort and stops the loop for the day, so
# instead we read the reset time out of the message and sleep until then.
function Get-ResumeTime {
    param([string]$Text)

    # "You've hit your limit <sep> resets 2:20pm (Europe/London)". The separator is a
    # non-ASCII character that mangles in the console, so match on the time alone.
    if ($Text -match 'resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)') {
        $hour   = [int]$Matches[1]
        $minute = if ($Matches[2]) { [int]$Matches[2] } else { 0 }
        if ($Matches[3] -eq 'pm' -and $hour -ne 12) { $hour += 12 }
        if ($Matches[3] -eq 'am' -and $hour -eq 12) { $hour  = 0  }

        $target = (Get-Date).Date.AddHours($hour).AddMinutes($minute)
        if ($target -le (Get-Date)) { $target = $target.AddDays(1) }  # reset is tomorrow
        return $target.AddMinutes(2)                                  # clear the boundary
    }

    # Unparseable. An hour is long enough not to thrash, short enough not to lose a day.
    return (Get-Date).AddHours(1)
}

function Wait-Until {
    param([datetime]$Target)

    # Cap it. A misread time should cost an hour, never an unattended day.
    $ceiling = (Get-Date).AddHours(6)
    if ($Target -gt $ceiling) { $Target = $ceiling }

    Write-Host ''
    Write-Host "  Usage limit reached. Waiting until $($Target.ToString('HH:mm')) (Ctrl-C to stop)." -ForegroundColor Yellow

    while ((Get-Date) -lt $Target) {
        Write-Host ("`r  Resuming in {0:hh\:mm\:ss}   " -f ($Target - (Get-Date))) -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Seconds 15
        if (Test-Path $PauseFile) { break }   # a pause requested during the wait wins
    }
    Write-Host ''
}

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
Write-Host "  Pause:      New-Item $PauseFile" -ForegroundColor DarkGray
Write-Host '  ------------------------------------------------' -ForegroundColor DarkGray
Write-Host ''

while ($true) {
    # Pausing on an iteration boundary, rather than Ctrl-C mid-task, is the safe way to
    # stop. Nothing is in flight, so nothing is half-done - and it gives you a window to
    # edit PLAN.md or the brief without step 5's `git add -A` sweeping the edit into an
    # unrelated PR. Create the file from any window, at any time, including mid-iteration.
    if (Test-Path $PauseFile) {
        Write-Host ''
        Write-Host "  Paused. Delete $PauseFile to resume (Ctrl-C to stop)." -ForegroundColor Yellow
        while (Test-Path $PauseFile) { Start-Sleep -Seconds 5 }
        Write-Host '  Resumed.' -ForegroundColor Green
        Write-Host ''
    }

    $iteration++
    if ($MaxIterations -gt 0 -and $iteration -gt $MaxIterations) {
        Write-Host "`n  Reached $MaxIterations iterations. Stopping." -ForegroundColor Cyan
        break
    }

    $stamp   = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logFile = Join-Path $LogDir ("iteration-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

    Write-Host "  [$stamp] Iteration $iteration starting..." -ForegroundColor Green

    try {
        # Clear both explicitly. Otherwise a silent iteration inherits the previous one's
        # output, which logs the wrong thing and - worse - can re-trigger the usage-limit
        # wait on a stale message.
        $captured = $null
        $exitCode = $null

        # Write the log header before invoking. `Tee-Object -FilePath` creates no file at
        # all when the command produces no output, so an iteration that dies silently used
        # to leave zero trace - exactly the failure you most need a record of.
        Set-Content -Path $logFile -Encoding utf8 -Value "=== iteration $iteration - $stamp ==="

        try {
            # ErrorActionPreference is relaxed across the call. With 2>&1, PowerShell wraps
            # native stderr in ErrorRecords, and under 'Stop' a single stderr line becomes a
            # terminating error - so an ordinary warning would abort the whole iteration.
            $ErrorActionPreference = 'Continue'

            # Fresh context every time - that is the whole point of the pattern.
            # --dangerously-skip-permissions is required for unattended running; the
            # guard rails are the CI gates and the git workflow, not interactive prompts.
            #
            # Tee to a variable rather than the file, so the output is still streamed live
            # but is also in hand afterwards, whether or not there was any of it.
            claude -p $prompt `
                --dangerously-skip-permissions `
                --output-format text 2>&1 | Tee-Object -Variable captured

            $exitCode = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = 'Stop'
        }

        $output = ($captured | Out-String)
        Add-Content -Path $logFile -Encoding utf8 -Value $output
        Add-Content -Path $logFile -Encoding utf8 -Value "=== exit code: $exitCode ==="

        if ($output -match 'hit your limit') {
            $resumeAt = Get-ResumeTime $output

            # -Once is a deliberate single test run. Silently sleeping for hours when the
            # user asked for one iteration would be a surprise, so just report and stop.
            if ($Once) {
                Write-Host "  [$stamp] Usage limit reached - no work was done." -ForegroundColor Yellow
                Write-Host "  Limit resets at $($resumeAt.ToString('HH:mm')). Re-run after that." -ForegroundColor Yellow
                break
            }

            $iteration--   # this attempt did nothing; don't spend it against -MaxIterations
            Wait-Until $resumeAt
            continue
        }

        if ($exitCode -eq 0) {
            Write-Host "  [$stamp] Iteration $iteration complete." -ForegroundColor Green
            $failures = 0
        } else {
            $failures++
            Write-Host "  [$stamp] Iteration $iteration exited with code $exitCode (consecutive failures: $failures)." -ForegroundColor Yellow
            if ([string]::IsNullOrWhiteSpace($output)) {
                Write-Host '  It produced no output at all. Most likely CLAUDECODE is set - claude refuses' -ForegroundColor Yellow
                Write-Host '  to start inside another Claude Code session. Use a standalone terminal.' -ForegroundColor Yellow
            }
            Write-Host "  Log: $logFile" -ForegroundColor DarkGray
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
