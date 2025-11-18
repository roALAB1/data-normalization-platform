import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Download, X, RefreshCw, Home, Activity, FileText, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function BatchJobs() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobType, setJobType] = useState<"name" | "phone" | "email" | "company" | "address">("name");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user's jobs
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = trpc.jobs.list.useQuery(
    { limit: 50 },
    { refetchInterval: 5000 } // Auto-refresh every 5 seconds
  );

  // Create job mutation
  const createJobMutation = trpc.jobs.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Job created! Processing ${data.totalRows} rows.`, {
        description: `Job ID: ${data.jobId}`,
      });
      setSelectedFile(null);
      refetchJobs();
    },
    onError: (error) => {
      toast.error("Failed to create job", {
        description: error.message,
      });
    },
  });

  // Cancel job mutation
  const cancelJobMutation = trpc.jobs.cancel.useMutation({
    onSuccess: () => {
      toast.success("Job cancelled successfully");
      refetchJobs();
    },
    onError: (error) => {
      toast.error("Failed to cancel job", {
        description: error.message,
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File too large. Maximum 100MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitJob = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      const fileContent = await selectedFile.text();
      await createJobMutation.mutateAsync({
        type: jobType,
        fileContent,
        fileName: selectedFile.name,
        config: {},
      });
    } catch (error) {
      console.error("Error submitting job:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelJob = (jobId: number) => {
    if (confirm("Are you sure you want to cancel this job?")) {
      cancelJobMutation.mutate({ jobId });
    }
  };

  const handleDownloadResults = (job: any) => {
    if (job.outputFileUrl) {
      window.open(job.outputFileUrl, "_blank");
    } else {
      toast.error("Results not available yet");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "cancelled":
        return <X className="w-4 h-4 text-gray-600" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      cancelled: "secondary",
      processing: "outline",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getProgress = (job: any) => {
    if (job.totalRows === 0) return 0;
    return Math.round((job.processedRows / job.totalRows) * 100);
  };

  // Authentication is now handled on the server side with owner fallback

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Batch Processing
                </h1>
                <p className="text-sm text-muted-foreground">
                  Process millions of rows with enterprise-scale infrastructure
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link href="/monitoring">
                <Button variant="outline" size="sm">
                  <Activity className="w-4 h-4 mr-2" />
                  Monitoring
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Submit New Job</CardTitle>
            <CardDescription>
              Upload a CSV file to process. Supports up to 1,000,000 rows per job.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="file">CSV File</Label>
                <div className="flex gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  {selectedFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Normalization Type</Label>
                <Select value={jobType} onValueChange={(v: any) => setJobType(v)} disabled={isUploading}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Names Only</SelectItem>
                    <SelectItem value="phone">Phone Numbers Only</SelectItem>
                    <SelectItem value="email">Emails Only</SelectItem>
                    <SelectItem value="company">Company Names Only</SelectItem>
                    <SelectItem value="address">Addresses Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSubmitJob}
              disabled={!selectedFile || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Job
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Job History</CardTitle>
                <CardDescription>
                  Your recent batch processing jobs
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchJobs()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No jobs yet. Submit your first batch job above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Valid/Invalid</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-sm">{job.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                                style={{ width: `${getProgress(job)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {getProgress(job)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {job.processedRows.toLocaleString()} / {job.totalRows.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <span className="text-green-600">{job.validRows.toLocaleString()}</span>
                          {" / "}
                          <span className="text-red-600">{job.invalidRows.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {job.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadResults(job)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {job.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelJob(job.id)}
                                title="Cancel job"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>v3.39.0 • Batch Processing API with Enterprise-Scale Infrastructure</p>
        </div>
      </footer>
    </div>
  );
}
