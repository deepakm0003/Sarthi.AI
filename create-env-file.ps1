# PowerShell script to help create .env.local file for Firebase configuration
# Run this script in PowerShell: .\create-env-file.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Environment Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envFilePath = Join-Path $PSScriptRoot ".env.local"

# Check if .env.local already exists
if (Test-Path $envFilePath) {
    Write-Host "⚠️  .env.local file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Cancelled. Existing file will not be modified." -ForegroundColor Yellow
        exit
    }
}

Write-Host "Please enter your Firebase configuration values:" -ForegroundColor Green
Write-Host "(You can find these in Firebase Console > Project Settings > Your apps)" -ForegroundColor Gray
Write-Host ""

# Get Firebase values from user
$apiKey = Read-Host "NEXT_PUBLIC_FIREBASE_API_KEY"
$authDomain = Read-Host "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
$projectId = Read-Host "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
$storageBucket = Read-Host "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
$messagingSenderId = Read-Host "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
$appId = Read-Host "NEXT_PUBLIC_FIREBASE_APP_ID"

# Validate that values are not empty
if ([string]::IsNullOrWhiteSpace($apiKey) -or 
    [string]::IsNullOrWhiteSpace($authDomain) -or 
    [string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ Error: Required fields cannot be empty!" -ForegroundColor Red
    exit 1
}

# Create .env.local content
$envContent = @"
# Firebase Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_FIREBASE_API_KEY=$apiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$authDomain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$projectId
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$storageBucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$messagingSenderId
NEXT_PUBLIC_FIREBASE_APP_ID=$appId
"@

# Write to file
try {
    $envContent | Out-File -FilePath $envFilePath -Encoding utf8 -NoNewline
    Write-Host ""
    Write-Host "✅ Success! .env.local file created successfully!" -ForegroundColor Green
    Write-Host "📍 Location: $envFilePath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart your development server (npm run dev)" -ForegroundColor White
    Write-Host "2. Open http://localhost:3000 in your browser" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Error creating .env.local file: $_" -ForegroundColor Red
    exit 1
}
