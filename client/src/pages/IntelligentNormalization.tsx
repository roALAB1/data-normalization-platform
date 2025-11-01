import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertCircle, Sparkles, Download, Home, Phone, Mail, MapPin, Briefcase } from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { NameEnhanced } from "@/lib/NameEnhanced";
import { PhoneEnhanced } from "@shared/normalization/phones/PhoneEnhanced";
import { EmailEnhanced } from "@shared/normalization/emails/EmailEnhanced";
import { AddressFormatter } from "@shared/normalization/addresses/AddressFormatter";

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

export default function IntelligentNormalization() {
  const [file, setFile] = useState<File | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [stats, setStats] = useState<{
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setColumnMappings([]);
    setResults([]);
    setStats(null);

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

  const normalizeValue = async (type: string, value: string): Promise<string> => {
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
    setProgress(0);
    setError(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      const dataLines = lines.slice(1);

      const processedResults: ProcessingResult[] = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < dataLines.length; i++) {
        const values = dataLines[i].split(",").map((v) => v.trim());
        const originalRow: Record<string, string> = {};
        const normalizedRow: Record<string, string> = {};

        headers.forEach((header, idx) => {
          originalRow[header] = values[idx] || "";
        });

        // Normalize each column
        for (const mapping of columnMappings) {
          const type = mapping.overrideType || mapping.detectedType;
          const value = originalRow[mapping.columnName];

          if (value && type !== 'unknown') {
            try {
              const normalized = await normalizeValue(type, value);
              normalizedRow[mapping.columnName] = normalized;
              if (normalized !== value) successCount++;
            } catch {
              normalizedRow[mapping.columnName] = value;
              failCount++;
            }
          } else {
            normalizedRow[mapping.columnName] = value;
          }
        }

        processedResults.push({
          originalRow,
          normalizedRow,
          rowIndex: i,
        });

        setProgress(((i + 1) / dataLines.length) * 100);
      }

      setResults(processedResults);
      setStats({
        totalRows: dataLines.length,
        processedRows: dataLines.length,
        successfulRows: successCount,
        failedRows: failCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (results.length === 0) return;

    const headers = Object.keys(results[0].normalizedRow);
    const csvContent = [
      headers.join(","),
      ...results.map((r) =>
        headers.map((h) => `"${r.normalizedRow[h] || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `normalized_${file?.name || "data.csv"}`;
    a.click();
    URL.revokeObjectURL(url);
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
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Intelligent Normalization</h1>
                <p className="text-sm text-gray-600">Auto-detect and normalize multiple data types</p>
              </div>
            </div>
          </Link>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
            <Link href="/phone">
              <Button variant="ghost" size="sm">Phone</Button>
            </Link>
            <Link href="/email">
              <Button variant="ghost" size="sm">Email</Button>
            </Link>
            <Link href="/address">
              <Button variant="ghost" size="sm">Address</Button>
            </Link>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">Batch Jobs</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Upload Section */}
        {!file && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV file and we'll automatically detect what type of data each column contains
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
                  Supports files up to 10,000 rows
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
                Normalizing {columnMappings.length} columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-4" />
              <p className="text-sm text-gray-600 text-center">
                {Math.round(progress)}% complete
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {results.length > 0 && stats && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Rows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalRows}</p>
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
                    {stats.processedRows}
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
                    {stats.successfulRows}
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
                    {stats.failedRows}
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
                      Showing first 100 rows
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
                  setStats(null);
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
