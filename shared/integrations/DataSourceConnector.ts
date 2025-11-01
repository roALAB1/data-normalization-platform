/**
 * Unified interface for data source connectors
 * Supports CSV, Google Sheets, Airtable, and future integrations
 */

export interface ColumnMetadata {
  name: string;
  type: string;
  index: number;
}

export interface Row {
  [key: string]: string | number | boolean | null;
}

export interface ConnectionConfig {
  type: 'csv' | 'google_sheets' | 'airtable';
  // CSV
  file?: File;
  // Google Sheets
  spreadsheetId?: string;
  sheetName?: string;
  accessToken?: string;
  // Airtable
  baseId?: string;
  tableName?: string;
  apiKey?: string;
}

export interface DataSourceStats {
  totalRows: number;
  processedRows: number;
  estimatedTimeRemaining?: number;
}

export abstract class DataSourceConnector {
  protected config: ConnectionConfig;
  protected isConnected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  /**
   * Connect to the data source and validate credentials
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the data source
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get metadata about columns in the data source
   */
  abstract getMetadata(): Promise<ColumnMetadata[]>;

  /**
   * Stream data from the source in chunks
   * @param chunkSize Number of rows per chunk
   * @param onProgress Callback for progress updates
   */
  abstract readData(
    chunkSize: number,
    onProgress?: (stats: DataSourceStats) => void
  ): AsyncGenerator<Row[], void, unknown>;

  /**
   * Write data back to the source in chunks
   * @param data Rows to write
   * @param onProgress Callback for progress updates
   */
  abstract writeData(
    data: AsyncGenerator<Row[], void, unknown>,
    onProgress?: (stats: DataSourceStats) => void
  ): Promise<void>;

  /**
   * Test connection without reading data
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get total row count (if available without reading all data)
   */
  abstract getRowCount(): Promise<number | null>;
}
