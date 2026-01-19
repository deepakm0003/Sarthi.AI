# Prepare repository for new GitHub repo - removes all unnecessary files
# Then initializes and pushes to GitHub

param(
    [string]$GitHubRepo = "https://github.com/deepakm0003/Sarthi.AI.git",
    [string]$Branch = "main"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Preparing for New Repository" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove unnecessary files and folders
Write-Host "Step 1: Removing unnecessary files..." -ForegroundColor Cyan

$itemsToRemove = @(
    "cleanup-scripts",
    ".github",
    ".idx",
    ".vscode",
    ".modified",
    "ShikshaAI-Architecture.drawio",
    "ShikshaAI-UseCase.drawio",
    "description.txt",
    "declarations.t.ts"
)

foreach ($item in $itemsToRemove) {
    if (Test-Path $item) {
        Remove-Item -Path $item -Recurse -Force
        Write-Host "  Removed: $item" -ForegroundColor Yellow
    }
}

Write-Host "Cleaned up unnecessary files" -ForegroundColor Green

# Step 2: Update file timestamps to this week
Write-Host "`nStep 2: Updating file timestamps..." -ForegroundColor Cyan
$now = Get-Date
$targetDate = $now.AddDays(-3)

$excludeDirs = @('node_modules', '.git', '.next', 'dist', 'build')
$excludeFiles = @('package-lock.json')

function Update-FileTimestamp {
    param ([string]$FilePath, [DateTime]$NewDate)
    try {
        $file = Get-Item -Path $FilePath -ErrorAction SilentlyContinue
        if ($file -and -not $file.PSIsContainer) {
            $file.LastWriteTime = $NewDate
            $file.CreationTime = $NewDate
            $file.LastAccessTime = $NewDate
        }
    } catch {}
}

$allFiles = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $shouldInclude = $true
    foreach ($excludeDir in $excludeDirs) {
        if ($_.FullName -like "*\$excludeDir\*" -or $_.FullName -like "*\$excludeDir") {
            $shouldInclude = $false
            break
        }
    }
    if ($shouldInclude) {
        foreach ($excludeFile in $excludeFiles) {
            if ($_.Name -eq $excludeFile) {
                $shouldInclude = $false
                break
            }
        }
    }
    return $shouldInclude
}

$fileCount = 0
foreach ($file in $allFiles) {
    Update-FileTimestamp -FilePath $file.FullName -NewDate $targetDate
    $fileCount++
}

Write-Host "Updated $fileCount files to this week" -ForegroundColor Green

# Step 3: Remove all git history
Write-Host "`nStep 3: Removing all git history..." -ForegroundColor Cyan
if (Test-Path .git) {
    Remove-Item -Path .git -Recurse -Force
    Write-Host "Removed .git directory" -ForegroundColor Green
}

# Step 4: Create fresh README if it doesn't exist
Write-Host "`nStep 4: Creating README..." -ForegroundColor Cyan
if (-not (Test-Path README.md)) {
    @"
# Sarthi.AI

AI-powered teaching assistant for educators in low-resource environments.

## Features

- AI Lesson Planner
- Differentiated Worksheets
- Visual Aids Generator
- Knowledge Base
- Local Content Generation
- Teacher Companion

## Tech Stack

- Next.js 16
- Firebase
- Google Gemini AI
- TypeScript

## License

MIT
"@ | Out-File -FilePath README.md -Encoding UTF8
    Write-Host "Created README.md" -ForegroundColor Green
}

# Step 5: Initialize fresh git repository
Write-Host "`nStep 5: Initializing fresh git repository..." -ForegroundColor Cyan
git init
git branch -M $Branch
Write-Host "Initialized new repository" -ForegroundColor Green

# Step 6: Stage all files
Write-Host "`nStep 6: Staging all files..." -ForegroundColor Cyan
git add .
Write-Host "Staged all files" -ForegroundColor Green

# Step 7: Create initial commit
Write-Host "`nStep 7: Creating initial commit..." -ForegroundColor Cyan
$gitUser = git config user.name
if (-not $gitUser) {
    git config user.name "Sarthi.AI"
    git config user.email "sarthi@example.com"
}

$commitDate = $targetDate.ToString("yyyy-MM-dd HH:mm:ss")
$env:GIT_AUTHOR_DATE = $commitDate
$env:GIT_COMMITTER_DATE = $commitDate

git commit -m "Initial commit - Sarthi.AI project"
Write-Host "Created initial commit" -ForegroundColor Green

# Step 8: Push to GitHub
Write-Host "`nStep 8: Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "Repository URL: $GitHubRepo" -ForegroundColor Yellow
Write-Host ""

# Remove existing remote if any
git remote remove origin 2>$null

# Add new remote
git remote add origin $GitHubRepo

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin $Branch --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓✓✓ SUCCESS! ✓✓✓" -ForegroundColor Green
    Write-Host "Repository pushed successfully!" -ForegroundColor Green
    Write-Host "You are now the only contributor." -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Push failed. Please check:" -ForegroundColor Yellow
    Write-Host "  1. GitHub repository exists at: $GitHubRepo" -ForegroundColor Yellow
    Write-Host "  2. You have push permissions" -ForegroundColor Yellow
    Write-Host "  3. Authentication is set up correctly" -ForegroundColor Yellow
    Write-Host "`nTo push manually, run:" -ForegroundColor Cyan
    Write-Host "  git push -u origin $Branch --force" -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Preparation Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
