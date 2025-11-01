import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertCircle, Sparkles, Download, Home, Phone, Mail, MapPin, Briefcase, Pause, Play, X, Zap, User, Building2 } from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { NameEnhanced } from "@/lib/NameEnhanced";
import { PhoneEnhanced } from "@shared/normalization/phones/PhoneEnhanced";
import { EmailEnhanced } from "@shared/normalization/emails/EmailEnhanced";
import { AddressFormatter } from "@shared/normalization/addresses/AddressFormatter";
import { StreamingCSVProcessor, type StreamingStats } from "@shared/normalization/intelligent/StreamingCSVProcessor";
import { ChunkedNormalizer } from "@shared/normalization/intelligent/ChunkedNormalizer";
import { ProgressiveDownloader } from "@/lib/ProgressiveDownloader";
import type { NormalizationStrategy } from "@shared/normalization/intelligent/UnifiedNormalizationEngine";
import { ColumnTransformationsSummary, type ColumnTransformation } from "@/components/ColumnTransformationsSummary";

interface ColumnMapping {
  columnName: string;
  detectedType: string;
  confidence: number;
  overrideType?: string;
}

interface ProcessingResult {
  originalRow: Record<string, string>;
  normalizedRow: Record<string, string>;
  rowIndex: number;
}

