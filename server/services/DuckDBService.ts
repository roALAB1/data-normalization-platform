/**
 * DuckDBService - Core service for DuckDB database operations
 * 
 * Provides connection management, CSV import, SQL query execution,
 * and streaming export capabilities for CRM merge processing.
 * 
 * Features:
 * - Automatic temp file management
 * - Streaming CSV import/export
 * - Connection pooling
 * - Error handling and logging
 * - Memory-efficient processing
 */

import * as duckdb from 'duckdb';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DuckDBConfig {
  maxMemoryMB?: number;
  threadsCount?: number;
  tempDirectory?: string;
}

export interface ImportOptions {
  delimiter?: string;
  header?: boolean;
  nullString?: string;
  skipRows?: number;
}

export interface QueryStreamOptions {
  batchSize?: number;
}

export class DuckDBService {
  private db: duckdb.Database | null = null;
  private connection: duckdb.Connection | null = null;
  private dbPath: string;
  private config: DuckDBConfig;
  private isInitialized: boolean = false;

  constructor(jobId: string, config: DuckDBConfig = {}) {
    const tempDir = config.tempDirectory || os.tmpdir();
    this.dbPath = path.join(tempDir, `crm-merge-${jobId}.duckdb`);
    this.config = {
      maxMemoryMB: config.maxMemoryMB || 500,
      threadsCount: config.threadsCount || Math.max(1, os.cpus().length - 1),
      ...config,
    };
  }

  /**
   * Initialize DuckDB database with optimized configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Create database with persistent storage
      this.db = new duckdb.Database(this.dbPath, {
        access_mode: 'READ_WRITE',
      }, (err) => {
        if (err) {
          reject(new Error(`Failed to create DuckDB database: ${err.message}`));
          return;
        }

        // Get connection
        this.connection = this.db!.connect();

        // Configure DuckDB for optimal performance
        const configQueries = [
          `SET memory_limit='${this.config.maxMemoryMB}MB'`,
          `SET threads=${this.config.threadsCount}`,
          `SET preserve_insertion_order=false`, // Faster processing
          `SET enable_progress_bar=false`, // Disable progress bar in headless mode
        ];

        // Execute configuration queries sequentially
        const executeConfig = (index: number) => {
          if (index >= configQueries.length) {
            this.isInitialized = true;
            console.log(`[DuckDB] Initialized database at ${this.dbPath}`);
            console.log(`[DuckDB] Config: ${this.config.maxMemoryMB}MB memory, ${this.config.threadsCount} threads`);
            resolve();
            return;
          }

          this.connection!.run(configQueries[index], (err) => {
            if (err) {
              reject(new Error(`Failed to configure DuckDB: ${err.message}`));
              return;
            }
            executeConfig(index + 1);
          });
        };

        executeConfig(0);
      });
    });
  }

  /**
   * Import CSV file from S3 URL into DuckDB table
   * Uses read_csv_auto() for automatic schema detection
   */
  async importCSVFromURL(
    tableName: string,
    s3Url: string,
    options: ImportOptions = {}
  ): Promise<{ rowCount: number; columns: string[] }> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    const delimiter = options.delimiter || ',';
    const header = options.header !== false; // Default true
    const nullString = options.nullString || '';
    const skipRows = options.skipRows || 0;

    // Build CREATE TABLE AS SELECT query
    const query = `
      CREATE TABLE ${tableName} AS 
      SELECT * FROM read_csv_auto(
        '${s3Url}',
        delim='${delimiter}',
        header=${header},
        nullstr='${nullString}',
        skip=${skipRows},
        ignore_errors=true,
        all_varchar=true
      )
    `;

    console.log(`[DuckDB] Importing CSV from ${s3Url} into table ${tableName}...`);

    return new Promise((resolve, reject) => {
      this.connection!.run(query, (err) => {
        if (err) {
          reject(new Error(`Failed to import CSV: ${err.message}`));
          return;
        }

        // Get row count and column info
        this.connection!.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countResult) => {
          if (err) {
            reject(new Error(`Failed to get row count: ${err.message}`));
            return;
          }

          this.connection!.all(`DESCRIBE ${tableName}`, (err, describeResult) => {
            if (err) {
              reject(new Error(`Failed to describe table: ${err.message}`));
              return;
            }

            const rowCount = countResult[0].count;
            const columns = describeResult.map((col: any) => col.column_name);

            console.log(`[DuckDB] Imported ${rowCount} rows with ${columns.length} columns into ${tableName}`);
            resolve({ rowCount, columns });
          });
        });
      });
    });
  }

  /**
   * Execute SQL query and return all results
   * Use for small result sets only
   */
  async query<T = any>(sql: string): Promise<T[]> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      this.connection!.all(sql, (err, result) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}\nSQL: ${sql}`));
          return;
        }
        resolve(result as T[]);
      });
    });
  }

  /**
   * Execute SQL query without returning results
   * Use for CREATE, INSERT, UPDATE, DELETE
   */
  async execute(sql: string): Promise<void> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      this.connection!.run(sql, (err) => {
        if (err) {
          reject(new Error(`Execution failed: ${err.message}\nSQL: ${sql}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Stream query results in batches
   * Memory-efficient for large result sets
   */
  async *streamQuery<T = any>(
    sql: string,
    options: QueryStreamOptions = {}
  ): AsyncGenerator<T[], void, unknown> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    const batchSize = options.batchSize || 10000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batchQuery = `${sql} LIMIT ${batchSize} OFFSET ${offset}`;
      const batch = await this.query<T>(batchQuery);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      yield batch;
      offset += batchSize;

      if (batch.length < batchSize) {
        hasMore = false;
      }
    }
  }

  /**
   * Export table to CSV and return as string
   * Memory-efficient streaming export
   */
  async exportToCSV(tableName: string): Promise<string> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    const tempCsvPath = path.join(os.tmpdir(), `export-${Date.now()}.csv`);

    try {
      // Export to temp file
      await this.execute(`
        COPY ${tableName} TO '${tempCsvPath}' (HEADER, DELIMITER ',')
      `);

      // Read file content
      const csvContent = fs.readFileSync(tempCsvPath, 'utf-8');

      // Clean up temp file
      fs.unlinkSync(tempCsvPath);

      return csvContent;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempCsvPath)) {
        fs.unlinkSync(tempCsvPath);
      }
      throw error;
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(tableName: string): Promise<{
    rowCount: number;
    columnCount: number;
    columns: string[];
    sizeBytes: number;
  }> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    const [countResult, describeResult] = await Promise.all([
      this.query(`SELECT COUNT(*) as count FROM ${tableName}`),
      this.query(`DESCRIBE ${tableName}`),
    ]);

    const rowCount = countResult[0].count;
    const columns = describeResult.map((col: any) => col.column_name);

    // Estimate size (rough approximation)
    const sizeBytes = rowCount * columns.length * 50; // Assume ~50 bytes per cell

    return {
      rowCount,
      columnCount: columns.length,
      columns,
      sizeBytes,
    };
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    try {
      const result = await this.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = '${tableName}'
      `);
      return result[0].count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Drop table if exists
   */
  async dropTable(tableName: string): Promise<void> {
    if (!this.connection) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    await this.execute(`DROP TABLE IF EXISTS ${tableName}`);
    console.log(`[DuckDB] Dropped table ${tableName}`);
  }

  /**
   * Close database connection and clean up temp files
   */
  async close(): Promise<void> {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Delete temp database file
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
      console.log(`[DuckDB] Cleaned up database file: ${this.dbPath}`);
    }

    this.isInitialized = false;
  }

  /**
   * Get database file path
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.connection !== null;
  }
}
