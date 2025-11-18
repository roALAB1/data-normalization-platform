# Server Management Guide

## 🚀 Most Foolproof Way to Restart the Server

### Quick Restart (Recommended)

```bash
cd /home/ubuntu/name-normalization-demo
./scripts/restart-server.sh
```

This script automatically:
- ✅ Kills all existing server processes
- ✅ Frees up port 3000
- ✅ Cleans up stuck Redis jobs
- ✅ Starts the server in the background
- ✅ Waits for server to be ready
- ✅ Verifies health check passes

---

## 📊 Check Server Health

```bash
cd /home/ubuntu/name-normalization-demo
./scripts/health-check.sh
```

This shows:
- Server status (healthy/unhealthy)
- Uptime
- Memory usage
- Process ID
- Whether server is responding

---

## 🔧 Manual Server Management

### Start Server
```bash
cd /home/ubuntu/name-normalization-demo
pnpm dev
```

### Stop Server
```bash
# Kill by process name
pkill -f "tsx watch server/_core/index.ts"

# Or kill by port
lsof -ti:3000 | xargs kill -9
```

### View Server Logs
```bash
# If started with restart-server.sh
tail -f /tmp/server.log

# If started manually, logs are in terminal
```

---

## 🩺 Health Check Endpoint

The server now has a health check endpoint at:
```
GET http://localhost:3000/api/health
```

**Response Example:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T00:31:32.717Z",
  "uptime": 10.547,
  "memory": {
    "rss": 441020416,
    "heapTotal": 197132288,
    "heapUsed": 165453448
  },
  "pid": 163018
}
```

Use this to:
- Monitor server status programmatically
- Set up automated health checks
- Debug server issues

---

## 🛡️ Error Handling Improvements

The server now includes:

### 1. Global Error Handlers
- **Uncaught exceptions** are logged but don't crash the server
- **Unhandled promise rejections** are logged but don't crash the server
- All errors are logged with full stack traces

### 2. Component-Level Error Handling
- Job queue failures don't crash the server
- CRM merge worker failures don't crash the server
- Connection pool errors don't crash the server

### 3. Server Error Handling
- Port conflicts are detected and handled
- Server errors are logged with details

---

## 🐛 Troubleshooting

### Server Won't Start

**Problem:** Port 3000 is already in use

**Solution:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Then restart
./scripts/restart-server.sh
```

---

### Server Crashes Repeatedly

**Problem:** Unhandled errors causing crashes

**Solution:**
1. Check server logs for error messages:
   ```bash
   tail -100 /tmp/server.log
   ```

2. Look for error patterns:
   - `[FATAL] Uncaught Exception:` - Synchronous error
   - `[ERROR] Unhandled Promise Rejection:` - Async error
   - `[CRMMergeWorker] Job failed:` - Job processing error

3. Share the error message for debugging

---

### Server Appears Frozen

**Problem:** Server process running but not responding

**Solution:**
```bash
# Check if server is responding
./scripts/health-check.sh

# If unhealthy, restart
./scripts/restart-server.sh
```

---

### Redis Connection Issues

**Problem:** Jobs not processing, Redis errors

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not responding, start Redis
redis-server &

# Clear stuck jobs
redis-cli KEYS "bull:*:stalled" | xargs redis-cli DEL

# Restart server
./scripts/restart-server.sh
```

---

## 📝 Common Commands

```bash
# Check server health
./scripts/health-check.sh

# Restart server (foolproof)
./scripts/restart-server.sh

# View live logs
tail -f /tmp/server.log

# Check memory usage
ps aux | grep node | grep -v grep

# Check port usage
lsof -i :3000

# Test health endpoint
curl http://localhost:3000/api/health | python3 -m json.tool
```

---

## 🔍 Monitoring

### Memory Usage
The health endpoint shows memory usage. Watch for:
- **heapUsed** growing continuously (memory leak)
- **rss** (Resident Set Size) > 1GB (high memory usage)

### Uptime
The health endpoint shows uptime in seconds. If uptime resets frequently, the server is crashing.

### Process ID
The health endpoint shows the process ID. If this changes, the server has restarted.

---

## 🚨 Emergency Recovery

If everything fails:

```bash
# Nuclear option: kill everything and restart
pkill -9 -f "tsx"
pkill -9 -f "node"
sleep 2
cd /home/ubuntu/name-normalization-demo
./scripts/restart-server.sh
```

---

## 📞 Getting Help

If the server continues to crash:

1. **Capture the error logs:**
   ```bash
   tail -200 /tmp/server.log > server-error.log
   ```

2. **Check the health status:**
   ```bash
   ./scripts/health-check.sh > health-status.txt
   ```

3. **Share both files** for debugging

---

## ✅ Best Practices

1. **Always use the restart script** instead of manually killing processes
2. **Check health before and after** making changes
3. **Monitor memory usage** if processing large files
4. **Clear stuck Redis jobs** if jobs aren't processing
5. **Keep logs** when debugging issues
