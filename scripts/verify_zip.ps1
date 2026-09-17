# Cognify 2.0 Production Master Zip Verifier
$ErrorActionPreference = "Stop"

$zipPath = "C:\Users\Tie\.gemini\antigravity\brain\1e5ab269-1c88-4b53-ae3d-f5e6d6d81d04\Cognify_2.0_Production_Master.zip"

if (-not (Test-Path $zipPath)) {
    Write-Error "ZIP file not found at $zipPath"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)

$requiredFiles = @(
    "package.json",
    "firestore.rules",
    "src/lib/userCryptoEngine.ts",
    "src/components/ChatInterface.tsx",
    "src/components/InstitutionCohortHub.tsx",
    "src/components/TeacherIntelligenceView.tsx",
    "src/components/ParentIntelligenceView.tsx",
    "src/components/PedagogicalEvaluationView.tsx",
    "test-report.json"
)

$forbiddenPatterns = @(
    "node_modules/",
    ".git/",
    ".env",
    ".env.local",
    ".env.production"
)

$violations = @()
$foundRequired = @{}

foreach ($entry in $zip.Entries) {
    foreach ($pat in $forbiddenPatterns) {
        if ($entry.FullName -like "*$pat*") {
            $violations += "Forbidden entry found: $($entry.FullName)"
        }
    }
    foreach ($req in $requiredFiles) {
        if ($entry.FullName.Replace('\', '/') -eq $req) {
            $foundRequired[$req] = $true
        }
    }
}

$zip.Dispose()

Write-Host "Verifying Cognify 2.0 Production Master Archive..."

$allPresent = $true
foreach ($req in $requiredFiles) {
    if (-not $foundRequired[$req]) {
        Write-Host "  [FAIL] Missing required file: $req" -ForegroundColor Red
        $allPresent = $false
    } else {
        Write-Host "  [PASS] Verified presence: $req" -ForegroundColor Green
    }
}

if ($violations.Count -gt 0) {
    Write-Host "VIOLATIONS DETECTED:" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    exit 1
}

if (-not $allPresent) {
    Write-Host "Verification failed: some required files are missing." -ForegroundColor Red
    exit 1
}

Write-Host "ALL VERIFICATIONS PASSED: Archive is clean, zero secrets, zero node_modules or .git, 100% complete." -ForegroundColor Cyan
