import { Job } from "../drizzle/schema";
import { getJobById, updateJobProgress, addJobResultsBatch } from "./jobDb";
import { storagePut, storageGet } from "./storage";
import { NameEnhanced } from "../client/src/lib/NameEnhanced";
import { PhoneNormalizer } from "../client/src/lib/PhoneNormalizer";
import { parseCSVForNames } from "../client/src/lib/csvParser";

/**
 * Process a single normalization job
 * This runs in the background and processes data in chunks
 */
export async function processJob(jobId: number): Promise<void> {
  console.log(`[JobProcessor] Starting job ${jobId}`);
  
  const job = await getJobById(jobId);
  if (!job) {
    console.error(`[JobProcessor] Job ${jobId} not found`);
    return;
  }

  if (job.status !== "pending") {
    console.log(`[JobProcessor] Job ${jobId} is not pending (status: ${job.status})`);
    return;
  }

  try {
    // Mark job as processing
    await updateJobProgress(jobId, {
      status: "processing",
      startedAt: new Date(),
    });

    // Download input file from S3
    if (!job.inputFileKey) {
      throw new Error("Input file key is missing");
    }

    const inputData = await downloadInputFile(job.inputFileKey);
    
    // Use intelligent CSV parser to extract names
    let lines: string[];
    if (job.type === "name") {
      const parseResult = parseCSVForNames(inputData);
      lines = parseResult.names;
      console.log(`[JobProcessor] Parsed CSV: format: ${parseResult.detectedFormat}, hasHeader: ${parseResult.hasHeader}, total: ${parseResult.totalRows}, skipped: ${parseResult.skippedRows}`);
    } else {
      // For other types, use simple line splitting for now
      lines = inputData.split('\n').filter(l => l.trim());
    }

    console.log(`[JobProcessor] Processing ${lines.length} rows for job ${jobId}`);

    // Process in chunks
    const chunkSize = 1000;
    const results: any[] = [];
    let processedRows = 0;
    let validRows = 0;
    let invalidRows = 0;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const chunkResults = await processChunk(chunk, i, job);

      results.push(...chunkResults.map(r => r.result));
      processedRows += chunk.length;
      validRows += chunkResults.filter(r => r.result.isValid).length;
      invalidRows += chunkResults.filter(r => !r.result.isValid).length;

      // Update progress
      await updateJobProgress(jobId, {
        processedRows,
        validRows,
        invalidRows,
      });

      // Store results in database (optional - can be skipped for very large jobs)
      if (lines.length < 10000) {
        await addJobResultsBatch(chunkResults.map(r => ({
          jobId,
          rowIndex: r.rowIndex,
          inputValue: r.input,
          outputValue: r.output,
          isValid: r.result.isValid,
          repairLog: r.result.repairLog,
          metadata: r.result.metadata,
        })));
      }

      console.log(`[JobProcessor] Job ${jobId}: ${processedRows}/${lines.length} rows processed`);
    }

    // Generate output CSV
    const outputCsv = generateOutputCsv(results, job.type);
    const outputFileKey = `jobs/${jobId}/output-${Date.now()}.csv`;
    const { url: outputFileUrl } = await storagePut(outputFileKey, outputCsv, "text/csv");

    // Mark job as completed
    await updateJobProgress(jobId, {
      status: "completed",
      completedAt: new Date(),
      processedRows,
      validRows,
      invalidRows,
      outputFileKey,
      outputFileUrl,
    });

    console.log(`[JobProcessor] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[JobProcessor] Job ${jobId} failed:`, error);
    await updateJobProgress(jobId, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Download input file from S3
 */
async function downloadInputFile(fileKey: string): Promise<string> {
  // For now, we'll use a simple fetch approach
  // In production, you might want to use streaming for very large files
  const { url } = await storageGet(fileKey);
  const response = await fetch(url);
  return await response.text();
}

/**
 * Process a chunk of rows
 */
async function processChunk(
  chunk: string[],
  startIndex: number,
  job: Job
): Promise<Array<{ rowIndex: number; input: string; output: string; result: any }>> {
  const config = (job.config as any) || {};
  
  return chunk.map((line, i) => {
    const rowIndex = startIndex + i;
    const input = line.trim();
    let output = "";
    let result: any = {};

    try {
      if (job.type === "name") {
        const name = new NameEnhanced(input, {
          preserveAccents: config.preserveAccents || false,
        });
        output = name.isValid ? name.full : "";
        result = {
          isValid: name.isValid,
          repairLog: name.parseLog,
          metadata: name.isValid ? {
            firstName: name.firstName,
            middleName: name.middleName,
            lastName: name.lastName,
            nickname: name.nickname,
            full: name.full,
            short: name.short,
          } : null,
        };
      } else if (job.type === "phone") {
        const phone = new PhoneNormalizer(input, {
          defaultCountry: config.defaultCountry || "US",
        });
        output = phone.isValid ? phone.e164 : "";
        result = {
          isValid: phone.isValid,
          repairLog: phone.repairLog,
          metadata: phone.isValid ? {
            e164: phone.e164,
            national: phone.national,
            international: phone.international,
            country: phone.country,
            carrierType: phone.type,
          } : null,
        };
      }
      // Add other normalizer types here (email, company, address)
    } catch (error) {
      console.error(`[JobProcessor] Error processing row ${rowIndex}:`, error);
      result = {
        isValid: false,
        repairLog: [{ reason: "processing_error", original: input, repaired: "" }],
        metadata: null,
      };
    }

    return { rowIndex, input, output, result };
  });
}

/**
 * Generate output CSV from results
 */
function generateOutputCsv(results: any[], type: string): string {
  if (type === "name") {
    const header = "original,normalized,first_name,middle_name,last_name,nickname,is_valid";
    const rows = results.map(r => {
      const meta = r.metadata || {};
      return [
        `"${r.input || ""}"`,
        `"${r.output || ""}"`,
        `"${meta.firstName || ""}"`,
        `"${meta.middleName || ""}"`,
        `"${meta.lastName || ""}"`,
        `"${meta.nickname || ""}"`,
        r.isValid ? "true" : "false",
      ].join(",");
    });
    return [header, ...rows].join("\n");
  } else if (type === "phone") {
    const header = "original,normalized,e164,national,international,country,carrier_type,is_valid";
    const rows = results.map(r => {
      const meta = r.metadata || {};
      return [
        `"${r.input || ""}"`,
        `"${r.output || ""}"`,
        `"${meta.e164 || ""}"`,
        `"${meta.national || ""}"`,
        `"${meta.international || ""}"`,
        `"${meta.country || ""}"`,
        `"${meta.carrierType || ""}"`,
        r.isValid ? "true" : "false",
      ].join(",");
    });
    return [header, ...rows].join("\n");
  }
  
  // Default CSV format
  return results.map(r => `"${r.input}","${r.output}","${r.isValid}"`).join("\n");
}

/**
 * Job queue manager
 * Polls for pending jobs and processes them
 */
let isProcessing = false;
let processingInterval: NodeJS.Timeout | null = null;

export function startJobQueue() {
  if (processingInterval) {
    console.log("[JobQueue] Already running");
    return;
  }

  console.log("[JobQueue] Starting job queue processor");
  
  // Process jobs every 5 seconds
  processingInterval = setInterval(async () => {
    if (isProcessing) {
      return; // Skip if still processing previous batch
    }

    isProcessing = true;
    try {
      const { getPendingJobs } = await import("./jobDb");
      const pendingJobs = await getPendingJobs(5); // Process up to 5 jobs at a time

      if (pendingJobs.length > 0) {
        console.log(`[JobQueue] Found ${pendingJobs.length} pending jobs`);
        
        // Process jobs in parallel (but limit concurrency)
        await Promise.all(pendingJobs.map(job => processJob(job.id)));
      }
    } catch (error) {
      console.error("[JobQueue] Error processing jobs:", error);
    } finally {
      isProcessing = false;
    }
  }, 5000);
}

export function stopJobQueue() {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log("[JobQueue] Stopped job queue processor");
  }
}
