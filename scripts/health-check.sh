#!/bin/bash
# Health check script for the dev server
# Usage: ./scripts/health-check.sh

PORT=3000
HEALTH_URL="http://localhost:$PORT/api/health"

echo "Checking server health at $HEALTH_URL..."

# Check if server is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server is healthy (HTTP $HTTP_CODE)"
    
    # Get detailed health info
    HEALTH_DATA=$(curl -s "$HEALTH_URL" 2>/dev/null)
    echo ""
    echo "Server Details:"
    echo "$HEALTH_DATA" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_DATA"
    
    exit 0
else
    echo "❌ Server is unhealthy or not responding (HTTP $HTTP_CODE)"
    echo ""
    echo "Checking if process is running..."
    
    # Check if tsx process is running
    if pgrep -f "tsx watch server/_core/index.ts" > /dev/null; then
        echo "⚠️  Server process is running but not responding"
        echo "   This indicates a crash or hang. Restart required."
    else
        echo "❌ Server process is not running"
        echo "   Server needs to be started."
    fi
    
    exit 1
fi
