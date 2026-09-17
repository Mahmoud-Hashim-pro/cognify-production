# Cognify 2.0 Production Master Packager
$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
$destZip = "C:\Users\Tie\.gemini\antigravity\brain\1e5ab269-1c88-4b53-ae3d-f5e6d6d81d04\Cognify_2.0_Production_Master.zip"
$tempDir = Join-Path $env:TEMP ("cognify_pkg_" + [Guid]::NewGuid().ToString("N"))

Write-Host "📦 Packaging Cognify 2.0 Production Master..."
Write-Host "📁 Source: $repoRoot"
Write-Host "📁 Staging: $tempDir"
Write-Host "📦 Target: $destZip"

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$excludeDirs = @('.git', 'node_modules', 'dist', '.vite', '.vscode')
$excludeFiles = @('.env', '.env.local', '.env.production', '*.tmp', '*.log', '*.zip')

Get-ChildItem -Path $repoRoot -Force | ForEach-Object {
    $item = $_
    if ($item.PSIsContainer) {
        if ($excludeDirs -notcontains $item.Name) {
            Copy-Item -Path $item.FullName -Destination (Join-Path $tempDir $item.Name) -Recurse -Force
        }
    } else {
        $skip = $false
        foreach ($pattern in $excludeFiles) {
            if ($item.Name -like $pattern) {
                $skip = $true
                break
            }
        }
        if (-not $skip) {
            Copy-Item -Path $item.FullName -Destination (Join-Path $tempDir $item.Name) -Force
        }
    }
}

# Clean any nested excluded items that might have been copied
Get-ChildItem -Path $tempDir -Include '.env*', '*.log' -Recurse -Force | Remove-Item -Force -Recurse

if (Test-Path $destZip) {
    Remove-Item $destZip -Force
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $destZip -CompressionLevel Optimal
Remove-Item -Path $tempDir -Recurse -Force

$zipSize = (Get-Item $destZip).Length / 1MB
Write-Host "✅ Cognify 2.0 Production Master packaged successfully ($([math]::Round($zipSize, 2)) MB)"
