#!/bin/bash

echo "🔍 AREA Docker Validation"
echo "========================="
echo ""

check_url() {
    local name=$1
    local url=$2
    if curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -q "200"; then
        echo "✅ $name"
    else
        echo "❌ $name"
    fi
}

if ! docker compose ps | grep -q "running"; then
    echo "❌ Services not running. Run: docker compose up -d"
    exit 1
fi

echo "Services status:"
docker compose ps
echo ""

echo "Endpoints:"
check_url "Backend /about.json" "http://localhost:8080/about.json"
check_url "Web Client" "http://localhost:8081"
check_url "APK Download" "http://localhost:8081/client.apk"

echo ""
echo "✅ Validation complete"

