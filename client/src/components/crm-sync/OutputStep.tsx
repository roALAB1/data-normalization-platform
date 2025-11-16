import type { UploadedFile } from "@/types/crmSync";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Download, Home, FileText, ArrowLeft, Loader2, Upload, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { Conflict, ResolutionConfig } from "@/lib/conflictResolver";
import type { MatchResult, MatchStats } from "@/lib/matchingEngine";
import type { ColumnConfig, ColumnOrderingMode } from "./ColumnSelectionStep";
import type { ArrayHandlingStrategy } from "@/lib/arrayParser";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { uploadFilesToS3Parallel, estimateUploadSize, formatBytes, type S3FileMetadata } from "@/lib/crmS3Upload";


interface OutputStepProps {
  originalFile: UploadedFile;
  enrichedFiles: UploadedFile[];
  matchResults: Map<string, MatchResult[]>;
  matchStats: Map<string, MatchStats>;
  resolutionConfig: ResolutionConfig;
  allConflicts: Conflict[];
  selectedColumns: string[];
  orderingMode: ColumnOrderingMode;
  columnConfigs: ColumnConfig[];
  arrayStrategies: Map<string, ArrayHandlingStrategy>;
  selectedIdentifiers: string[];
  inputMappings: Array<{ originalColumn: string; enrichedColumn: string; enrichedFileId: string }>;
  onBack: () => void;
  onStartNew: () => void;
}

type JobStatus = "idle" | "uploading" | "submitting" | "processing" | "completed" | "failed";

