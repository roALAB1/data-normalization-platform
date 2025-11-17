import { useState } from 'react';
import { NameEnhanced as Name, NameEnhanced } from '@/lib/NameEnhanced';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, User, FileText, Sparkles } from 'lucide-react';

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

export default function Home() {
  const [inputName, setInputName] = useState('');
  const [parsedName, setParsedName] = useState<NameEnhanced | null>(null);

  const handleParse = () => {
    if (inputName.trim()) {
      const name = new Name(inputName);
      setParsedName(name);
    }
  };

  const handleExampleClick = (example: string) => {
    setInputName(example);
    const name = new Name(example);
    setParsedName(name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Introduction */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              About This Demo
            </CardTitle>
            <CardDescription>
              This interactive demonstration showcases an enhanced name normalization script that combines
              the robust data cleaning capabilities of a Python-based approach with the flexible formatting
              features inspired by the Namefully JavaScript library.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Data Cleaning Features:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Encoding repair (mis-encoded characters)</li>
                  <li>• Job title detection and filtering</li>
                  <li>• Multi-person entry detection</li>
                  <li>• Credential removal (100+ degrees/certs)</li>
                  <li>• Nickname extraction</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Formatting Features:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Flexible output formats</li>
                  <li>• Last name prefix detection (80+ prefixes)</li>
                  <li>• Initials generation</li>
                  <li>• Custom format patterns</li>
                  <li>• Structured name parts</li>
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
                  className="min-h-[100px] font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleParse();
                    }
                  }}
                />
                <Button onClick={handleParse} className="w-full" size="lg">
                  Parse Name
                </Button>
              </CardContent>
            </Card>

            {/* Example Names */}
            <Card>
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
                      className="text-xs"
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
                <Card className={parsedName.isValid ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {parsedName.isValid ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">Valid Name</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <span className="text-red-700">Invalid Entry</span>
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {parsedName.isValid
                        ? 'Successfully parsed and normalized'
                        : 'This entry was filtered out (job title, multi-person, or invalid format)'}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {parsedName.isValid && (
                  <>
                    {/* Parsed Parts */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Parsed Name Parts</CardTitle>
                        <CardDescription>Extracted components</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="font-semibold text-muted-foreground">Part</div>
                            <div className="col-span-2 font-semibold text-muted-foreground">Value</div>
                          </div>
                          {[
                            { label: 'First Name', value: parsedName.firstName },
                            { label: 'Middle Name', value: parsedName.middleName },
                            { label: 'Last Name', value: parsedName.lastName },
                            { label: 'Nickname', value: parsedName.nickname },
                          ].map(({ label, value }, idx) => (
                            <div key={`part-${label}-${idx}`} className="grid grid-cols-3 gap-2 text-sm border-t pt-2">
                              <div className="text-muted-foreground">{label}</div>
                              <div className="col-span-2 font-mono">
                                {value ? (
                                  <Badge variant="secondary">{value}</Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">—</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Formatted Outputs */}
                    <Card>
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
                          ].map(({ label, value }, idx) => (
                            <div key={`format-${label}-${idx}`} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                              <span className="text-muted-foreground">{label}:</span>
                              <span className="font-mono font-semibold">{value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Repair Log */}
                {parsedName.parseLog.length > 0 && (
                  <Card>
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
                      <div className="space-y-2">
                        {parsedName.parseLog.map((log: any, idx: number) => (
                          <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.reason.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="font-mono text-xs space-y-1">
                              <div className="text-red-600">- {log.original}</div>
                              <div className="text-green-600">+ {log.repaired}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Enter a name or click an example to see the results
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Documentation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cleaning">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cleaning">Data Cleaning</TabsTrigger>
                <TabsTrigger value="parsing">Name Parsing</TabsTrigger>
                <TabsTrigger value="formatting">Formatting</TabsTrigger>
              </TabsList>
              <TabsContent value="cleaning" className="space-y-4 mt-4">
                <div className="prose prose-sm max-w-none">
                  <h3>Data Cleaning Process</h3>
                  <p>The script performs several cleaning operations before parsing:</p>
                  <ol>
                    <li><strong>Encoding Repair:</strong> Fixes mis-encoded characters (e.g., Fran?ois → François)</li>
                    <li><strong>Multi-Person Detection:</strong> Rejects entries with "&", "and", or "/" (e.g., "John and Jane")</li>
                    <li><strong>Nickname Extraction:</strong> Extracts nicknames from quotes or parentheses</li>
                    <li><strong>Job Title Filtering:</strong> Removes entries containing job-related keywords</li>
                    <li><strong>Credential Removal:</strong> Strips 100+ academic degrees and certifications</li>
                    <li><strong>Character Normalization:</strong> Removes special characters and normalizes spaces</li>
                  </ol>
                </div>
              </TabsContent>
              <TabsContent value="parsing" className="space-y-4 mt-4">
                <div className="prose prose-sm max-w-none">
                  <h3>Name Parsing Logic</h3>
                  <p>After cleaning, the script intelligently parses name parts:</p>
                  <ol>
                    <li><strong>First Name:</strong> Always the first word</li>
                    <li><strong>Last Name Prefix Detection:</strong> Recognizes 80+ prefixes from multiple cultures (van, de, al, mac, etc.)</li>
                    <li><strong>Last Name:</strong> Final word(s), including detected prefixes</li>
                    <li><strong>Middle Name:</strong> Everything between first and last name</li>
                  </ol>
                  <p className="text-sm text-muted-foreground">
                    Example: "María De La Cruz García" → First: María, Last: De La Cruz García
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="formatting" className="space-y-4 mt-4">
                <div className="prose prose-sm max-w-none">
                  <h3>Flexible Formatting</h3>
                  <p>The Name class provides multiple formatting options:</p>
                  <ul>
                    <li><strong>.full:</strong> Complete name with all parts</li>
                    <li><strong>.short:</strong> First and last name only</li>
                    <li><strong>.initials:</strong> Array of initials</li>
                    <li><strong>.format(pattern):</strong> Custom patterns using:
                      <ul>
                        <li>f = first name, m = middle, l = last</li>
                        <li>F = FIRST (uppercase), M = MIDDLE, L = LAST</li>
                      </ul>
                    </li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Example: .format('L, f m') → "SMITH, John Paul"
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
            v3.39.0 • Enhanced Name Normalization Demo • Enterprise-Scale Data Processing
          </p>
        </div>
      </footer>
    </div>
  );
}