// Simple inline data type detector
function detectColumnType(columnName: string, samples: string[]): { type: string; confidence: number } {
  const name = columnName.toLowerCase();
  
  // Header-based detection
  if (name.includes('email') || name.includes('e-mail')) return { type: 'email', confidence: 95 };
  if (name.includes('phone') || name.includes('tel') || name.includes('mobile')) return { type: 'phone', confidence: 95 };
  if (name.includes('address') || name.includes('street')) return { type: 'address', confidence: 90 };
  if (name.includes('first') && name.includes('name')) return { type: 'name', confidence: 90 };
  if (name.includes('last') && name.includes('name')) return { type: 'name', confidence: 90 };
  if (name.includes('name')) return { type: 'name', confidence: 85 };
  if (name.includes('city')) return { type: 'city', confidence: 95 };
  if (name.includes('state')) return { type: 'state', confidence: 95 };
  if (name.includes('zip') || name.includes('postal')) return { type: 'zip', confidence: 95 };
  if (name.includes('country')) return { type: 'country', confidence: 95 };
  if (name.includes('company') || name.includes('business')) return { type: 'company', confidence: 90 };
  
  // Pattern-based detection on samples
  const emailPattern = /@/;
  const phonePattern = /[\d\(\)\-\+\s]{7,}/;
  const namePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+/;
  
  const emailCount = samples.filter(s => emailPattern.test(s)).length;
  const phoneCount = samples.filter(s => phonePattern.test(s)).length;
  const nameCount = samples.filter(s => namePattern.test(s)).length;
  
  const total = samples.length;
  if (emailCount / total > 0.7) return { type: 'email', confidence: 80 };
  if (phoneCount / total > 0.7) return { type: 'phone', confidence: 75 };
  if (nameCount / total > 0.6) return { type: 'name', confidence: 70 };
  
  return { type: 'unknown', confidence: 30 };
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function IntelligentNormalization() {
  const [file, setFile] = useState<File | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [streamingStats, setStreamingStats] = useState<StreamingStats | null>(null);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [allResults, setAllResults] = useState<any[][]>([]);
  const [stats, setStats] = useState<{
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingProcessorRef = useRef<StreamingCSVProcessor | null>(null);
  const chunkedNormalizerRef = useRef<ChunkedNormalizer | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setColumnMappings([]);
    setResults([]);
    setAllResults([]);
    setStats(null);
    setStreamingStats(null);

    setIsAnalyzing(true);
    try {
      const text = await selectedFile.text();
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file must have at least a header and one data row");
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const sampleRows = lines.slice(1, Math.min(6, lines.length));
      const samples: Record<string, string[]> = {};
      
      headers.forEach(header => {
        samples[header] = sampleRows.map(row => {
          const values = row.split(",");
          const idx = headers.indexOf(header);
          return values[idx]?.trim() || "";
        });
      });

      const mappings: ColumnMapping[] = headers.map((header) => {
        const detection = detectColumnType(header, samples[header]);
        return {
          columnName: header,
          detectedType: detection.type,
          confidence: detection.confidence,
        };
      });

      setColumnMappings(mappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      handleFileSelect(droppedFile);
    } else {
      setError("Please upload a CSV file");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleTypeOverride = (columnName: string, newType: string) => {
    setColumnMappings((prev) =>
      prev.map((mapping) =>
        mapping.columnName === columnName
          ? { ...mapping, overrideType: newType }
          : mapping
      )
    );
  };

  const normalizeValue = (type: string, value: string): string => {
    if (!value) return "";
    
    try {
      switch (type) {
        case 'name': {
          const name = new NameEnhanced(value);
          return name.isValid ? name.format('first-last') : value;
        }
        case 'email': {
          const email = new EmailEnhanced(value);
          return email.isValid ? email.normalized : value;
        }
        case 'phone': {
          const phone = PhoneEnhanced.parse(value);
          return phone.isValid ? phone.digitsOnly : value;
        }
        case 'address': {
          const result = AddressFormatter.normalize(value);
          return result.normalized;
        }
        default:
          return value;
      }
    } catch {
      return value;
    }
  };

  const handleProcess = async () => {
    if (!file || columnMappings.length === 0) return;

    setIsProcessing(true);
    setIsPaused(false);
    setProgress(0);
    setError(null);
    setAllResults([]);

    try {
      // Create strategy from column mappings
      const strategy: NormalizationStrategy = {
        columns: columnMappings.map(m => ({
          name: m.columnName,
          type: m.overrideType || m.detectedType,
        })),
      };

      // Initialize streaming processor
      const processor = new StreamingCSVProcessor({
        chunkSize: 2000,
        header: true,
      });
      streamingProcessorRef.current = processor;

      // Initialize chunked normalizer
      const normalizer = new ChunkedNormalizer({
        workerPoolSize: navigator.hardwareConcurrency || 4,
        chunkSize: 2000,
      });
      chunkedNormalizerRef.current = normalizer;

      const chunks: any[][] = [];
      let totalRows = 0;

      // Stream and collect chunks
      await processor.processFile(
        file,
        async (chunk) => {
          chunks.push(chunk.data);
          totalRows += chunk.data.length;
        },
        (stats) => {
          setStreamingStats(stats);
          setProgress((stats.processedRows / (stats.totalRows || 1)) * 50); // First 50% for reading
        }
      );

      // Process chunks with normalizer
      const normalizedChunks = await normalizer.processChunks(
        chunks,
        strategy,
        (normStats) => {
          const progressPercent = 50 + (normStats.processedChunks / normStats.totalChunks) * 50;
          setProgress(progressPercent);
        }
      );

      // Flatten results
      const flatResults = normalizedChunks.flat();
      setAllResults(flatResults);

      // Show preview (first 100 rows)
      const preview = flatResults.slice(0, 100).map((row, idx) => ({
        originalRow: row,
        normalizedRow: row,
        rowIndex: idx,
      }));
      setResults(preview);

      setStats({
        totalRows: flatResults.length,
        processedRows: flatResults.length,
        successfulRows: flatResults.length,
        failedRows: 0,
      });

      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
      streamingProcessorRef.current = null;
      chunkedNormalizerRef.current = null;
    }
  };

  const handlePause = () => {
    if (streamingProcessorRef.current) {
      streamingProcessorRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (streamingProcessorRef.current) {
      streamingProcessorRef.current.resume();
      setIsPaused(false);
    }
  };

  const handleCancel = () => {
    if (streamingProcessorRef.current) {
      streamingProcessorRef.current.cancel();
    }
    if (chunkedNormalizerRef.current) {
      chunkedNormalizerRef.current.cancel();
    }
    setIsProcessing(false);
    setIsPaused(false);
  };

  const handleDownload = async () => {
    if (allResults.length === 0) return;

    const headers = columnMappings.map(m => m.columnName);
    
    const downloader = new ProgressiveDownloader({
      filename: `normalized_${file?.name || "data.csv"}`,
      headers,
    });

    await downloader.download([allResults]);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "name":
        return <Home className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "address":
        return <MapPin className="h-4 w-4" />;
      case "company":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default">High ({confidence}%)</Badge>;
    if (confidence >= 50) return <Badge variant="secondary">Medium ({confidence}%)</Badge>;
    return <Badge variant="outline">Low ({confidence}%)</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Data Normalization Platform</h1>
              <p className="text-sm text-gray-600">Enterprise-scale processing • 100k+ rows</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/jobs">
              <Button variant="ghost" size="sm">Batch Jobs</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        {!file && (
          <div className="max-w-5xl mx-auto mb-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Enterprise-Scale Data Normalization
              </h2>
              <p className="text-xl text-gray-600">
                Automatically detect and normalize names, emails, phones, addresses in one workflow
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Names */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <User className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Names</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Accepts full name OR first+last name columns</li>
                  <li>• Always outputs separate First Name & Last Name</li>
                  <li>• Strips 750+ credentials, honorifics, prefixes, suffixes</li>
                  <li>• Nationality and ethnicity name order nuance detection</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Examples:</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">Dr. John Smith, PhD</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">John Smith</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">WANG, Wei</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">Wei Wang</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emails */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Emails</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• RFC 5322 standard validation and formatting</li>
                  <li>• Provider-specific rules (Gmail, Outlook, etc.)</li>
                  <li>• MX/SMTP server verification for deliverability</li>
                  <li>• Disposable and temporary email detection</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Examples:</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">John.Smith@GMAIL.COM</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">johnsmith@gmail.com</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">user+tag@domain.com</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">user@domain.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Phone className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Phone Numbers</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 250+ countries with regional formatting rules</li>
                  <li>• Type detection (mobile, landline, toll-free, VoIP)</li>
                  <li>• Multiple format outputs (E.164, national, international)</li>
                  <li>• Carrier and region identification</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Examples:</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">(415) 555-1234</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">+1 415-555-1234</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">44 20 7946 0958</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">+44 20 7946 0958</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Home className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Addresses</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Title Case standardization for consistency</li>
                  <li>• 27+ street type abbreviations (St, Ave, Blvd, etc.)</li>
                  <li>• Directional normalization (N, S, E, W, NE, etc.)</li>
                  <li>• Unit type handling (Apt, Suite, Floor, etc.)</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Examples:</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">123 MAIN STREET</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">123 Main St</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 truncate">456 n elm ave apt 2b</span>
                      <span className="text-gray-300 hidden sm:inline">→</span>
                      <span className="text-indigo-600 font-medium truncate">456 N Elm Ave Apt 2B</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Companies - Coming Soon */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Company Names</h3>
                    <p className="text-sm text-gray-600">Normalize organization names • Match aliases • Standardize suffixes</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!file && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Upload a CSV file of any size - we'll automatically detect column types and process using enterprise streaming
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop your CSV file here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  ✨ No row limit • Streaming processing • Memory efficient
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Column Detection Section */}
        {file && columnMappings.length > 0 && !isProcessing && results.length === 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Column Detection Results</CardTitle>
                <CardDescription>
                  Review the detected column types and adjust if needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Column Headers */}
                <div className="flex items-center justify-between px-4 pb-3 border-b mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">Input Column</p>
                    <p className="text-xs text-gray-500">From your CSV file</p>
                  </div>
                  <div className="w-[280px] text-right">
                    <p className="text-sm font-semibold text-gray-700">Output Type</p>
                    <p className="text-xs text-gray-500">Normalized to</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {columnMappings.map((mapping) => (
                    <div
                      key={mapping.columnName}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getTypeIcon(mapping.overrideType || mapping.detectedType)}
                        <div>
                          <p className="font-medium">{mapping.columnName}</p>
                          <p className="text-sm text-gray-500">
                            Detected as: {mapping.detectedType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getConfidenceBadge(mapping.confidence)}
                        <Select
                          value={mapping.overrideType || mapping.detectedType}
                          onValueChange={(value) =>
                            handleTypeOverride(mapping.columnName, value)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="address">Address</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                            <SelectItem value="city">City</SelectItem>
                            <SelectItem value="state">State</SelectItem>
                            <SelectItem value="zip">ZIP Code</SelectItem>
                            <SelectItem value="country">Country</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button onClick={handleProcess} className="flex-1">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Normalize All Columns
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setColumnMappings([]);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Section */}
        {isProcessing && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Processing...</CardTitle>
              <CardDescription>
                Normalizing {columnMappings.length} columns with enterprise streaming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="mb-4" />
              <p className="text-sm text-gray-600 text-center">
                {Math.round(progress)}% complete
              </p>

              {streamingStats && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-gray-600">Rows Processed</p>
                    <p className="text-lg font-semibold">{streamingStats.processedRows.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-gray-600">Speed</p>
                    <p className="text-lg font-semibold">{Math.round(streamingStats.rowsPerSecond).toLocaleString()} rows/sec</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-gray-600">Time Remaining</p>
                    <p className="text-lg font-semibold">{formatTime(streamingStats.estimatedTimeRemaining)}</p>
                  </div>
                  {streamingStats.memoryUsage && (
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-600">Memory Usage</p>
                      <p className="text-lg font-semibold">{formatBytes(streamingStats.memoryUsage * 1024 * 1024)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                {!isPaused ? (
                  <Button variant="outline" size="sm" onClick={handlePause}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleResume}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {results.length > 0 && stats && (
          <div className="space-y-6">
            {/* Column Transformations Summary */}
            <ColumnTransformationsSummary
              transformations={columnMappings
                .filter(mapping => {
                  const type = mapping.overrideType || mapping.detectedType;
                  return type !== 'unknown' && type !== 'unchanged';
                })
                .map(mapping => {
                const transformation: ColumnTransformation = {
                  inputColumn: mapping.columnName,
                  outputColumns: [],
                  transformationType: 'unchanged',
                };

                if (mapping.detectedType === 'name' || mapping.overrideType === 'name') {
                  transformation.outputColumns = ['Full Name', 'First Name', 'Last Name'];
                  transformation.transformationType = 'split';
                  transformation.description = 'Split and normalize into Full Name, First Name, and Last Name';
                } else if (mapping.detectedType === 'email' || mapping.overrideType === 'email') {
                  transformation.outputColumns = [mapping.columnName];
                  transformation.transformationType = 'normalized';
                  transformation.description = 'Email normalized (lowercase, provider rules applied)';
                } else if (mapping.detectedType === 'phone' || mapping.overrideType === 'phone') {
                  transformation.outputColumns = [mapping.columnName];
                  transformation.transformationType = 'normalized';
                  transformation.description = 'Phone normalized (digits only, no formatting)';
                } else if (mapping.detectedType === 'address' || mapping.overrideType === 'address') {
                  transformation.outputColumns = [mapping.columnName];
                  transformation.transformationType = 'normalized';
                  transformation.description = 'Address normalized (title case, abbreviations)';
                } else if (mapping.detectedType !== 'unknown') {
                  transformation.outputColumns = [mapping.columnName];
                  transformation.transformationType = 'unchanged';
                }

                return transformation;
              })
              .filter(t => t.transformationType !== 'unchanged')}
            />

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Rows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalRows.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Processed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.processedRows.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Normalized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.successfulRows.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Unchanged
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-600">
                    {stats.failedRows.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Normalization Results</CardTitle>
                    <CardDescription>
                      Showing first 100 rows • {allResults.length.toLocaleString()} total rows processed
                    </CardDescription>
                  </div>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">#</th>
                        {Object.keys(results[0].normalizedRow).map((header) => (
                          <th key={header} className="text-left p-2 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 100).map((result) => (
                        <tr key={result.rowIndex} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-gray-500">{result.rowIndex + 1}</td>
                          {Object.keys(result.normalizedRow).map((header) => (
                            <td key={header} className="p-2">
                              {result.normalizedRow[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setColumnMappings([]);
                  setResults([]);
                  setAllResults([]);
                  setStats(null);
                  setStreamingStats(null);
                }}
              >
                Process Another File
              </Button>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {isAnalyzing && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-indigo-600 animate-pulse mb-4" />
              <p className="text-lg font-medium">Analyzing your CSV file...</p>
              <p className="text-sm text-gray-500 mt-2">
                Detecting column types and data patterns
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
