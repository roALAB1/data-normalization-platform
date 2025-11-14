# PgBouncer Setup Guide

**Version:** 1.0.0  
**Last Updated:** November 14, 2025  
**Author:** Infrastructure Team

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Monitoring](#monitoring)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Plan](#rollback-plan)

---

## Overview

PgBouncer is a lightweight connection pooler for PostgreSQL and MySQL databases. It maintains a pool of persistent database connections and efficiently distributes them to application clients.

### Benefits

- **10x Connection Capacity:** Handle 1,000+ concurrent users with only 20 database connections
- **50% Faster Queries:** Eliminate connection overhead (50-100ms per query)
- **Resource Efficiency:** Reduce database memory and CPU usage
- **Improved Reliability:** Prevent connection exhaustion and timeouts

### How It Works

```
Application (1000 clients)
         ↓
    PgBouncer
         ↓
   Database (20 connections)
```

Instead of creating a new database connection for each request, PgBouncer maintains a pool of persistent connections and assigns them to clients as needed.

---

## Prerequisites

- Docker and Docker Compose installed
- MySQL database accessible from your server
- Database credentials (username, password, host, port, database name)
- Port 6432 available on your server

---

## Installation

### Step 1: Deploy PgBouncer Container

```bash
# Navigate to project directory
cd /home/ubuntu/name-normalization-demo

# Start PgBouncer
docker-compose -f docker-compose.pgbouncer.yml up -d

# Verify PgBouncer is running
docker ps | grep pgbouncer
```

Expected output:
```
CONTAINER ID   IMAGE                        STATUS         PORTS
abc123def456   edoburu/pgbouncer:latest    Up 5 seconds   0.0.0.0:6432->5432/tcp
```

### Step 2: Check PgBouncer Logs

```bash
docker logs pgbouncer-normalization
```

Expected output:
```
2025-11-14 12:00:00.000 UTC [1] LOG kernel file descriptor limit: 1048576 (hard: 1048576); max_client_conn: 1000, max expected fd use: 1020
2025-11-14 12:00:00.001 UTC [1] LOG listening on 0.0.0.0:5432
2025-11-14 12:00:00.002 UTC [1] LOG process up: PgBouncer 1.21.0, libevent 2.1.12-stable
```

### Step 3: Update Environment Variables

Copy the example environment file:

```bash
cp .env.pgbouncer.example .env
```

Update your `.env` file:

```bash
# BEFORE (direct connection):
DATABASE_URL=mysql://user:pass@database-host:3306/dbname

# AFTER (through PgBouncer):
DATABASE_URL=mysql://user:pass@localhost:6432/dbname
```

**Important:** Only change the **host** and **port**. Keep the same username, password, and database name.

### Step 4: Restart Application

```bash
# Restart your application to use the new DATABASE_URL
pnpm dev

# Or in production:
pm2 restart app
```

---

## Configuration

### Connection Pool Settings

The following settings are configured in `docker-compose.pgbouncer.yml`:

| Setting | Default | Description |
|---------|---------|-------------|
| `POOL_MODE` | `transaction` | Pooling mode (transaction, session, statement) |
| `DEFAULT_POOL_SIZE` | `20` | Number of persistent database connections |
| `MIN_POOL_SIZE` | `5` | Minimum connections to keep warm |
| `RESERVE_POOL_SIZE` | `5` | Reserve connections for urgent requests |
| `MAX_CLIENT_CONN` | `1000` | Maximum client connections allowed |
| `MAX_DB_CONNECTIONS` | `25` | Maximum connections per database |

### Pool Modes Explained

**Transaction Mode (Recommended):**
- One database connection per transaction
- Best balance of performance and safety
- Works with most applications

**Session Mode (Safest):**
- One database connection per client session
- Required for applications using session-level features
- Lower connection efficiency

**Statement Mode (Most Aggressive):**
- One database connection per SQL statement
- Highest connection efficiency
- Use with caution (may break some applications)

### Tuning for Different Workloads

**High-Throughput Applications:**
```yaml
POOL_MODE=transaction
DEFAULT_POOL_SIZE=50
MAX_CLIENT_CONN=2000
```

**Long-Running Queries:**
```yaml
POOL_MODE=session
DEFAULT_POOL_SIZE=20
QUERY_TIMEOUT=300
```

**Read-Heavy Workloads:**
```yaml
POOL_MODE=transaction
DEFAULT_POOL_SIZE=30
RESERVE_POOL_SIZE=10
```

---

## Testing

### Test 1: Basic Connectivity

```bash
# Test connection to PgBouncer
mysql -h localhost -P 6432 -u your_username -p

# If successful, you should see:
# Welcome to the MySQL monitor...
```

### Test 2: Run Performance Tests

```bash
# Run connection pool tests
pnpm test tests/connection-pool.test.ts
```

Expected output:
```
✓ should be able to connect to PgBouncer
✓ should handle 10 concurrent queries efficiently (245ms)
✓ should handle 50 concurrent queries efficiently (892ms)
✓ should handle 100 concurrent queries efficiently (1654ms)
✓ should reuse connections (second query faster than first)
```

### Test 3: Check Pool Statistics

```bash
# Query PgBouncer statistics
curl http://localhost:3000/api/trpc/monitoring.connectionPoolStats | jq
```

Expected output:
```json
{
  "available": true,
  "activeConnections": 3,
  "idleConnections": 17,
  "waitingClients": 0,
  "poolUtilization": 15.0
}
```

---

## Monitoring

### Health Check Endpoint

```bash
# Check connection pool health
curl http://localhost:3000/api/trpc/monitoring.connectionPoolHealth
```

Response:
```json
{
  "healthy": true,
  "activeConnections": 5,
  "idleConnections": 15,
  "waitingClients": 0,
  "poolUtilization": 25.0,
  "message": "Connection pool healthy"
}
```

### Prometheus Metrics

```bash
# View Prometheus metrics
curl http://localhost:3000/metrics | grep connection_pool
```

Key metrics:
```
# Active connections
connection_pool_active_connections 5

# Idle connections
connection_pool_idle_connections 15

# Waiting clients (should be 0)
connection_pool_waiting_clients 0

# Pool utilization (should be < 90%)
connection_pool_utilization_percent 25.0

# Total queries processed
connection_pool_queries_total{status="success"} 15234
connection_pool_queries_total{status="error"} 12
```

### PgBouncer Admin Console

```bash
# Connect to PgBouncer admin console
docker exec -it pgbouncer-normalization psql -p 6432 -U pgbouncer pgbouncer

# Show pool statistics
pgbouncer=# SHOW POOLS;

# Show database statistics
pgbouncer=# SHOW DATABASES;

# Show client connections
pgbouncer=# SHOW CLIENTS;

# Show server connections
pgbouncer=# SHOW SERVERS;

# Show statistics
pgbouncer=# SHOW STATS;
```

### Grafana Dashboard (Optional)

If you have Prometheus + Grafana set up:

1. Import PgBouncer dashboard template
2. Configure data source to Prometheus
3. View real-time connection pool metrics

---

## Performance Tuning

### Identifying Bottlenecks

**Symptom:** High pool utilization (>80%)
```bash
# Check pool utilization
curl http://localhost:3000/api/trpc/monitoring.connectionPoolHealth | jq .poolUtilization
```

**Solution:** Increase pool size
```yaml
DEFAULT_POOL_SIZE=30  # Increase from 20
MAX_DB_CONNECTIONS=35  # Must be >= DEFAULT_POOL_SIZE + RESERVE_POOL_SIZE
```

---

**Symptom:** Waiting clients (>0)
```bash
# Check waiting clients
curl http://localhost:3000/api/trpc/monitoring.connectionPoolHealth | jq .waitingClients
```

**Solution:** Increase pool size or optimize queries
```yaml
DEFAULT_POOL_SIZE=30
RESERVE_POOL_SIZE=10
```

---

**Symptom:** Slow query performance
```bash
# Check query duration metrics
curl http://localhost:3000/metrics | grep connection_pool_query_duration
```

**Solution:** Increase minimum pool size to keep connections warm
```yaml
MIN_POOL_SIZE=10  # Increase from 5
```

---

### Optimal Configuration Calculator

Use this formula to calculate optimal pool size:

```
DEFAULT_POOL_SIZE = (peak_concurrent_users / avg_query_duration_ms) * 100
```

Example:
- Peak concurrent users: 200
- Average query duration: 50ms

```
DEFAULT_POOL_SIZE = (200 / 50) * 100 = 400
```

However, most applications work well with 20-50 connections.

---

## Troubleshooting

### Problem: PgBouncer won't start

**Symptoms:**
- `docker ps` doesn't show PgBouncer container
- Container exits immediately after starting

**Diagnosis:**
```bash
# Check container logs
docker logs pgbouncer-normalization

# Check if port 6432 is already in use
sudo netstat -tulpn | grep 6432
```

**Solutions:**
1. Check DATABASE_URL is valid
2. Ensure port 6432 is not in use
3. Verify Docker has network access to database

---

### Problem: Application can't connect to database

**Symptoms:**
- Connection timeout errors
- "Can't connect to MySQL server" errors

**Diagnosis:**
```bash
# Test direct connection to PgBouncer
mysql -h localhost -P 6432 -u your_username -p

# Check PgBouncer logs
docker logs pgbouncer-normalization
```

**Solutions:**
1. Verify DATABASE_URL uses port 6432 (not 3306)
2. Check PgBouncer is running: `docker ps`
3. Verify database credentials are correct
4. Check firewall allows port 6432

---

### Problem: Pool exhausted (waiting clients)

**Symptoms:**
- `waitingClients > 0` in health check
- Slow query performance
- Connection timeout errors

**Diagnosis:**
```bash
# Check pool utilization
curl http://localhost:3000/api/trpc/monitoring.connectionPoolHealth

# Check PgBouncer stats
docker exec -it pgbouncer-normalization psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

**Solutions:**
1. Increase `DEFAULT_POOL_SIZE`
2. Increase `MAX_DB_CONNECTIONS`
3. Optimize slow queries
4. Check for connection leaks in application code

---

### Problem: High memory usage

**Symptoms:**
- PgBouncer container using excessive memory
- System running out of memory

**Diagnosis:**
```bash
# Check container memory usage
docker stats pgbouncer-normalization
```

**Solutions:**
1. Reduce `MAX_CLIENT_CONN`
2. Reduce `DEFAULT_POOL_SIZE`
3. Enable connection timeout settings
4. Investigate memory leaks in application

---

### Problem: Queries failing with "transaction aborted"

**Symptoms:**
- Queries fail with transaction errors
- Inconsistent query results

**Diagnosis:**
```bash
# Check pool mode
docker exec -it pgbouncer-normalization env | grep POOL_MODE
```

**Solutions:**
1. Change pool mode to `session` (safer but less efficient)
2. Ensure application properly commits/rolls back transactions
3. Check for long-running transactions

---

## Rollback Plan

If you need to revert to direct database connections:

### Step 1: Update Environment Variable

```bash
# Change DATABASE_URL back to direct connection
# FROM: DATABASE_URL=mysql://user:pass@localhost:6432/dbname
# TO:   DATABASE_URL=mysql://user:pass@database-host:3306/dbname
```

### Step 2: Restart Application

```bash
pnpm dev

# Or in production:
pm2 restart app
```

### Step 3: Stop PgBouncer (Optional)

```bash
# Stop PgBouncer container
docker-compose -f docker-compose.pgbouncer.yml down

# Or just stop without removing
docker stop pgbouncer-normalization
```

### Step 4: Verify Direct Connection

```bash
# Test direct database connection
mysql -h database-host -P 3306 -u your_username -p
```

**Rollback Time:** ~5 minutes  
**Risk:** Low (simple environment variable change)

---

## Best Practices

1. **Start with conservative settings** - Use default pool size of 20, increase only if needed
2. **Monitor pool utilization** - Keep utilization below 80% for headroom
3. **Use transaction mode** - Best balance of performance and safety
4. **Set up alerting** - Alert when `waitingClients > 0` or `poolUtilization > 80%`
5. **Test before production** - Run load tests in staging environment
6. **Document configuration** - Keep notes on why you chose specific settings
7. **Regular monitoring** - Check pool metrics weekly
8. **Plan for growth** - Increase pool size before hitting capacity

---

## Additional Resources

- [PgBouncer Official Documentation](https://www.pgbouncer.org/usage.html)
- [Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Infrastructure Implementation Guide](../INFRASTRUCTURE_IMPLEMENTATION_GUIDE.md)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review PgBouncer logs: `docker logs pgbouncer-normalization`
3. Check application logs for connection errors
4. Contact infrastructure team

---

**Last Updated:** November 14, 2025  
**Next Review:** December 14, 2025
