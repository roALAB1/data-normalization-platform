#!/usr/bin/env node

/**
 * Redis Connection Verification Script
 * 
 * Tests Redis connectivity and cache operations
 */

import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || '6379';

console.log('🔍 Redis Connection Verification\n');
console.log(`Host: ${REDIS_HOST}`);
console.log(`Port: ${REDIS_PORT}\n`);

const client = createClient({
  socket: {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
  },
});

client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
  process.exit(1);
});

async function verifyRedis() {
  try {
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Test PING
    console.log('🏓 Testing PING...');
    const pong = await client.ping();
    console.log(`✅ PING response: ${pong}\n`);

    // Test SET
    console.log('💾 Testing SET operation...');
    const testKey = 'test:verification';
    const testValue = JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Redis verification test',
    });
    await client.set(testKey, testValue, { EX: 60 }); // 60 second TTL
    console.log(`✅ SET ${testKey} = ${testValue}\n`);

    // Test GET
    console.log('📖 Testing GET operation...');
    const retrieved = await client.get(testKey);
    console.log(`✅ GET ${testKey} = ${retrieved}\n`);

    // Test DEL
    console.log('🗑️  Testing DEL operation...');
    await client.del(testKey);
    console.log(`✅ DEL ${testKey}\n`);

    // Get Redis info
    console.log('📊 Redis Server Info:');
    const info = await client.info('server');
    const lines = info.split('\r\n').filter(line => 
      line.includes('redis_version') || 
      line.includes('redis_mode') || 
      line.includes('os')
    );
    lines.forEach(line => console.log(`   ${line}`));
    console.log();

    // Get memory stats
    console.log('💾 Memory Stats:');
    const memInfo = await client.info('memory');
    const memLines = memInfo.split('\r\n').filter(line => 
      line.includes('used_memory_human') || 
      line.includes('maxmemory_human')
    );
    memLines.forEach(line => console.log(`   ${line}`));
    console.log();

    // Get keyspace stats
    console.log('🔑 Keyspace Stats:');
    const keyspaceInfo = await client.info('keyspace');
    if (keyspaceInfo.includes('db0')) {
      const keyspaceLines = keyspaceInfo.split('\r\n').filter(line => line.includes('db0'));
      keyspaceLines.forEach(line => console.log(`   ${line}`));
    } else {
      console.log('   No keys in database');
    }
    console.log();

    console.log('✅ All Redis operations successful!');
    console.log('🎉 Redis is ready for caching!\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.quit();
  }
}

verifyRedis();
