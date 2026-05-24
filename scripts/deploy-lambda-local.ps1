# Deploy the pdf-extractor Lambda to ministack.
# Requires: Maven, AWS CLI, ministack running on http://localhost:4566.

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$LambdaDir = Join-Path $RepoRoot "lambda\pdf-extractor"
$JarPath = Join-Path $LambdaDir "target\pdf-extractor.jar"
$FunctionName = "pdf-extractor"
$Endpoint = "http://localhost:4566"

$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_DEFAULT_REGION = "us-east-1"

Write-Host "Building Lambda jar..."
Push-Location $LambdaDir
try {
    mvn package -q
} finally {
    Pop-Location
}

if (-not (Test-Path $JarPath)) {
    throw "Build did not produce $JarPath"
}

Write-Host "Checking if function exists..."
$exists = $false
try {
    aws --endpoint-url=$Endpoint lambda get-function --function-name $FunctionName 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $exists = $true }
} catch {
    $exists = $false
}

if ($exists) {
    Write-Host "Updating existing function code..."
    aws --endpoint-url=$Endpoint lambda update-function-code `
        --function-name $FunctionName `
        --zip-file "fileb://$JarPath"
} else {
    Write-Host "Creating function..."
    aws --endpoint-url=$Endpoint lambda create-function `
        --function-name $FunctionName `
        --runtime java17 `
        --handler "com.pdfanalyzer.ExtractHandler::handleRequest" `
        --memory-size 1024 `
        --timeout 60 `
        --role "arn:aws:iam::000000000000:role/lambda-role" `
        --zip-file "fileb://$JarPath"
}

Write-Host "Done. Function '$FunctionName' deployed to ministack."
