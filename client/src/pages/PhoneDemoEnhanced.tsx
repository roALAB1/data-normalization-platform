import { useState } from 'react';
import { PhoneEnhanced, type CountryCode } from '@shared/normalization/phones';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertCircle, CheckCircle2, Phone, Copy, Globe, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';

const examplePhones = [
  { phone: "+1 (213) 373-4253", country: "US", label: "US Mobile" },
  { phone: "+44 20 7946 0958", country: "GB", label: "UK Landline" },
  { phone: "+86 138 0000 0000", country: "CN", label: "China Mobile" },
  { phone: "+81 3-1234-5678", country: "JP", label: "Japan Landline" },
  { phone: "+82 10-1234-5678", country: "KR", label: "Korea Mobile" },
  { phone: "+61 2 1234 5678", country: "AU", label: "Australia Landline" },
  { phone: "+49 30 12345678", country: "DE", label: "Germany Landline" },
  { phone: "+33 1 42 86 82 00", country: "FR", label: "France Landline" },
  { phone: "1-800-FLOWERS", country: "US", label: "US Toll-Free (Vanity)" },
  { phone: "555-0100", country: "US", label: "US Short Number" },
];

const popularCountries = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
];

export default function PhoneDemoEnhanced() {
  const [inputPhone, setInputPhone] = useState('');
  const [defaultCountry, setDefaultCountry] = useState<CountryCode>('US');
  const [parsedPhone, setParsedPhone] = useState<PhoneEnhanced | null>(null);
  const [asYouTypeValue, setAsYouTypeValue] = useState('');

  const handleParse = () => {
    if (inputPhone.trim()) {
      const phone = new PhoneEnhanced(inputPhone, {
        defaultCountry,
        validateType: true
      });
      setParsedPhone(phone);
      toast.success('Phone number parsed');
    }
  };

  const handleExampleClick = (example: { phone: string; country: string }) => {
    setInputPhone(example.phone);
    setDefaultCountry(example.country as CountryCode);
    const phone = new PhoneEnhanced(example.phone, {
      defaultCountry: example.country as CountryCode,
      validateType: true
    });
    setParsedPhone(phone);
  };

  const handleAsYouTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = PhoneEnhanced.formatAsYouType(value, defaultCountry);
    setAsYouTypeValue(formatted);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Phone Normalization (Enhanced)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Powered by Google libphonenumber • 250+ countries supported
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link href="/phone">
                <Button variant="outline">Old Version</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">← Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="default-country">Default Country</Label>
              <Select value={defaultCountry} onValueChange={(v) => setDefaultCountry(v as CountryCode)}>
                <SelectTrigger id="default-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {popularCountries.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name} (+{PhoneEnhanced.getCallingCode(country.code as CountryCode)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Input Phone */}
            <Card>
              <CardHeader>
                <CardTitle>Input Phone Number</CardTitle>
                <CardDescription>Enter a phone number to parse and normalize</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter a phone number (e.g., +1 213 373 4253)"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  rows={3}
                  className="font-mono"
                />
                <Button onClick={handleParse} className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Parse Phone Number
                </Button>
              </CardContent>
            </Card>

            {/* As-You-Type Formatting */}
            <Card>
              <CardHeader>
                <CardTitle>As-You-Type Formatting</CardTitle>
                <CardDescription>See formatting as you type</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Start typing a phone number..."
                  value={asYouTypeValue}
                  onChange={handleAsYouTypeChange}
                  className="font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Automatically formats as you type based on selected country
                </p>
              </CardContent>
            </Card>

            {/* Example Phones */}
            <Card>
              <CardHeader>
                <CardTitle>Example Phone Numbers</CardTitle>
                <CardDescription>Click any example to test the parser</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {examplePhones.map((example, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExampleClick(example)}
                      className="text-xs"
                    >
                      {example.label}
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {parsedPhone.result.isValid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      Validation Result
                    </CardTitle>
                    <CardDescription>
                      {parsedPhone.result.isValid 
                        ? "This number is valid and can be dialed"
                        : parsedPhone.result.isPossible
                        ? "This number has valid length but may not be assigned"
                        : "This number is invalid for the detected region"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Overall Status */}
                    <div className="p-3 rounded-lg border-2 space-y-2" style={{
                      borderColor: parsedPhone.result.isValid ? 'rgb(34 197 94)' : parsedPhone.result.isPossible ? 'rgb(234 179 8)' : 'rgb(239 68 68)',
                      backgroundColor: parsedPhone.result.isValid ? 'rgb(240 253 244)' : parsedPhone.result.isPossible ? 'rgb(254 252 232)' : 'rgb(254 242 242)'
                    }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Overall Status:</span>
                        <Badge variant={parsedPhone.result.isValid ? "default" : parsedPhone.result.isPossible ? "secondary" : "destructive"} className="text-xs">
                          {parsedPhone.result.isValid ? "✓ VALID" : parsedPhone.result.isPossible ? "⚠ POSSIBLE" : "✗ INVALID"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {parsedPhone.result.isValid 
                          ? "Number passes all validation checks and is dialable"
                          : parsedPhone.result.isPossible
                          ? "Number has correct length but assignment is uncertain"
                          : "Number does not match valid patterns for any region"}
                      </p>
                    </div>

                    {/* Detailed Validation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <span className="text-sm font-medium">Strictly Valid:</span>
                          <p className="text-xs text-muted-foreground">Can be dialed right now</p>
                        </div>
                        <Badge variant={parsedPhone.result.isValid ? "default" : "outline"}>
                          {parsedPhone.result.isValid ? "✓ Yes" : "✗ No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <span className="text-sm font-medium">Possibly Valid:</span>
                          <p className="text-xs text-muted-foreground">Has valid length/format</p>
                        </div>
                        <Badge variant={parsedPhone.result.isPossible ? "default" : "outline"}>
                          {parsedPhone.result.isPossible ? "✓ Yes" : "✗ No"}
                        </Badge>
                      </div>
                    </div>

                    {/* Region Information */}
                    {parsedPhone.result.countryCode && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <span className="text-sm font-medium">Detected Region:</span>
                            <p className="text-xs text-muted-foreground">Country from number analysis</p>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {parsedPhone.result.countryCode}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <span className="text-sm font-medium">Country Name:</span>
                            <p className="text-xs text-muted-foreground">Full country name</p>
                          </div>
                          <span className="text-sm">{PhoneEnhanced.getCountryName(parsedPhone.result.countryCode)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <span className="text-sm font-medium">Calling Code:</span>
                            <p className="text-xs text-muted-foreground">International prefix</p>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            +{PhoneEnhanced.getCallingCode(parsedPhone.result.countryCode)}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Validation Quality Indicator */}
                    {parsedPhone.result.isValid && parsedPhone.result.countryCode && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">Valid for {PhoneEnhanced.getCountryName(parsedPhone.result.countryCode)}</p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                              This number meets all validation criteria for the {parsedPhone.result.countryCode} region and can be used for calls, SMS, or storage.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!parsedPhone.result.isValid && parsedPhone.result.isPossible && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Possibly Valid</p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              The number has a valid length and format, but may not be currently assigned or in use. Use with caution.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!parsedPhone.result.isValid && !parsedPhone.result.isPossible && (
                      <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">Invalid Number</p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                              This number does not match valid patterns for any region. Please check the input and try again.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {parsedPhone.result.typeDescription && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Type:</span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {parsedPhone.result.typeDescription}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Formatted Outputs */}
                {parsedPhone.result.isValid && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Formatted Outputs</CardTitle>
                      <CardDescription>Multiple format options</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {parsedPhone.result.internationalFormat && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">International Format:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(parsedPhone.result.internationalFormat!, "International format")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="p-2 bg-muted rounded font-mono text-sm">
                            {parsedPhone.result.internationalFormat}
                          </div>
                        </div>
                      )}

                      {parsedPhone.result.nationalFormat && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">National Format:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(parsedPhone.result.nationalFormat!, "National format")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="p-2 bg-muted rounded font-mono text-sm">
                            {parsedPhone.result.nationalFormat}
                          </div>
                        </div>
                      )}

                      {parsedPhone.result.e164Format && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">E.164 Format:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(parsedPhone.result.e164Format!, "E.164 format")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="p-2 bg-muted rounded font-mono text-sm">
                            {parsedPhone.result.e164Format}
                          </div>
                        </div>
                      )}

                      {parsedPhone.result.rfc3966Format && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">RFC3966 Format:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(parsedPhone.result.rfc3966Format!, "RFC3966 format")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="p-2 bg-muted rounded font-mono text-sm break-all">
                            {parsedPhone.result.rfc3966Format}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Parse Log */}
                <Card>
                  <CardHeader>
                    <CardTitle>Parse Log</CardTitle>
                    <CardDescription>Step-by-step parsing details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {parsedPhone.result.parseLog.map((log, idx) => (
                        <div key={idx} className="text-xs font-mono p-2 bg-muted rounded">
                          {log}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a phone number or click an example to see the results</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Features */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Powered by Google's libphonenumber</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">✅ 250+ Countries</h4>
                <p className="text-xs text-muted-foreground">
                  Comprehensive coverage for all countries and regions worldwide
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">✅ Type Detection</h4>
                <p className="text-xs text-muted-foreground">
                  Identifies Mobile, Landline, Toll-free, VoIP, and more
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">✅ Multiple Formats</h4>
                <p className="text-xs text-muted-foreground">
                  International, National, E.164, and RFC3966 formats
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">✅ As-You-Type</h4>
                <p className="text-xs text-muted-foreground">
                  Real-time formatting as users type phone numbers
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">✅ Enterprise-Grade</h4>
                <p className="text-xs text-muted-foreground">
                  Same library used by Android OS and major enterprises
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">✅ Fast & Offline</h4>
                <p className="text-xs text-muted-foreground">
                  No API calls required, perfect for batch processing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
