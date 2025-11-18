#!/bin/bash
# Foolproof server restart script
# Usage: ./scripts/restart-server.sh

set -e

echo "🔄 Restarting development server..."
echo ""

# Step 1: Kill all existing tsx/node processes for this project
echo "1️⃣  Stopping existing server processes..."
pkill -f "tsx watch server/_core/index.ts" 2>/dev/null || echo "   No existing server process found"
sleep 2

# Step 2: Verify port 3000 is free
echo ""
echo "2️⃣  Checking if port 3000 is available..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ⚠️  Port 3000 is still in use, forcefully killing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi
echo "   ✅ Port 3000 is available"

# Step 3: Clear any stuck Redis jobs (optional but helpful)
echo ""
echo "3️⃣  Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "   ✅ Redis is running"
    
    # Optional: Clear stuck jobs
    STUCK_JOBS=$(redis-cli KEYS "bull:*:stalled" 2>/dev/null | wc -l)
    if [ "$STUCK_JOBS" -gt 0 ]; then
        echo "   ⚠️  Found $STUCK_JOBS stalled jobs, cleaning up..."
        redis-cli KEYS "bull:*:stalled" | xargs redis-cli DEL 2>/dev/null || true
    fi
else
    echo "   ⚠️  Redis is not running (jobs will not work)"
fi

# Step 4: Start the server
echo ""
echo "4️⃣  Starting development server..."
cd /home/ubuntu/name-normalization-demo

# Start in background with nohup
nohup pnpm dev > /tmp/server.log 2>&1 &
SERVER_PID=$!

echo "   Server starting with PID: $SERVER_PID"
echo "   Logs: /tmp/server.log"

# Step 5: Wait for server to be ready
echo ""
echo "5️⃣  Waiting for server to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 1
    ATTEMPT=$((ATTEMPT + 1))
    
    # Check if health endpoint responds
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "   ✅ Server is ready!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Server successfully restarted!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📊 Server Status:"
        curl -s http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null || echo "Health check OK"
        echo ""
        echo "🌐 Access your app at: http://localhost:3000"
        echo "📝 View logs: tail -f /tmp/server.log"
        echo ""
        exit 0
    fi
    
    printf "   Attempt %d/%d...\r" $ATTEMPT $MAX_ATTEMPTS
done

echo ""
echo "❌ Server failed to start after $MAX_ATTEMPTS seconds"
echo ""
echo "Last 20 lines of server log:"
tail -20 /tmp/server.log
exit 1