export default function OutputStep({
  originalFile,
  enrichedFiles,
  matchResults,
  matchStats,
  resolutionConfig,
  allConflicts,
  selectedColumns,
  orderingMode,
  columnConfigs,
  arrayStrategies,
  selectedIdentifiers,
  inputMappings,
  onBack,
  onStartNew,
}: OutputStepProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitMergeJobMutation = trpc.crmSync.submitMergeJob.useMutation();
  const uploadMutation = trpc.upload.uploadCSV.useMutation();
  const { data: jobStatusData, refetch: refetchJobStatus } = trpc.crmSync.getJobStatus.useQuery(
    { jobId: jobId! },
    { enabled: jobId !== null && jobStatus === "processing", refetchInterval: 2000 }
  );

  // Update status based on job status data
  useEffect(() => {
    if (jobStatusData) {
      if (jobStatusData.status === "completed") {
        setJobStatus("completed");
        setProgress(100);
        setStatusMessage("Merge completed successfully!");
        setOutputUrl(jobStatusData.outputFileUrl || null);
      } else if (jobStatusData.status === "failed") {
        setJobStatus("failed");
        setError(jobStatusData.error || "Job failed with unknown error");
      } else if (jobStatusData.status === "processing") {
        const percentage = jobStatusData.totalRows > 0
          ? Math.round((jobStatusData.processedRows / jobStatusData.totalRows) * 100)
          : 0;
        setProgress(percentage);
        setStatusMessage(`Processing... ${jobStatusData.processedRows}/${jobStatusData.totalRows} rows`);
      }
    }
  }, [jobStatusData]);

  const handleSubmitJob = async () => {
    try {
      setJobStatus("uploading");
      setError(null);

      // Estimate total upload size
      const totalSize = estimateUploadSize(originalFile, enrichedFiles);
      setStatusMessage(`Uploading files (${formatBytes(totalSize)})...`);

      // Upload all files to S3 in parallel
      const allFiles = [originalFile, ...enrichedFiles];
      const uploadedFiles = await uploadFilesToS3Parallel(
        allFiles,
        uploadMutation,
        (uploaded, total) => {
          const percentage = Math.round((uploaded / total) * 100);
          setProgress(percentage * 0.3); // Upload is 30% of total progress
          setStatusMessage(`Uploading files... ${uploaded}/${total} (${percentage}%)`);
        }
      );

      // Separate original and enriched files
      const originalFileMetadata = uploadedFiles[0];
      const enrichedFilesMetadata = uploadedFiles.slice(1);

      setJobStatus("submitting");
      setProgress(35);
      setStatusMessage("Submitting merge job...");

      // Submit job to backend
      const result = await submitMergeJobMutation.mutateAsync({
        originalFile: originalFileMetadata,
        enrichedFiles: enrichedFilesMetadata,
        selectedIdentifiers,
        inputMappings,
        arrayStrategies: Object.fromEntries(arrayStrategies),
        resolutionConfig,
        columnConfigs,
        orderingMode,
      });

      if (result.success) {
        setJobId(result.jobId);
        setJobStatus("processing");
        setStatusMessage("Job submitted successfully. Processing...");
        toast.success("Merge job submitted successfully!");
      } else {
        throw new Error("Failed to submit job");
      }
    } catch (err) {
      console.error("Error submitting merge job:", err);
      setJobStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to submit merge job");
      toast.error("Failed to submit merge job");
    }
  };

  const handleDownload = () => {
    if (outputUrl) {
      window.open(outputUrl, "_blank");
    }
  };

  const handleRetry = () => {
    setJobStatus("idle");
    setJobId(null);
    setProgress(0);
    setStatusMessage("");
    setOutputUrl(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Output & Download
          </CardTitle>
          <CardDescription>
            Submit your merge job for server-side processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job Status */}
          {jobStatus === "idle" && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Your merge configuration is ready. Click "Submit Merge Job" to process {originalFile.rowCount.toLocaleString()} rows
                  with {enrichedFiles.length} enriched file{enrichedFiles.length > 1 ? "s" : ""} on the server.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Original Rows</div>
                  <div className="text-2xl font-bold">{originalFile.rowCount.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Enriched Files</div>
                  <div className="text-2xl font-bold">{enrichedFiles.length}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Selected Columns</div>
                  <div className="text-2xl font-bold">{selectedColumns.length}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Identifiers</div>
                  <div className="text-2xl font-bold">{selectedIdentifiers.length}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSubmitJob} size="lg" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Merge Job
                </Button>
                <Button onClick={onBack} variant="outline" size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Uploading/Submitting */}
          {(jobStatus === "uploading" || jobStatus === "submitting") && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <div className="text-center">
                <div className="font-medium">{statusMessage}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Please wait while we prepare your merge job...
                </div>
              </div>
            </div>
          )}

          {/* Processing */}
          {jobStatus === "processing" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Processing merge job...</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <Alert>
                <Loader2 className="w-4 h-4 animate-spin" />
                <AlertDescription>
                  {statusMessage || "Processing your data on the server..."}
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground text-center">
                You can close this page - the job will continue processing in the background.
              </div>
            </div>
          )}

          {/* Completed */}
          {jobStatus === "completed" && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Merge completed successfully! Your merged file is ready for download.
                </AlertDescription>
              </Alert>

              {jobStatusData && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                    <div className="text-2xl font-bold">{jobStatusData.totalRows.toLocaleString()}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Processed</div>
                    <div className="text-2xl font-bold">{jobStatusData.processedRows.toLocaleString()}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Valid Rows</div>
                    <div className="text-2xl font-bold">{jobStatusData.validRows.toLocaleString()}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleDownload} size="lg" className="flex-1" disabled={!outputUrl}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Merged CSV
                </Button>
                <Button onClick={onStartNew} variant="outline" size="lg">
                  <Home className="w-4 h-4 mr-2" />
                  Start New Merge
                </Button>
              </div>
            </div>
          )}

          {/* Failed */}
          {jobStatus === "failed" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  {error || "An error occurred while processing your merge job."}
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button onClick={handleRetry} size="lg" className="flex-1">
                  Retry
                </Button>
                <Button onClick={onBack} variant="outline" size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Server-Side Processing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Your merge job is processed on our servers, which means:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>No browser memory limits - handle datasets of any size</li>
            <li>Background processing - close your browser and come back later</li>
            <li>Real-time progress updates via WebSocket</li>
            <li>Automatic retry on temporary failures</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
