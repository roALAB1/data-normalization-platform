/**
 * DuckDBService Unit Tests
 * 
 * Tests for DuckDB database operations including:
 * - Connection management
 * - CSV import
 * - Query execution
 * - Streaming export
 * - Cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DuckDBService } from './DuckDBService';
import * as fs from 'fs';
import * as path from 'os';

describe('DuckDBService', () => {
  let service: DuckDBService;
  const testJobId = `test-${Date.now()}`;

  beforeEach(async () => {
    service = new DuckDBService(testJobId);
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
  });

  describe('Initialization', () => {
    it('should initialize database successfully', async () => {
      expect(service.isReady()).toBe(true);
    });

    it('should create database file', () => {
      const dbPath = service.getDbPath();
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize(); // Second call
      expect(service.isReady()).toBe(true);
    });
  });

  describe('CSV Import', () => {
    it('should import CSV from sample data', async () => {
      // Create sample CSV content
      const sampleCSV = `email,name,company
test1@example.com,John Doe,Acme Inc
test2@example.com,Jane Smith,Tech Corp
test3@example.com,Bob Johnson,Data LLC`;

      // Write to temp file
      const tempPath = path.tmpdir() + `/test-${Date.now()}.csv`;
      fs.writeFileSync(tempPath, sampleCSV);

      try {
        // Import CSV
        const result = await service.importCSVFromURL('test_table', `file://${tempPath}`);

        expect(result.rowCount).toBe(3);
        expect(result.columns).toContain('email');
        expect(result.columns).toContain('name');
        expect(result.columns).toContain('company');
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it('should handle empty CSV', async () => {
      const emptyCSV = `email,name,company`;
      const tempPath = path.tmpdir() + `/test-empty-${Date.now()}.csv`;
      fs.writeFileSync(tempPath, emptyCSV);

      try {
        const result = await service.importCSVFromURL('empty_table', `file://${tempPath}`);
        expect(result.rowCount).toBe(0);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      // Create test table
      await service.execute(`
        CREATE TABLE test_data AS 
        SELECT * FROM (VALUES 
          ('test1@example.com', 'John', 'Acme'),
          ('test2@example.com', 'Jane', 'Tech'),
          ('test3@example.com', 'Bob', 'Data')
        ) AS t(email, name, company)
      `);
    });

    it('should execute SELECT query', async () => {
      const results = await service.query('SELECT * FROM test_data');
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('email');
    });

    it('should execute COUNT query', async () => {
      const results = await service.query<{ count: number }>('SELECT COUNT(*) as count FROM test_data');
      expect(results[0].count).toBe(3);
    });

    it('should execute filtered query', async () => {
      const results = await service.query(`SELECT * FROM test_data WHERE name = 'John'`);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('John');
    });
  });

  describe('Table Operations', () => {
    it('should check if table exists', async () => {
      await service.execute(`CREATE TABLE exists_test (id INT, name VARCHAR)`);
      const exists = await service.tableExists('exists_test');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent table', async () => {
      const exists = await service.tableExists('non_existent_table');
      expect(exists).toBe(false);
    });

    it('should drop table', async () => {
      await service.execute(`CREATE TABLE drop_test (id INT)`);
      await service.dropTable('drop_test');
      const exists = await service.tableExists('drop_test');
      expect(exists).toBe(false);
    });

    it('should get table stats', async () => {
      await service.execute(`
        CREATE TABLE stats_test AS 
        SELECT * FROM (VALUES (1, 'A'), (2, 'B'), (3, 'C')) AS t(id, name)
      `);

      const stats = await service.getTableStats('stats_test');
      expect(stats.rowCount).toBe(3);
      expect(stats.columnCount).toBe(2);
      expect(stats.columns).toContain('id');
      expect(stats.columns).toContain('name');
    });
  });

  describe('Streaming Queries', () => {
    beforeEach(async () => {
      // Create large test table
      await service.execute(`
        CREATE TABLE stream_test AS 
        SELECT 
          'test' || i || '@example.com' as email,
          'User' || i as name
        FROM generate_series(1, 100) as t(i)
      `);
    });

    it('should stream query results in batches', async () => {
      const batches: any[][] = [];
      
      for await (const batch of service.streamQuery('SELECT * FROM stream_test', { batchSize: 25 })) {
        batches.push(batch);
      }

      expect(batches.length).toBe(4); // 100 rows / 25 batch size = 4 batches
      expect(batches[0]).toHaveLength(25);
      expect(batches[3]).toHaveLength(25);
    });

    it('should handle empty stream', async () => {
      const batches: any[][] = [];
      
      for await (const batch of service.streamQuery('SELECT * FROM stream_test WHERE 1=0')) {
        batches.push(batch);
      }

      expect(batches.length).toBe(0);
    });
  });

  describe('CSV Export', () => {
    beforeEach(async () => {
      await service.execute(`
        CREATE TABLE export_test AS 
        SELECT * FROM (VALUES 
          ('test1@example.com', 'John'),
          ('test2@example.com', 'Jane')
        ) AS t(email, name)
      `);
    });

    it('should export table to CSV', async () => {
      const csv = await service.exportToCSV('export_test');
      
      expect(csv).toContain('email,name');
      expect(csv).toContain('test1@example.com,John');
      expect(csv).toContain('test2@example.com,Jane');
    });

    it('should handle empty table export', async () => {
      await service.execute(`CREATE TABLE empty_export (email VARCHAR, name VARCHAR)`);
      const csv = await service.exportToCSV('empty_export');
      
      expect(csv).toContain('email,name');
      expect(csv.split('\n').length).toBeLessThanOrEqual(2); // Header + empty line
    });
  });

  describe('Cleanup', () => {
    it('should clean up database file on close', async () => {
      const dbPath = service.getDbPath();
      await service.close();
      
      expect(fs.existsSync(dbPath)).toBe(false);
    });

    it('should handle multiple close calls', async () => {
      await service.close();
      await service.close(); // Should not throw
      expect(service.isReady()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid SQL', async () => {
      await expect(service.query('INVALID SQL QUERY')).rejects.toThrow();
    });

    it('should throw error for non-existent table', async () => {
      await expect(service.query('SELECT * FROM non_existent_table')).rejects.toThrow();
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = new DuckDBService('uninit-test');
      await expect(uninitializedService.query('SELECT 1')).rejects.toThrow('not initialized');
    });
  });
});
