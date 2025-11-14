/**
 * Generic Web Worker pool manager
 * Efficiently manages multiple workers for parallel processing
 */

export interface WorkerTask<TMessage, TResponse> {
  id: string;
  message: TMessage;
  resolve: (response: TResponse) => void;
  reject: (error: Error) => void;
  timeout?: number;
}

export interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  currentTaskId?: string;
  errorCount: number;
}

export interface WorkerPoolConfig {
  workerUrl: string;
  poolSize?: number;
  maxRetries?: number;
  taskTimeout?: number;
}

export class WorkerPoolManager<TMessage = any, TResponse = any> {
  private workers: WorkerInfo[] = [];
  private taskQueue: WorkerTask<TMessage, TResponse>[] = [];
  private config: Required<WorkerPoolConfig>;
  private isShutdown: boolean = false;

  constructor(config: WorkerPoolConfig) {
    this.config = {
      workerUrl: config.workerUrl,
      poolSize: config.poolSize || navigator.hardwareConcurrency || 4,
      maxRetries: config.maxRetries || 3,
      taskTimeout: config.taskTimeout || 30000, // 30 seconds
    };

    this.initializePool();
  }

  /**
   * Initialize worker pool
   */
  private initializePool(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      this.createWorker();
    }
  }

  /**
   * Create a new worker
   */
  private createWorker(): WorkerInfo {
    // Add cache-busting version parameter to prevent aggressive browser caching
    const workerUrl = new URL(this.config.workerUrl, import.meta.url);
    // Use build timestamp as version (Vite replaces import.meta.env.MODE at build time)
    const version = import.meta.env.MODE === 'production' 
      ? import.meta.env.VITE_BUILD_TIME || '3.18.0'
      : Date.now().toString();
    workerUrl.searchParams.set('v', version);
    
    const worker = new Worker(workerUrl, {
      type: 'module',
    });

    const workerInfo: WorkerInfo = {
      worker,
      busy: false,
      errorCount: 0,
    };

    worker.onmessage = (event: MessageEvent<TResponse>) => {
      this.handleWorkerMessage(workerInfo, event.data);
    };

    worker.onerror = (error) => {
      this.handleWorkerError(workerInfo, error);
    };

    this.workers.push(workerInfo);
    return workerInfo;
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(workerInfo: WorkerInfo, response: TResponse): void {
    // Find the task this response belongs to
    const taskId = workerInfo.currentTaskId;
    if (!taskId) return;

    // Mark worker as available
    workerInfo.busy = false;
    workerInfo.currentTaskId = undefined;
    workerInfo.errorCount = 0;

    // Process next task in queue
    this.processNextTask();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerInfo: WorkerInfo, error: ErrorEvent): void {
    console.error('Worker error:', error);

    workerInfo.errorCount++;

    // If too many errors, terminate and recreate worker
    if (workerInfo.errorCount >= this.config.maxRetries) {
      const index = this.workers.indexOf(workerInfo);
      if (index > -1) {
        workerInfo.worker.terminate();
        this.workers.splice(index, 1);
        this.createWorker();
      }
    }

    workerInfo.busy = false;
    workerInfo.currentTaskId = undefined;

    // Process next task
    this.processNextTask();
  }

  /**
   * Execute a task
   */
  async executeTask(message: TMessage, timeout?: number): Promise<TResponse> {
    if (this.isShutdown) {
      throw new Error('Worker pool is shut down');
    }

    return new Promise<TResponse>((resolve, reject) => {
      const task: WorkerTask<TMessage, TResponse> = {
        id: `task_${Date.now()}_${Math.random()}`,
        message,
        resolve,
        reject,
        timeout: timeout || this.config.taskTimeout,
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Process next task in queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    // Find available worker
    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) return;

    // Get next task
    const task = this.taskQueue.shift();
    if (!task) return;

    // Assign task to worker
    availableWorker.busy = true;
    availableWorker.currentTaskId = task.id;

    // Set timeout
    const timeoutId = setTimeout(() => {
      task.reject(new Error('Task timeout'));
      availableWorker.busy = false;
      availableWorker.currentTaskId = undefined;
      this.processNextTask();
    }, task.timeout);

    // Send message to worker
    availableWorker.worker.postMessage(task.message);

    // Listen for response
    const responseHandler = (event: MessageEvent<TResponse>) => {
      if (availableWorker.currentTaskId === task.id) {
        clearTimeout(timeoutId);
        availableWorker.worker.removeEventListener('message', responseHandler);
        task.resolve(event.data);
      }
    };

    availableWorker.worker.addEventListener('message', responseHandler);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      idleWorkers: this.workers.filter((w) => !w.busy).length,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Shutdown pool and terminate all workers
   */
  shutdown(): void {
    this.isShutdown = true;
    this.taskQueue = [];
    
    for (const workerInfo of this.workers) {
      workerInfo.worker.terminate();
    }
    
    this.workers = [];
  }
}
