import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  BarChart3,
  RefreshCw,
  Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';

export default function JobDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobType, setJobType] = useState<'name' | 'phone' | 'email' | 'company' | 'address'>('name');
  const [isUploading, setIsUploading] = useState(false);

  const { data: jobs, isLoading, refetch } = trpc.jobs.list.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated, refetchInterval: 5000 } // Auto-refresh every 5 seconds
  );

  const createJobMutation = trpc.jobs.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedFile(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUploading(false);
    },
  });

  const cancelJobMutation = trpc.jobs.cancel.useMutation({
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
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        toast.error('Please select a CSV or TXT file');
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
      
      await createJobMutation.mutateAsync({
        type: jobType,
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
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      processing: { variant: 'default', icon: Loader2, label: 'Processing' },
      completed: { variant: 'default', icon: CheckCircle2, label: 'Completed' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
      cancelled: { variant: 'outline', icon: AlertCircle, label: 'Cancelled' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const getProgress = (job: any) => {
    if (job.totalRows === 0) return 0;
    return Math.round((job.processedRows / job.totalRows) * 100);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access the job dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="w-full"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Batch Normalization Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload and process large datasets with server-side batch processing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload New Job</TabsTrigger>
            <TabsTrigger value="history">Job History</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload File for Batch Processing</CardTitle>
                <CardDescription>
                  Upload a CSV or TXT file with data to normalize. Maximum 1,000,000 rows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Normalization Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['name', 'phone', 'email', 'company', 'address'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={jobType === type ? 'default' : 'outline'}
                        onClick={() => setJobType(type)}
                        size="sm"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Select File</label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleUpload}
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
                      Upload and Process
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Processing Speed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">~1K-5K</div>
                  <p className="text-xs text-muted-foreground">rows per second</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Max File Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1M</div>
                  <p className="text-xs text-muted-foreground">rows per job</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Background Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24/7</div>
                  <p className="text-xs text-muted-foreground">close browser anytime</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{job.type.toUpperCase()}</Badge>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === 'completed' && job.outputFileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(job.outputFileUrl!, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Results
                          </Button>
                        )}
                        {job.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelJobMutation.mutate({ jobId: job.id })}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      Created {new Date(job.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    {(job.status === 'processing' || job.status === 'completed') && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{getProgress(job)}%</span>
                        </div>
                        <Progress value={getProgress(job)} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{job.processedRows.toLocaleString()} / {job.totalRows.toLocaleString()} rows</span>
                          {job.status === 'processing' && <span>Processing...</span>}
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    {job.status === 'completed' && (
                      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                        <div>
                          <div className="text-sm text-muted-foreground">Total Rows</div>
                          <div className="text-lg font-semibold">{job.totalRows.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Valid</div>
                          <div className="text-lg font-semibold text-green-600">
                            {job.validRows.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Invalid</div>
                          <div className="text-lg font-semibold text-red-600">
                            {job.invalidRows.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {job.status === 'failed' && job.errorMessage && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{job.errorMessage}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No jobs yet. Upload a file to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
