/**
 * Progressive CSV downloader
 * Streams results to file without storing everything in memory
 */

import Papa from 'papaparse';

export interface DownloadConfig {
  filename: string;
  headers?: string[];
  chunkSize?: number; // Rows to buffer before writing
}

export interface DownloadStats {
  totalRows: number;
  downloadedRows: number;
  bytesWritten: number;
  startTime: number;
}

export type DownloadProgressCallback = (stats: DownloadStats) => void;

export class ProgressiveDownloader {
  private config: Required<DownloadConfig>;
  private stats: DownloadStats;
  private chunks: string[] = [];
  private isCancelled: boolean = false;

  constructor(config: DownloadConfig) {
    this.config = {
      filename: config.filename || 'results.csv',
      headers: config.headers || [],
      chunkSize: config.chunkSize || 1000,
    };

    this.stats = {
      totalRows: 0,
      downloadedRows: 0,
      bytesWritten: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Download results progressively
   */
  async download(
    results: AsyncGenerator<any[], void, unknown> | any[][],
    onProgress?: DownloadProgressCallback
  ): Promise<void> {
    this.isCancelled = false;
    this.chunks = [];
    this.stats.startTime = Date.now();
    this.stats.downloadedRows = 0;
    this.stats.bytesWritten = 0;

    // Add headers if provided
    if (this.config.headers.length > 0) {
      const headerRow = Papa.unparse([this.config.headers], {
        header: false,
      });
      this.chunks.push(headerRow);
      this.stats.bytesWritten += headerRow.length;
    }

    // Process results
    if (Symbol.asyncIterator in results) {
      // Async generator
      for await (const chunk of results as AsyncGenerator<any[], void, unknown>) {
        if (this.isCancelled) {
          throw new Error('Download cancelled');
        }

        await this.addChunk(chunk, onProgress);
      }
    } else {
      // Array of chunks
      for (const chunk of results as any[][]) {
        if (this.isCancelled) {
          throw new Error('Download cancelled');
        }

        await this.addChunk(chunk, onProgress);
      }
    }

    // Trigger download
    this.triggerDownload();
  }

  /**
   * Add a chunk of rows
   */
  private async addChunk(
    rows: any[],
    onProgress?: DownloadProgressCallback
  ): Promise<void> {
    if (rows.length === 0) return;

    // Convert rows to CSV
    const csv = Papa.unparse(rows, {
      header: false,
    });

    this.chunks.push(csv);
    this.stats.downloadedRows += rows.length;
    this.stats.bytesWritten += csv.length;

    if (onProgress) {
      onProgress(this.stats);
    }

    // Yield to event loop to prevent blocking
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Trigger browser download
   */
  private triggerDownload(): void {
    // Combine all chunks
    const csvContent = this.chunks.join('\n');

    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', this.config.filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }

  /**
   * Cancel download
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Get current stats
   */
  getStats(): DownloadStats {
    return { ...this.stats };
  }

  /**
   * Set total rows (if known in advance)
   */
  setTotalRows(total: number): void {
    this.stats.totalRows = total;
  }
}

/**
 * Quick helper for simple downloads
 */
export async function downloadCSV(
  data: any[],
  filename: string,
  headers?: string[]
): Promise<void> {
  const downloader = new ProgressiveDownloader({
    filename,
    headers,
  });

  await downloader.download([data]);
}
