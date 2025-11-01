import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { ArrowLeft, Home, Phone, Mail, Briefcase, Upload, Download, Check } from "lucide-react";
import { useState } from "react";
import { AddressFormatter, type AddressFormatterResult } from "@/../../shared/normalization/addresses";
import { toast } from "sonner";

export default function AddressDemo() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<AddressFormatterResult | null>(null);
  const [abbreviateDirectionals, setAbbreviateDirectionals] = useState(false);
  const [abbreviateUnits, setAbbreviateUnits] = useState(false);
  
  // Batch state
  const [batchResults, setBatchResults] = useState<AddressFormatterResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Example addresses
  const examples = [
    { label: "All Caps", value: "143 WEST SIDLEE STREET" },
    { label: "With Directional", value: "456 NORTH MAIN AVENUE" },
    { label: "With Unit", value: "789 OAK BOULEVARD APARTMENT 5" },
    { label: "PO Box", value: "PO BOX 123" },
    { label: "Mixed Case", value: "321 SoUtH pArK TeRrAcE" },
    { label: "Full Words", value: "555 East Maple Drive Suite 200" }
  ];

  const handleNormalize = () => {
    if (!address.trim()) {
      toast.error("Please enter an address");
      return;
    }

    const options = {
      abbreviateDirectionals,
      abbreviateUnits
    };

    const normalized = AddressFormatter.normalizeWithDetails(address, options);
    setResult(normalized);
  };

  const handleExample = (value: string) => {
    setAddress(value);
    const options = {
      abbreviateDirectionals,
      abbreviateUnits
    };
    const normalized = AddressFormatter.normalizeWithDetails(value, options);
    setResult(normalized);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setBatchResults([]);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if present
      const hasHeader = !lines[0].match(/^\d/);
      const addresses = hasHeader ? lines.slice(1) : lines;

      if (addresses.length === 0) {
        toast.error("No addresses found in file");
        setIsProcessing(false);
        return;
      }

      if (addresses.length > 10000) {
        toast.error("File too large. Maximum 10,000 addresses.");
        setIsProcessing(false);
        return;
      }

      const options = {
        abbreviateDirectionals,
        abbreviateUnits
      };

      const results = AddressFormatter.normalizeBatchWithDetails(addresses, options);
      setBatchResults(results);
      toast.success(`Normalized ${results.length} addresses`);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCSV = () => {
    if (batchResults.length === 0) return;

    const csv = [
      ['Original Address', 'Normalized Address', 'Changes'].join(','),
      ...batchResults.map(r => [
        `"${r.original}"`,
        `"${r.normalized}"`,
        `"${r.changes.join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'normalized-addresses.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded normalized addresses");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link href="/phone">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Demo
                </Button>
              </Link>
              <Link href="/email">
                <Button variant="ghost" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Demo
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="ghost" size="sm">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Batch Jobs
                </Button>
              </Link>
            </div>
            <h1 className="text-xl font-bold">Address Normalization</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === "single" ? "default" : "outline"}
            onClick={() => setMode("single")}
          >
            Single Address
          </Button>
          <Button
            variant={mode === "batch" ? "default" : "outline"}
            onClick={() => setMode("batch")}
          >
            Batch Processing
          </Button>
        </div>

        {mode === "single" ? (
          <>
            {/* Single Address Mode */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Input Address</CardTitle>
                  <CardDescription>
                    Enter an address to normalize (Title Case + abbreviations)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="143 WEST SIDLEE STREET"
                      className="mt-2"
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="directionals"
                        checked={abbreviateDirectionals}
                        onCheckedChange={(checked) => setAbbreviateDirectionals(checked as boolean)}
                      />
                      <label
                        htmlFor="directionals"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Abbreviate directionals (North → N)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="units"
                        checked={abbreviateUnits}
                        onCheckedChange={(checked) => setAbbreviateUnits(checked as boolean)}
                      />
                      <label
                        htmlFor="units"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Abbreviate units (Apartment → Apt)
                      </label>
                    </div>
                  </div>

                  <Button onClick={handleNormalize} className="w-full">
                    Normalize Address
                  </Button>

                  {/* Examples */}
                  <div className="pt-4">
                    <Label className="text-xs text-muted-foreground">Quick Examples:</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {examples.map((ex) => (
                        <Button
                          key={ex.label}
                          variant="outline"
                          size="sm"
                          onClick={() => handleExample(ex.value)}
                          className="text-xs"
                        >
                          {ex.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Result Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Normalized Result</CardTitle>
                  <CardDescription>
                    Formatted address with Title Case and abbreviations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {result ? (
                    <div className="space-y-4">
                      {/* Original */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Original</Label>
                        <div className="mt-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-sm">
                          {result.original}
                        </div>
                      </div>

                      {/* Normalized */}
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          Normalized
                          <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Formatted
                          </Badge>
                        </Label>
                        <div className="mt-1 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md text-sm font-medium">
                          {result.normalized}
                        </div>
                      </div>

                      {/* Changes */}
                      {result.changes.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Changes Applied</Label>
                          <ul className="mt-2 space-y-1">
                            {result.changes.map((change, idx) => (
                              <li key={idx} className="text-xs flex items-start gap-2">
                                <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">Enter an address to see normalized result</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Batch Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Batch Address Normalization</CardTitle>
                <CardDescription>
                  Upload a CSV file with addresses (one per line, max 10,000)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Options */}
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="batch-directionals"
                      checked={abbreviateDirectionals}
                      onCheckedChange={(checked) => setAbbreviateDirectionals(checked as boolean)}
                    />
                    <label htmlFor="batch-directionals" className="text-sm">
                      Abbreviate directionals
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="batch-units"
                      checked={abbreviateUnits}
                      onCheckedChange={(checked) => setAbbreviateUnits(checked as boolean)}
                    />
                    <label htmlFor="batch-units" className="text-sm">
                      Abbreviate units
                    </label>
                  </div>
                </div>

                {/* Upload */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">
                      {isProcessing ? "Processing..." : "Click to upload CSV file"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV or TXT (max 10,000 addresses, 5MB)
                    </p>
                  </label>
                </div>

                {/* Results */}
                {batchResults.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          Processed {batchResults.length} addresses
                        </p>
                      </div>
                      <Button onClick={handleDownloadCSV} size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium">#</th>
                              <th className="text-left p-2 font-medium">Original</th>
                              <th className="text-left p-2 font-medium">Normalized</th>
                              <th className="text-left p-2 font-medium">Changes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batchResults.map((r, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2 text-muted-foreground">{idx + 1}</td>
                                <td className="p-2">{r.original}</td>
                                <td className="p-2 font-medium">{r.normalized}</td>
                                <td className="p-2 text-xs text-muted-foreground">
                                  {r.changes.join(', ') || 'No changes'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Documentation */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Address Normalization Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rules">Normalization Rules</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 pt-4">
                <div>
                  <h3 className="font-semibold mb-2">What is Address Normalization?</h3>
                  <p className="text-sm text-muted-foreground">
                    Address normalization converts inconsistent address formats (ALL CAPS, mixed case, full street names) 
                    into clean, standardized formats using Title Case and common postal abbreviations.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Use Cases</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Format standardization for data enrichment APIs</li>
                    <li>Cleaning inconsistent address data</li>
                    <li>Preparing addresses for mailing lists</li>
                    <li>Database deduplication</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">What This Does NOT Do</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Validate if address exists (use USPS, Google, or Radar API)</li>
                    <li>Geocode addresses (get lat/lng coordinates)</li>
                    <li>Fix typos or misspellings</li>
                    <li>Parse international addresses</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 pt-4">
                <div>
                  <h3 className="font-semibold mb-2">Street Suffixes</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>Street → St</div>
                    <div>Avenue → Ave</div>
                    <div>Boulevard → Blvd</div>
                    <div>Road → Rd</div>
                    <div>Drive → Dr</div>
                    <div>Lane → Ln</div>
                    <div>Court → Ct</div>
                    <div>Circle → Cir</div>
                    <div>Terrace → Ter</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Directionals (Optional)</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>North → N</div>
                    <div>South → S</div>
                    <div>East → E</div>
                    <div>West → W</div>
                    <div>Northeast → NE</div>
                    <div>Northwest → NW</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Unit Types (Optional)</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>Apartment → Apt</div>
                    <div>Suite → Ste</div>
                    <div>Building → Bldg</div>
                    <div>Floor → Fl</div>
                    <div>Room → Rm</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="examples" className="space-y-4 pt-4">
                <div className="space-y-3">
                  {[
                    { input: "143 WEST SIDLEE STREET", output: "143 West Sidlee St" },
                    { input: "456 NORTH MAIN AVENUE", output: "456 North Main Ave (or 456 N Main Ave with directionals)" },
                    { input: "789 OAK BOULEVARD APARTMENT 5", output: "789 Oak Blvd Apartment 5 (or Apt 5 with units)" },
                    { input: "PO BOX 123", output: "PO Box 123" },
                    { input: "321 SoUtH pArK TeRrAcE", output: "321 South Park Ter" }
                  ].map((ex, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Input:</span> {ex.input}
                      </div>
                      <div className="text-sm font-medium mt-1">
                        <span className="text-muted-foreground">Output:</span> {ex.output}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
