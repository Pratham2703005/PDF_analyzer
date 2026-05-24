#!/usr/bin/env bash
# Deploy the pdf-extractor Lambda to ministack.
# Requires: Maven, AWS CLI, ministack running on http://localhost:4566.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAMBDA_DIR="$REPO_ROOT/lambda/pdf-extractor"
JAR_PATH="$LAMBDA_DIR/target/pdf-extractor.jar"
FUNCTION_NAME="pdf-extractor"
ENDPOINT="http://localhost:4566"

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"

echo "Building Lambda jar..."
(cd "$LAMBDA_DIR" && mvn package -q)

if [ ! -f "$JAR_PATH" ]; then
    echo "Build did not produce $JAR_PATH" >&2
    exit 1
fi

if aws --endpoint-url="$ENDPOINT" lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
    echo "Updating existing function code..."
    aws --endpoint-url="$ENDPOINT" lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file "fileb://$JAR_PATH"
else
    echo "Creating function..."
    aws --endpoint-url="$ENDPOINT" lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime java17 \
        --handler "com.pdfanalyzer.ExtractHandler::handleRequest" \
        --memory-size 1024 \
        --timeout 60 \
        --role "arn:aws:iam::000000000000:role/lambda-role" \
        --zip-file "fileb://$JAR_PATH"
fi

echo "Done. Function '$FUNCTION_NAME' deployed to ministack."
