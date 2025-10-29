import { useState, useRef } from 'react';
import { EmailEnhanced, type EmailProvider, type EmailNormalizationResult } from '@shared/normalization/emails';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  Info,
  Home,
  HelpCircle,
  Upload,
  Download,
  FileText,
  BarChart3
} from 'lucide-react';
import { Link } from 'wouter';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const exampleEmails = [
  { email: 'John.Doe+spam@Gmail.com', description: 'Gmail with dots and plus tag' },
  { email: 'jane.smith+newsletter@outlook.com', description: 'Outlook with plus tag' },
  { email: 'user+test@yahoo.com', description: 'Yahoo with plus tag' },
  { email: 'alice.bob@icloud.com', description: 'iCloud with dots' },
  { email: 'test@EXAMPLE.COM', description: 'Uppercase domain' },
  { email: 'user+tag1+tag2@gmail.com', description: 'Multiple plus signs' },
  { email: 'first.middle.last@googlemail.com', description: 'GoogleMail domain' },
  { email: 'user@protonmail.com', description: 'ProtonMail' },
];

interface BatchStats {
  total: number;
  valid: number;
  invalid: number;
  byProvider: Record<string, number>;
}

export default function EmailDemo() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [inputEmail, setInputEmail] = useState('');
  const [result, setResult] = useState<ReturnType<EmailEnhanced['getResult']> | null>(null);
  const [batchResults, setBatchResults] = useState<EmailNormalizationResult[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNormalize = () => {
    if (inputEmail.trim()) {
      const email = new EmailEnhanced(inputEmail);
      setResult(email.getResult());
    }
  };

  const handleExampleClick = (example: string) => {
    setInputEmail(example);
    const email = new EmailEnhanced(example);
    setResult(email.getResult());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    // Check file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Please upload a CSV or TXT file');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error('File is empty');
          setIsProcessing(false);
          return;
        }

        if (lines.length > 10000) {
          toast.error('Maximum 10,000 emails per batch. Please split your file.');
          setIsProcessing(false);
          return;
        }

        // Parse CSV - detect email column
        const emails = parseEmailsFromCSV(lines);
        
        if (emails.length === 0) {
          toast.error('No valid emails found in file');
          setIsProcessing(false);
          return;
        }

        // Process emails
        setTimeout(() => {
          const results = EmailEnhanced.batchNormalize(emails);
          setBatchResults(results);
          
          // Calculate statistics
          const stats: BatchStats = {
            total: results.length,
            valid: results.filter(r => r.isValid).length,
            invalid: results.filter(r => !r.isValid).length,
            byProvider: {}
          };

          results.filter(r => r.isValid).forEach(r => {
            stats.byProvider[r.providerName] = (stats.byProvider[r.providerName] || 0) + 1;
          });

          setBatchStats(stats);
          setIsProcessing(false);
          setMode('batch');
          toast.success(`Processed ${results.length} emails from CSV`);
        }, 100);

      } catch (error) {
        console.error('File processing error:', error);
        toast.error('Error processing file. Please check the format.');
        setIsProcessing(false);
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const parseEmailsFromCSV = (lines: string[]): string[] => {
    const emails: string[] = [];
    
    // Try to detect if first line is header
    const firstLine = lines[0];
    const hasHeader = firstLine.toLowerCase().includes('email') || 
                      firstLine.toLowerCase().includes('mail') ||
                      firstLine.toLowerCase().includes('address');
    
    const startIndex = hasHeader ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // If line contains comma, it's CSV - try to find email column
      if (line.includes(',')) {
        const columns = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
        
        // Find column that looks like an email
        const emailCol = columns.find(col => col.includes('@'));
        if (emailCol) {
          emails.push(emailCol);
        }
      } else {
        // Single column - assume it's the email
        emails.push(line);
      }
    }
    
    return emails;
  };

  const downloadCSV = () => {
    if (batchResults.length === 0) return;

    const headers = ['Original Email', 'Normalized Email', 'Valid', 'Provider', 'Removed Dots', 'Plus Tag'];
    const rows = batchResults.map(r => [
      r.original,
      r.normalized,
      r.isValid ? 'Yes' : 'No',
      r.providerName,
      r.removedDots ? 'Yes' : 'No',
      r.plusTag || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `normalized-emails-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('CSV downloaded successfully');
  };

  const getProviderColor = (provider: EmailProvider): string => {
    const colors: Record<EmailProvider, string> = {
      gmail: 'bg-red-100 text-red-700 border-red-200',
      outlook: 'bg-blue-100 text-blue-700 border-blue-200',
      yahoo: 'bg-purple-100 text-purple-700 border-purple-200',
      icloud: 'bg-gray-100 text-gray-700 border-gray-200',
      protonmail: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      aol: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      fastmail: 'bg-green-100 text-green-700 border-green-200',
      zoho: 'bg-orange-100 text-orange-700 border-orange-200',
      other: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[provider] || colors.other;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Email Normalization
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade email validation and normalization
                </p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Mode Selector */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Processing Mode</CardTitle>
                <CardDescription>Choose between single email or batch CSV processing</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'single' ? 'default' : 'outline'}
                  onClick={() => setMode('single')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Single
                </Button>
                <Button
                  variant={mode === 'batch' ? 'default' : 'outline'}
                  onClick={() => setMode('batch')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Batch
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {mode === 'single' ? (
          <>
            {/* Introduction */}
            <Card className="mb-8 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  About Email Normalization
                </CardTitle>
                <CardDescription>
                  This demo uses <strong>validator.js</strong> (23.7k stars, 8-10M weekly downloads) for RFC 5322 compliant email validation
                  and provider-specific normalization rules.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Validation Features:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• RFC 5322 compliant validation</li>
                      <li>• UTF-8 local part support</li>
                      <li>• Domain-specific validation</li>
                      <li>• TLD requirement enforcement</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Normalization Features:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Provider detection (Gmail, Outlook, etc.)</li>
                      <li>• Plus tag extraction and removal</li>
                      <li>• Dot removal (Gmail-specific)</li>
                      <li>• Case normalization</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Input */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Input Email</CardTitle>
                    <CardDescription>
                      Enter an email address to validate and normalize
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Enter email (e.g., John.Doe+spam@Gmail.com)"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      className="font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNormalize();
                        }
                      }}
                    />
                    <Button onClick={handleNormalize} className="w-full" size="lg">
                      Normalize Email
                    </Button>
                  </CardContent>
                </Card>

                {/* Example Emails */}
                <Card>
                  <CardHeader>
                    <CardTitle>Example Emails</CardTitle>
                    <CardDescription>
                      Click any example to test the normalizer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {exampleEmails.map((example, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => handleExampleClick(example.email)}
                          className="w-full justify-start text-left font-mono text-xs"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">{example.email}</span>
                            <span className="text-muted-foreground text-xs">{example.description}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Results */}
              <div className="space-y-6">
                {result ? (
                  <>
                    {/* Validation Status */}
                    <Card className={result.isValid ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {result.isValid ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <span className="text-green-700">Valid Email</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="text-red-700">Invalid Email</span>
                            </>
                          )}
                        </CardTitle>
                        {result.validationErrors.length > 0 && (
                          <CardDescription className="text-red-600">
                            {result.validationErrors.join(', ')}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>

                    {result.isValid && (
                      <>
                        {/* Provider Information */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Email Provider</CardTitle>
                            <CardDescription>Detected provider and normalization rules</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Provider:</span>
                              <Badge className={getProviderColor(result.provider)}>
                                {result.providerName}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Domain:</span>
                              <span className="font-mono font-semibold">{result.domain}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Normalization Result */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Normalization Result</CardTitle>
                            <CardDescription>Original vs normalized email</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Original:</span>
                                <span className="font-mono font-semibold">{result.original}</span>
                              </div>
                              <div className="flex items-center justify-center">
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Normalized:</span>
                                <span className="font-mono font-semibold text-green-600">{result.normalized}</span>
                              </div>
                            </div>

                            {/* Applied Transformations */}
                            <div className="border-t pt-4">
                              <h4 className="text-sm font-semibold mb-2">Applied Transformations:</h4>
                              <div className="space-y-2">
                                {result.removedDots && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>Removed dots from local part</span>
                                  </div>
                                )}
                                {result.removedPlusTag && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>Removed plus tag: <code className="px-1 py-0.5 bg-muted rounded">+{result.plusTag}</code></span>
                                  </div>
                                )}
                                {!result.removedDots && !result.removedPlusTag && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>No transformations needed</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Provider-Specific Rules */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              Provider-Specific Rules
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-semibold mb-1">Provider Rules</p>
                                  <p className="text-xs">
                                    Each email provider has different rules for handling dots, plus tags, and case sensitivity.
                                    These rules ensure accurate email normalization and deduplication.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </CardTitle>
                            <CardDescription>How {result.providerName} handles email addresses</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {result.providerRules.notes.map((note, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-600 mt-0.5">•</span>
                                  <span className="text-muted-foreground">{note}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Mail className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Enter an email or click an example to see the results
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Batch Mode */
          <div className="space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Upload a CSV file containing email addresses (max 10,000 emails, 5MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isProcessing ? 'Processing...' : 'Upload CSV File'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV with email column, or plain text file with one email per line
                </p>
              </CardContent>
            </Card>

            {/* Statistics */}
            {batchStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{batchStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{batchStats.valid}</div>
                      <div className="text-sm text-muted-foreground">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{batchStats.invalid}</div>
                      <div className="text-sm text-muted-foreground">Invalid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Object.keys(batchStats.byProvider).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Providers</div>
                    </div>
                  </div>

                  {/* Provider Breakdown */}
                  {Object.keys(batchStats.byProvider).length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold mb-3">By Provider:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(batchStats.byProvider)
                          .sort(([, a], [, b]) => b - a)
                          .map(([provider, count]) => (
                            <div key={provider} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{provider}</span>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Results Table */}
            {batchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Normalization Results</CardTitle>
                      <CardDescription>
                        Showing {batchResults.length} emails
                      </CardDescription>
                    </div>
                    <Button onClick={downloadCSV} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted">
                          <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead>Original Email</TableHead>
                            <TableHead>Normalized Email</TableHead>
                            <TableHead className="w-[100px]">Provider</TableHead>
                            <TableHead className="w-[80px]">Status</TableHead>
                            <TableHead className="w-[100px]">Plus Tag</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchResults.map((result, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {result.original}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {result.isValid ? (
                                  <span className="text-green-600">{result.normalized}</span>
                                ) : (
                                  <span className="text-red-600 italic">Invalid</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {result.isValid && (
                                  <Badge className={getProviderColor(result.provider)} variant="outline">
                                    {result.providerName}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {result.isValid ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {result.plusTag && (
                                  <code className="px-1 py-0.5 bg-muted rounded">+{result.plusTag}</code>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {batchResults.length === 0 && !isProcessing && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No batch results yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file to process multiple emails at once
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Documentation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="validation">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="validation">Validation</TabsTrigger>
                <TabsTrigger value="normalization">Normalization</TabsTrigger>
                <TabsTrigger value="providers">Providers</TabsTrigger>
              </TabsList>
              <TabsContent value="validation" className="space-y-4 mt-4">
                <div className="prose prose-sm max-w-none">
                  <h3>Email Validation</h3>
                  <p>
                    We use <strong>validator.js</strong> for RFC 5322 compliant email validation with the following features:
                  </p>
                  <ul>
                    <li><strong>RFC 5322 Compliance:</strong> Follows official email address specification</li>
                    <li><strong>UTF-8 Support:</strong> Allows international characters in local part</li>
                    <li><strong>TLD Requirement:</strong> Ensures valid top-level domain (.com, .org, etc.)</li>
                    <li><strong>Domain Validation:</strong> Checks for valid domain format</li>
                    <li><strong>No IP Domains:</strong> Rejects IP-based email addresses</li>
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="normalization" className="space-y-4 mt-4">
                <div className="prose prose-sm max-w-none">
                  <h3>Normalization Process</h3>
                  <p>Email normalization applies provider-specific rules to create canonical email addresses:</p>
                  <ol>
                    <li><strong>Provider Detection:</strong> Identify email provider from domain</li>
                    <li><strong>Plus Tag Removal:</strong> Extract and remove plus tags (e.g., +spam, +newsletter)</li>
                    <li><strong>Dot Removal:</strong> Remove dots from local part (Gmail only)</li>
                    <li><strong>Case Normalization:</strong> Convert to lowercase (all major providers)</li>
                  </ol>
                  <p className="text-sm text-muted-foreground">
                    <strong>Example:</strong> John.Doe+spam@Gmail.com → johndoe@gmail.com
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="providers" className="space-y-4 mt-4">
                <div className="prose prose-sm max-w-none">
                  <h3>Supported Providers</h3>
                  <p>We support provider-specific rules for major email services:</p>
                  <ul>
                    <li><strong>Gmail/GoogleMail:</strong> Ignores dots, removes plus tags</li>
                    <li><strong>Outlook/Hotmail/Live:</strong> Dots are significant, removes plus tags</li>
                    <li><strong>Yahoo/YMail:</strong> Dots are significant, removes plus tags</li>
                    <li><strong>iCloud/Me/Mac:</strong> Dots are significant, removes plus tags</li>
                    <li><strong>ProtonMail:</strong> Dots are significant, removes plus tags</li>
                    <li><strong>AOL:</strong> Dots are significant, no plus tag support</li>
                    <li><strong>Fastmail:</strong> Dots are significant, removes plus tags</li>
                    <li><strong>Zoho:</strong> Dots are significant, removes plus tags</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    For unknown providers, we apply conservative normalization (preserve dots, remove plus tags).
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Email Normalization Demo • Powered by validator.js (23.7k stars, 8-10M weekly downloads)
          </p>
        </div>
      </footer>
    </div>
  );
}
