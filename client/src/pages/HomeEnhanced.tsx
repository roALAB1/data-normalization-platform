import { useState, useMemo } from 'react';
import { NameEnhanced, parseBatch, ParseResult } from '@/lib/NameEnhanced';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, CheckCircle2, User, FileText, Sparkles, 
  Copy, Download, Upload, Settings, BarChart3, 
  Clock, Zap, Moon, Sun, HelpCircle, Code
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';

const exampleNames = [
  "Dr. John Paul Smith Jr.",
  "María De La Cruz García",
  "François van der Berg",
  'John "Johnny" Smith',
  "Fran?ois Mu?oz",
  "Chief Executive Officer",
  "John and Jane Smith",
  "Björn Søren O'Brien PhD CPA",
  "Mr. Thomas Alva Edison",
  "Jose Garcia MBA"
];

interface BatchResult {
  results: ParseResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    avgParseTime: number;
    totalTime: number;
  };
}

export default function HomeEnhanced() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [inputName, setInputName] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [parsedName, setParsedName] = useState<NameEnhanced | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult | null>(null);
  const [preserveAccents, setPreserveAccents] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleParse = () => {
    if (inputName.trim()) {
      setIsProcessing(true);
      setTimeout(() => {
        const name = new NameEnhanced(inputName, { preserveAccents });
        setParsedName(name);
        setIsProcessing(false);
        toast.success('Name parsed successfully');
      }, 100);
    }
  };

  const handleBatchParse = () => {
    const names = batchInput.split('\n').filter(n => n.trim());
    if (names.length === 0) {
      toast.error('Please enter at least one name');
      return;
    }

    setIsProcessing(true);
    const startTime = performance.now();
    
    setTimeout(() => {
      const results = parseBatch(names, { preserveAccents });
      const totalTime = performance.now() - startTime;
      
      const stats = {
        total: results.length,
        valid: results.filter(r => r.name.isValid).length,
        invalid: results.filter(r => !r.name.isValid).length,
        avgParseTime: results.reduce((sum, r) => sum + r.performance.parseTime, 0) / results.length,
        totalTime
      };

      setBatchResults({ results, stats });
      setIsProcessing(false);
      toast.success(`Processed ${results.length} names in ${totalTime.toFixed(2)}ms`);
    }, 100);
  };

  const handleExampleClick = (example: string) => {
    setInputName(example);
    const name = new NameEnhanced(example, { preserveAccents });
    setParsedName(name);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadCSV = () => {
    if (!batchResults) return;
    
    const csv = [
      NameEnhanced.csvHeader(),
      ...batchResults.results.map(r => r.name.toCSVRow())
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `name-normalization-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const downloadJSON = () => {
    if (mode === 'single' && parsedName) {
      const blob = new Blob([parsedName.toJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `name-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON downloaded');
    } else if (mode === 'batch' && batchResults) {
      const data = {
        stats: batchResults.stats,
        results: batchResults.results.map(r => r.name.toObject())
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-results-${Date.now()}.json`;
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
      
      // If it's a CSV, try to extract names from first column
      if (file.name.endsWith('.csv')) {
        const names = lines.slice(1).map(line => {
          const match = line.match(/^"?([^",]+)"?/);
          return match ? match[1] : line.split(',')[0];
        });
        setBatchInput(names.join('\n'));
      } else {
        setBatchInput(lines.join('\n'));
      }
      
      setMode('batch');
      toast.success(`Loaded ${lines.length} names from file`);
    };
    reader.readAsText(file);
  };

  const highlightedParts = useMemo(() => {
    if (!parsedName || !parsedName.isValid) return null;
    return parsedName.getHighlightedParts();
  }, [parsedName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Enhanced Name Normalization
                </h1>
                <p className="text-sm text-muted-foreground">
                  Combining data cleaning power with flexible formatting
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="transition-transform hover:scale-110"
                  >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle dark mode</TooltipContent>
              </Tooltip>
            </div>
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
                <CardDescription>Choose between single name or batch processing</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'single' ? 'default' : 'outline'}
                  onClick={() => setMode('single')}
                  className="transition-all duration-200"
                >
                  <User className="w-4 h-4 mr-2" />
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="preserve-accents" className="text-base">
                  Preserve Accents
                </Label>
                <p className="text-sm text-muted-foreground">
                  Keep international characters instead of converting to ASCII
                </p>
              </div>
              <Switch
                id="preserve-accents"
                checked={preserveAccents}
                onCheckedChange={setPreserveAccents}
              />
            </div>
          </CardContent>
        </Card>

        {mode === 'single' ? (
          /* Single Name Mode */
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Input */}
            <div className="space-y-6">
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Input Name</CardTitle>
                  <CardDescription>
                    Enter a name to parse and normalize
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter a name (e.g., Dr. John Paul Smith Jr.)"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
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
                        Parse Name
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Example Names */}
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Example Names</CardTitle>
                  <CardDescription>
                    Click any example to test the parser
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {exampleNames.map((example, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExampleClick(example)}
                        className="text-xs transition-all duration-200 hover:scale-105"
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
              {parsedName ? (
                <>
                  {/* Validation Status */}
                  <Card className={`transition-all duration-300 ${parsedName.isValid ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {parsedName.isValid ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300">Valid Name</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="text-red-700 dark:text-red-300">Invalid Entry</span>
                          </>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          <Clock className="w-3 h-3 mr-1" />
                          {parsedName.parseTime.toFixed(2)}ms
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {parsedName.isValid
                          ? 'Successfully parsed and normalized'
                          : 'This entry was filtered out (job title, multi-person, or invalid format)'}
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Highlighted Input */}
                  {parsedName.isValid && highlightedParts && (
                    <Card className="transition-all duration-300 hover:shadow-lg">
                      <CardHeader>
                        <CardTitle>Name Part Highlighting</CardTitle>
                        <CardDescription>Visual breakdown of detected parts</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 p-4 bg-muted rounded-lg">
                          {highlightedParts.map((part, idx) => (
                            <Tooltip key={idx}>
                              <TooltipTrigger>
                                <span
                                  className={`px-2 py-1 rounded transition-all duration-200 ${
                                    part.type === 'first' ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100' :
                                    part.type === 'middle' ? 'bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100' :
                                    part.type === 'last' ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100' :
                                    part.type === 'nickname' ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100' :
                                    'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {part.text}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{part.type}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {parsedName.isValid && (
                    <>
                      {/* Parsed Parts */}
                      <Card className="transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                          <CardTitle>Parsed Name Parts</CardTitle>
                          <CardDescription>Extracted components</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              { label: 'First Name', value: parsedName.firstName },
                              { label: 'Middle Name', value: parsedName.middleName },
                              { label: 'Last Name', value: parsedName.lastName },
                              { label: 'Nickname', value: parsedName.nickname },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <span className="text-sm text-muted-foreground">{label}:</span>
                                <div className="flex items-center gap-2">
                                  {value ? (
                                    <>
                                      <Badge variant="secondary" className="font-mono">{value}</Badge>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 transition-transform hover:scale-110"
                                        onClick={() => copyToClipboard(value, label)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </>
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
                          <CardDescription>Various name formats</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              { label: 'Full', value: parsedName.full },
                              { label: 'Short', value: parsedName.short },
                              { label: 'Initials', value: parsedName.initials.join('. ') + '.' },
                              { label: 'Last, First', value: parsedName.format('l, f') },
                              { label: 'LAST, First Middle', value: parsedName.format('L, f m') },
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

                      {/* Export Options */}
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
                  {parsedName.parseLog.length > 0 && (
                    <Card className="transition-all duration-300 hover:shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Repair Log
                        </CardTitle>
                        <CardDescription>
                          {parsedName.parseLog.length} repair(s) applied
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {parsedName.parseLog.map((log, idx) => (
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
                              {log.changes && log.changes.length > 0 && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Changes: {log.changes.map(c => c.text).join(', ')}
                                </div>
                              )}
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
                    <User className="w-12 h-12 text-muted-foreground mb-4 animate-pulse" />
                    <p className="text-muted-foreground">
                      Enter a name or click an example to see the results
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
                      Enter multiple names (one per line) or upload a file
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
                  placeholder="Enter names, one per line..."
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
                        <div className="text-sm text-muted-foreground">Total Names</div>
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
                      Showing {batchResults.results.length} processed names
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Original</th>
                            <th className="text-left p-2">First</th>
                            <th className="text-left p-2">Middle</th>
                            <th className="text-left p-2">Last</th>
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
                              <td className="p-2 font-mono text-xs">{result.name.rawName}</td>
                              <td className="p-2">{result.name.firstName || '—'}</td>
                              <td className="p-2">{result.name.middleName || '—'}</td>
                              <td className="p-2">{result.name.lastName || '—'}</td>
                              <td className="p-2">
                                {result.name.isValid ? (
                                  <Badge variant="default" className="bg-green-500">Valid</Badge>
                                ) : (
                                  <Badge variant="destructive">Invalid</Badge>
                                )}
                              </td>
                              <td className="p-2 text-right text-muted-foreground">
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

        {/* Documentation */}
        <Card className="mt-8 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              API Documentation
            </CardTitle>
            <CardDescription>How to use the Name class programmatically</CardDescription>
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
                  <pre>{`import { NameEnhanced } from './lib/NameEnhanced';

// Parse a single name
const name = new NameEnhanced("Dr. John Paul Smith Jr.");

// Access parsed parts
console.log(name.firstName);  // "John"
console.log(name.lastName);   // "Smith"
console.log(name.full);       // "John Paul Smith"
console.log(name.short);      // "John Smith"

// Custom formatting
console.log(name.format('L, f m'));  // "SMITH, John Paul"

// Get initials
console.log(name.initials);  // ["J", "P", "S"]`}</pre>
                </div>
              </TabsContent>
              <TabsContent value="batch" className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`import { parseBatch } from './lib/NameEnhanced';

const names = [
  "John Smith",
  "María García",
  "François Dubois"
];

const results = parseBatch(names);

results.forEach(result => {
  console.log(result.name.full);
  console.log(\`Parsed in \${result.performance.parseTime}ms\`);
});`}</pre>
                </div>
              </TabsContent>
              <TabsContent value="options" className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`// Preserve accents
const name = new NameEnhanced("José García", {
  preserveAccents: true
});
console.log(name.firstName);  // "José" (not "Jose")

// Export to JSON
const json = name.toJSON();

// Export to CSV row
const csvRow = name.toCSVRow();

// Get highlighted parts for UI
const parts = name.getHighlightedParts();`}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Test Suite */}
        <Card className="mt-8 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Test Coverage
            </CardTitle>
            <CardDescription>Example test cases demonstrating parser robustness</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { input: "Dr. John Paul Smith Jr.", expected: "John Paul Smith", status: "pass" },
                { input: "María De La Cruz García", expected: "María De La Cruz García", status: "pass" },
                { input: "François van der Berg", expected: "François van der Berg", status: "pass" },
                { input: 'John "Johnny" Smith', expected: "John Smith (nickname: Johnny)", status: "pass" },
                { input: "Chief Executive Officer", expected: "Rejected (job title)", status: "pass" },
                { input: "John and Jane Smith", expected: "Rejected (multi-person)", status: "pass" },
              ].map((test, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex-1">
                    <div className="font-mono text-sm">{test.input}</div>
                    <div className="text-xs text-muted-foreground mt-1">→ {test.expected}</div>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {test.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-12 transition-colors duration-300">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Enhanced Name Normalization Demo • Combining Python data cleaning with Namefully-inspired formatting
          </p>
        </div>
      </footer>
    </div>
  );
}
