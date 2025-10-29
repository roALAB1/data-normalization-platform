import { useState, useMemo } from 'react';
import { PhoneNormalizer, parsePhoneBatch, PhoneBatchResult } from '@/lib/PhoneNormalizer';
import { phoneConfig } from '@/lib/phoneConfig';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertCircle, CheckCircle2, Phone, FileText, 
  Copy, Download, Upload, Settings, BarChart3, 
  Clock, Zap, Globe, Code, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';

const examplePhones = [
  "+1 (555) 123-4567",
  "555-123-4567",
  "+44 20 7946 0958",
  "+61 2 1234 5678",
  "+49 30 12345678",
  "1-800-FLOWERS",
  "(555) 0100",
  "123-456-7890 ext 123",
  "+86 138 0000 0000",
  "invalid phone",
];

interface BatchResult {
  results: PhoneBatchResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    avgParseTime: number;
    totalTime: number;
  };
}

export default function PhoneDemo() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [inputPhone, setInputPhone] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [parsedPhone, setParsedPhone] = useState<PhoneNormalizer | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult | null>(null);
  const [defaultCountry, setDefaultCountry] = useState('US');
  const [allowExtensions, setAllowExtensions] = useState(true);
  const [strictValidation, setStrictValidation] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleParse = () => {
    if (inputPhone.trim()) {
      setIsProcessing(true);
      setTimeout(() => {
        const phone = new PhoneNormalizer(inputPhone, {
          defaultCountry,
          allowExtensions,
          strictValidation
        });
        setParsedPhone(phone);
        setIsProcessing(false);
        toast.success('Phone number parsed successfully');
      }, 100);
    }
  };

  const handleBatchParse = () => {
    const phones = batchInput.split('\n').filter(p => p.trim());
    if (phones.length === 0) {
      toast.error('Please enter at least one phone number');
      return;
    }

    setIsProcessing(true);
    const startTime = performance.now();
    
    setTimeout(() => {
      const results = parsePhoneBatch(phones, {
        defaultCountry,
        allowExtensions,
        strictValidation
      });
      const totalTime = performance.now() - startTime;
      
      const stats = {
        total: results.length,
        valid: results.filter(r => r.phone.isValid).length,
        invalid: results.filter(r => !r.phone.isValid).length,
        avgParseTime: results.reduce((sum, r) => sum + r.performance.parseTime, 0) / results.length,
        totalTime
      };

      setBatchResults({ results, stats });
      setIsProcessing(false);
      toast.success(`Processed ${results.length} phone numbers in ${totalTime.toFixed(2)}ms`);
    }, 100);
  };

  const handleExampleClick = (example: string) => {
    setInputPhone(example);
    const phone = new PhoneNormalizer(example, {
      defaultCountry,
      allowExtensions,
      strictValidation
    });
    setParsedPhone(phone);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadCSV = () => {
    if (!batchResults) return;
    
    const csv = [
      PhoneNormalizer.csvHeader(),
      ...batchResults.results.map(r => r.phone.toCSVRow())
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phone-normalization-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const downloadJSON = () => {
    if (mode === 'single' && parsedPhone) {
      const blob = new Blob([parsedPhone.toJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phone-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON downloaded');
    } else if (mode === 'batch' && batchResults) {
      const data = {
        stats: batchResults.stats,
        results: batchResults.results.map(r => r.phone.toObject())
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phone-batch-results-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON downloaded');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      
      if (file.name.endsWith('.csv')) {
        const phones = lines.slice(1).map(line => {
          const match = line.match(/^"?([^",]+)"?/);
          return match ? match[1] : line.split(',')[0];
        });
        setBatchInput(phones.join('\n'));
      } else {
        setBatchInput(lines.join('\n'));
      }
      
      setMode('batch');
      toast.success(`Loaded ${lines.length} phone numbers from file`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Phone Number Normalization
                </h1>
                <p className="text-sm text-muted-foreground">
                  International phone validation and formatting
                </p>
              </div>
            </div>
            
            <Link href="/">
              <Button variant="outline">← Back to Name Demo</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Mode Selector */}
        <Card className="mb-6 border-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Processing Mode</CardTitle>
                <CardDescription>Choose between single phone or batch processing</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'single' ? 'default' : 'outline'}
                  onClick={() => setMode('single')}
                  className="transition-all duration-200"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Single
                </Button>
                <Button
                  variant={mode === 'batch' ? 'default' : 'outline'}
                  onClick={() => setMode('batch')}
                  className="transition-all duration-200"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Batch
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Settings Panel */}
        <Card className="mb-6 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <Label htmlFor="default-country">Default Country</Label>
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-blue-500 cursor-help hover:text-blue-600" />
                    <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-80 p-3 bg-popover border rounded-lg shadow-lg z-50 text-xs">
                      <p className="font-semibold mb-2 text-foreground">What is Default Country?</p>
                      <p className="text-muted-foreground mb-2">
                        The country used as context when parsing phone numbers <strong>without country codes</strong>.
                      </p>
                      <p className="font-semibold mb-1 text-foreground">Examples:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-2">
                        <li>With US selected: "(213) 373-4253" → Parsed as US number</li>
                        <li>With UK selected: "020 7946 0958" → Parsed as UK number</li>
                        <li>Numbers with "+" prefix ignore this setting</li>
                      </ul>
                      <p className="font-semibold mb-1 text-foreground">When it matters:</p>
                      <p className="text-muted-foreground">
                        Critical for parsing local/national format numbers. Always include country codes (+1, +44, etc.) for best accuracy.
                      </p>
                    </div>
                  </div>
                </div>
                <Select value={defaultCountry} onValueChange={setDefaultCountry}>
                  <SelectTrigger id="default-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneConfig.COUNTRY_CODES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.dialCode} {country.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="allow-extensions">Allow Extensions</Label>
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-blue-500 cursor-help hover:text-blue-600" />
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-72 p-3 bg-popover border rounded-lg shadow-lg z-50 text-xs">
                        <p className="font-semibold mb-2 text-foreground">Allow Extensions</p>
                        <p className="text-muted-foreground mb-2">
                          Parse phone extensions like "ext 123" or "x456" at the end of numbers.
                        </p>
                        <p className="font-semibold mb-1 text-foreground">Examples:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          <li>"555-1234 ext 100" → Extracts extension</li>
                          <li>"555-1234 x99" → Extracts extension</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Switch
                    id="allow-extensions"
                    checked={allowExtensions}
                    onCheckedChange={setAllowExtensions}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="strict-validation">Strict Validation</Label>
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-blue-500 cursor-help hover:text-blue-600" />
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-72 p-3 bg-popover border rounded-lg shadow-lg z-50 text-xs">
                        <p className="font-semibold mb-2 text-foreground">Strict Validation</p>
                        <p className="text-muted-foreground mb-2">
                          When enabled, only accepts numbers that pass <strong>all validation rules</strong> and are definitely dialable.
                        </p>
                        <p className="font-semibold mb-1 text-foreground">When to use:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-2">
                          <li><strong>ON:</strong> Banking, emergency services, real-time calling</li>
                          <li><strong>OFF:</strong> Data collection, contact forms, lenient parsing</li>
                        </ul>
                        <p className="text-muted-foreground">
                          When OFF, accepts numbers with correct format but may not be assigned.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Switch
                    id="strict-validation"
                    checked={strictValidation}
                    onCheckedChange={setStrictValidation}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {mode === 'single' ? (
          /* Single Phone Mode */
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Input */}
            <div className="space-y-6">
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Input Phone Number</CardTitle>
                  <CardDescription>
                    Enter a phone number to validate and format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter a phone number (e.g., +1 555-123-4567)"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    className="min-h-[100px] font-mono transition-all duration-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleParse();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleParse} 
                    className="w-full transition-all duration-200 hover:scale-105" 
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Zap className="w-4 h-4 mr-2 animate-pulse" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Parse Phone
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Example Phones */}
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Example Phone Numbers</CardTitle>
                  <CardDescription>
                    Click any example to test the parser
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {examplePhones.map((example, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExampleClick(example)}
                        className="text-xs transition-all duration-200 hover:scale-105 font-mono"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {parsedPhone ? (
                <>
                  {/* Validation Status */}
                  <Card className={`transition-all duration-300 ${parsedPhone.isValid ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {parsedPhone.isValid ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300">Valid Phone</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="text-red-700 dark:text-red-300">Invalid Phone</span>
                          </>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          <Clock className="w-3 h-3 mr-1" />
                          {parsedPhone.parseTime.toFixed(2)}ms
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {parsedPhone.isValid
                          ? `Successfully validated and formatted`
                          : 'This phone number could not be validated'}
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {parsedPhone.isValid && (
                    <>
                      {/* Phone Details */}
                      <Card className="transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            Phone Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              { label: 'Country', value: parsedPhone.country?.country },
                              { label: 'Country Code', value: parsedPhone.countryCode },
                              { label: 'National Number', value: parsedPhone.nationalNumber },
                              { label: 'Type', value: parsedPhone.type },
                              { label: 'Extension', value: parsedPhone.extension },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <span className="text-sm text-muted-foreground">{label}:</span>
                                <div className="flex items-center gap-2">
                                  {value ? (
                                    <Badge variant="secondary" className="font-mono">{value}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground italic text-sm">—</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Formatted Outputs */}
                      <Card className="transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                          <CardTitle>Formatted Outputs</CardTitle>
                          <CardDescription>Various phone number formats</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              { label: 'E.164', value: parsedPhone.e164 },
                              { label: 'International', value: parsedPhone.international },
                              { label: 'National', value: parsedPhone.national },
                              { label: 'RFC3966', value: parsedPhone.rfc3966 },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                <span className="text-muted-foreground">{label}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold">{value}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 transition-transform hover:scale-110"
                                    onClick={() => copyToClipboard(value, label)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Export */}
                      <Card className="transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                          <CardTitle>Export</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={downloadJSON} 
                            variant="outline" 
                            className="w-full transition-all duration-200 hover:scale-105"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download as JSON
                          </Button>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Repair Log */}
                  {parsedPhone.repairLog.length > 0 && (
                    <Card className="transition-all duration-300 hover:shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Repair Log
                        </CardTitle>
                        <CardDescription>
                          {parsedPhone.repairLog.length} repair(s) applied
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {parsedPhone.repairLog.map((log, idx) => (
                            <div key={idx} className="p-3 bg-muted rounded-lg text-sm transition-all duration-200 hover:shadow-md">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {log.reason.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <div className="font-mono text-xs space-y-1 bg-background p-2 rounded">
                                <div className="text-red-600 dark:text-red-400">
                                  <span className="opacity-50">- </span>{log.original}
                                </div>
                                <div className="text-green-600 dark:text-green-400">
                                  <span className="opacity-50">+ </span>{log.repaired}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-dashed transition-all duration-300">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Phone className="w-12 h-12 text-muted-foreground mb-4 animate-pulse" />
                    <p className="text-muted-foreground">
                      Enter a phone number or click an example to see the results
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Batch Mode */
          <div className="space-y-6">
            {/* Batch Input */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Batch Input</CardTitle>
                    <CardDescription>
                      Enter multiple phone numbers (one per line) or upload a file
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".txt,.csv"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter phone numbers, one per line..."
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  className="min-h-[200px] font-mono transition-all duration-200"
                />
                <Button 
                  onClick={handleBatchParse} 
                  className="w-full transition-all duration-200 hover:scale-105" 
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Process Batch
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Batch Results */}
            {batchResults && (
              <>
                {/* Statistics Dashboard */}
                <Card className="transition-all duration-300 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg transition-all duration-200 hover:shadow-md">
                        <div className="text-2xl font-bold">{batchResults.stats.total}</div>
                        <div className="text-sm text-muted-foreground">Total Phones</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg transition-all duration-200 hover:shadow-md">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{batchResults.stats.valid}</div>
                        <div className="text-sm text-muted-foreground">Valid</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all duration-200 hover:shadow-md">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{batchResults.stats.invalid}</div>
                        <div className="text-sm text-muted-foreground">Invalid</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all duration-200 hover:shadow-md">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {batchResults.stats.avgParseTime.toFixed(2)}ms
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Time</div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span className="font-semibold">
                          {((batchResults.stats.valid / batchResults.stats.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={(batchResults.stats.valid / batchResults.stats.total) * 100} 
                        className="transition-all duration-500"
                      />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button 
                        onClick={downloadCSV} 
                        variant="outline" 
                        className="flex-1 transition-all duration-200 hover:scale-105"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                      <Button 
                        onClick={downloadJSON} 
                        variant="outline" 
                        className="flex-1 transition-all duration-200 hover:scale-105"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Results Table */}
                <Card className="transition-all duration-300 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>
                      Showing {batchResults.results.length} processed phone numbers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Original</th>
                            <th className="text-left p-2">E.164</th>
                            <th className="text-left p-2">National</th>
                            <th className="text-left p-2">Country</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-right p-2">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.results.map((result, idx) => (
                            <tr 
                              key={idx} 
                              className="border-b transition-colors duration-200 hover:bg-muted/50"
                            >
                              <td className="p-2 font-mono text-xs">{result.phone.rawPhone}</td>
                              <td className="p-2 font-mono text-xs">{result.phone.e164 || '—'}</td>
                              <td className="p-2 font-mono text-xs">{result.phone.national || '—'}</td>
                              <td className="p-2 text-xs">{result.phone.country?.country || '—'}</td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-xs">{result.phone.type}</Badge>
                              </td>
                              <td className="p-2">
                                {result.phone.isValid ? (
                                  <Badge variant="default" className="bg-green-500">Valid</Badge>
                                ) : (
                                  <Badge variant="destructive">Invalid</Badge>
                                )}
                              </td>
                              <td className="p-2 text-right text-muted-foreground text-xs">
                                {result.performance.parseTime.toFixed(2)}ms
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* API Documentation */}
        <Card className="mt-8 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              API Documentation
            </CardTitle>
            <CardDescription>How to use the PhoneNormalizer class programmatically</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="usage">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="usage">Basic Usage</TabsTrigger>
                <TabsTrigger value="batch">Batch Processing</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
              </TabsList>
              <TabsContent value="usage" className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`import { PhoneNormalizer } from './lib/PhoneNormalizer';

// Parse a phone number
const phone = new PhoneNormalizer("+1 (555) 123-4567");

// Check validity
console.log(phone.isValid);  // true

// Get formatted outputs
console.log(phone.e164);          // "+15551234567"
console.log(phone.international); // "+1 (555) 123-4567"
console.log(phone.national);      // "(555) 123-4567"

// Get details
console.log(phone.country?.country);  // "United States"
console.log(phone.type);              // "UNKNOWN"
console.log(phone.extension);         // null`}</pre>
                </div>
              </TabsContent>
              <TabsContent value="batch" className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`import { parsePhoneBatch } from './lib/PhoneNormalizer';

const phones = [
  "+1 555-123-4567",
  "+44 20 7946 0958",
  "+61 2 1234 5678"
];

const results = parsePhoneBatch(phones, {
  defaultCountry: 'US'
});

results.forEach(result => {
  console.log(result.phone.e164);
  console.log(\`Parsed in \${result.performance.parseTime}ms\`);
});`}</pre>
                </div>
              </TabsContent>
              <TabsContent value="options" className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`// Configure default country
const phone = new PhoneNormalizer("555-123-4567", {
  defaultCountry: 'US'  // Assumes US if no country code
});

// Allow extensions
const phone2 = new PhoneNormalizer("555-123-4567 ext 123", {
  allowExtensions: true
});
console.log(phone2.extension);  // "123"

// Export to JSON
const json = phone.toJSON();

// Export to CSV row
const csvRow = phone.toCSVRow();`}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-12 transition-colors duration-300">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Phone Number Normalization • International validation and formatting
          </p>
        </div>
      </footer>
    </div>
  );
}
