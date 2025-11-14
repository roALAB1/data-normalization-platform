// @ts-nocheck
import { useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  RefreshCw,
  Sparkles,
  TrendingUp,
  FileText,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

export default function JobDashboardEnhanced() {
  const { user, isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch jobs
  const { data: jobs, isLoading, refetch } = trpc.jobs.list.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated, refetchInterval: 5000 } // Poll every 5 seconds
  );

  // Fetch statistics
  const { data: stats } = trpc.jobs.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Submit batch mutation
  const submitBatchMutation = trpc.jobs.submitBatch.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUploading(false);
    },
  });

  // Retry mutation
  const retryMutation = trpc.jobs.retry.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Cancel mutation
  const cancelMutation = trpc.jobs.cancel.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      const fileContent = await selectedFile.text();
      
      await submitBatchMutation.mutateAsync({
        fileContent,
        fileName: selectedFile.name,
        config: {
          preserveAccents: false,
          defaultCountry: 'US',
        },
      });
      
      setIsUploading(false);
    } catch (error) {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string; color: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending', color: 'text-yellow-600' },
      processing: { variant: 'default', icon: Loader2, label: 'Processing', color: 'text-blue-600' },
      completed: { variant: 'default', icon: CheckCircle2, label: 'Completed', color: 'text-green-600' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed', color: 'text-red-600' },
      cancelled: { variant: 'outline', icon: AlertCircle, label: 'Cancelled', color: 'text-gray-600' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''} ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access the Job Dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Batch Job Dashboard</h1>
              <p className="text-sm text-gray-600">Server-side processing • Up to 1M rows</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.processing}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold text-indigo-600">{stats.successRate}%</div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Submit Intelligent Batch Job
            </CardTitle>
            <CardDescription>
              Upload a CSV file for server-side processing with automatic column type detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="min-w-[120px]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Job
                    </>
                  )}
                </Button>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-900 font-medium mb-2">✨ Intelligent Processing Features:</p>
                <ul className="text-sm text-indigo-800 space-y-1">
                  <li>• Automatic column type detection (name, email, phone, address)</li>
                  <li>• Multi-column normalization in a single pass</li>
                  <li>• Background processing with queue system</li>
                  <li>• Supports up to 1,000,000 rows</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Jobs</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">Job #{job.id}</h3>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          Type: <span className="font-medium capitalize">{job.type}</span> • 
                          Created {formatDate(job.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    {job.status === 'processing' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {job.processedRows} / {job.totalRows} rows
                          </span>
                        </div>
                        <Progress
                          value={(job.processedRows / job.totalRows) * 100}
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Stats */}
                    {job.status === 'completed' && (
                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-gray-600">Total Rows:</span>
                          <span className="ml-2 font-medium">{job.totalRows}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Valid:</span>
                          <span className="ml-2 font-medium text-green-600">{job.validRows}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Invalid:</span>
                          <span className="ml-2 font-medium text-red-600">{job.invalidRows}</span>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {job.status === 'failed' && job.errorMessage && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        {job.errorMessage}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' && job.outputFileUrl && (
                        <Button
                          size="sm"
                          variant="default"
                          asChild
                        >
                          <a href={job.outputFileUrl} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download Results
                          </a>
                        </Button>
                      )}

                      {job.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate({ jobId: job.id })}
                          disabled={retryMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      )}

                      {job.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelMutation.mutate({ jobId: job.id })}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No jobs yet. Upload a CSV file to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
