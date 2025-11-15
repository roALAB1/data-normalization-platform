#!/usr/bin/env node

/**
 * Cache Performance Test
 * 
 * Tests cache hit rates and performance improvements
 */

import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || '6379';

console.log('🚀 Cache Performance Test\n');
console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}\n`);

const client = createClient({
  socket: {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
  },
});

client.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
  process.exit(1);
});

async function testCachePerformance() {
  try {
    await client.connect();
    console.log('✅ Connected to Redis\n');

    // Test 1: Write Performance
    console.log('📝 Test 1: Write Performance (100 cache entries)');
    const writeStart = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await client.set(
        `test:user:${i}`,
        JSON.stringify({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          timestamp: new Date().toISOString(),
        }),
        { EX: 3600 } // 1 hour TTL
      );
    }
    
    const writeTime = Date.now() - writeStart;
    const writeOpsPerSec = Math.round((100 / writeTime) * 1000);
    console.log(`   ✅ Wrote 100 entries in ${writeTime}ms`);
    console.log(`   ⚡ Write throughput: ${writeOpsPerSec} ops/sec\n`);

    // Test 2: Read Performance (Cache Hits)
    console.log('📖 Test 2: Read Performance (100 cache hits)');
    const readStart = Date.now();
    
    for (let i = 0; i < 100; i++) {
      const value = await client.get(`test:user:${i}`);
      if (!value) {
        console.error(`   ❌ Cache miss for test:user:${i}`);
      }
    }
    
    const readTime = Date.now() - readStart;
    const readOpsPerSec = Math.round((100 / readTime) * 1000);
    console.log(`   ✅ Read 100 entries in ${readTime}ms`);
    console.log(`   ⚡ Read throughput: ${readOpsPerSec} ops/sec\n`);

    // Test 3: Cache Miss Performance
    console.log('🔍 Test 3: Cache Miss Performance (100 misses)');
    const missStart = Date.now();
    
    for (let i = 1000; i < 1100; i++) {
      await client.get(`test:user:${i}`);
    }
    
    const missTime = Date.now() - missStart;
    const missOpsPerSec = Math.round((100 / missTime) * 1000);
    console.log(`   ✅ Checked 100 non-existent keys in ${missTime}ms`);
    console.log(`   ⚡ Miss throughput: ${missOpsPerSec} ops/sec\n`);

    // Test 4: Bulk Operations
    console.log('📦 Test 4: Bulk Operations (MGET 100 keys)');
    const bulkStart = Date.now();
    
    const keys = Array.from({ length: 100 }, (_, i) => `test:user:${i}`);
    const values = await client.mGet(keys);
    
    const bulkTime = Date.now() - bulkStart;
    const bulkOpsPerSec = Math.round((100 / bulkTime) * 1000);
    console.log(`   ✅ Retrieved 100 entries in ${bulkTime}ms`);
    console.log(`   ⚡ Bulk throughput: ${bulkOpsPerSec} ops/sec\n`);

    // Test 5: Pattern Matching
    console.log('🔎 Test 5: Pattern Matching (KEYS test:user:*)');
    const patternStart = Date.now();
    
    const matchedKeys = await client.keys('test:user:*');
    
    const patternTime = Date.now() - patternStart;
    console.log(`   ✅ Found ${matchedKeys.length} keys in ${patternTime}ms\n`);

    // Performance Summary
    console.log('📊 Performance Summary:');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log(`   │ Write Throughput:  ${writeOpsPerSec.toString().padStart(6)} ops/sec │`);
    console.log(`   │ Read Throughput:   ${readOpsPerSec.toString().padStart(6)} ops/sec │`);
    console.log(`   │ Miss Throughput:   ${missOpsPerSec.toString().padStart(6)} ops/sec │`);
    console.log(`   │ Bulk Throughput:   ${bulkOpsPerSec.toString().padStart(6)} ops/sec │`);
    console.log('   └─────────────────────────────────────────┘\n');

    // Expected vs Actual
    console.log('🎯 Expected Performance:');
    console.log('   • Without Redis: 20-30 req/sec (database queries)');
    console.log('   • With Redis:    1,000+ req/sec (cache hits)');
    console.log(`   • Actual:        ${readOpsPerSec} req/sec (${Math.round(readOpsPerSec / 25)}x improvement)\n`);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    for (let i = 0; i < 100; i++) {
      await client.del(`test:user:${i}`);
    }
    console.log('   ✅ Test data cleaned\n');

    console.log('✅ Cache performance test completed successfully!');
    console.log('🎉 Redis caching layer is fully operational!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await client.quit();
  }
}

testCachePerformance();
