import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, Sparkles, Bug, Zap, Plus, ArrowLeft } from "lucide-react";

export default function Changelog() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Changelog</h1>
                <p className="text-sm text-gray-600">Version history & release notes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* v3.6.3 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  v3.6.3
                  <Badge>Latest</Badge>
                </CardTitle>
                <CardDescription>November 2, 2025</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-red-500" />
                Critical Bug Fix
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-6">
                <li className="list-disc">Fixed random letters (p, m, s, q, d) appearing in normalized names</li>
                <li className="list-disc">Fixed format() method leaking format codes when name parts are empty</li>
                <li className="list-disc">Names now output cleanly without stray characters</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* v3.6.1 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  v3.6.1
                </CardTitle>
                <CardDescription>November 2, 2025</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-red-500" />
                Bug Fixes
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Fixed dropdown labels showing truncated text (now displays "Full Name", "First Name", "Last Name" clearly)</li>
                <li>Fixed name columns outputting empty values (worker now processes first-name and last-name types correctly)</li>
                <li>Fixed React duplicate key warnings in IntelligentNormalization component</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-500" />
                New Features
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Location normalization now splits into TWO separate columns: City and State</li>
                <li>Added support for 50+ US state abbreviations</li>
                <li>Added Changelog tab to app for version history</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Improvements
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Updated GitHub link to point directly to README documentation</li>
                <li>Improved column type detection for first-name and last-name fields</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* v3.6.0 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>v3.6.0</CardTitle>
                <CardDescription>November 1, 2025</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-500" />
                New Features
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>E.164 phone format with + prefix (enrichment tool compliance)</li>
                <li>Location normalization: "City, State, Country" → "City, ST"</li>
                <li>Separate first-name and last-name column types</li>
                <li>Cache-busting for worker updates</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-red-500" />
                Bug Fixes
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Fixed Ben Brausen parsing issue (parts.length {'>'}= 3 check)</li>
                <li>Fixed Meng-Ling hyphenated name parsing (removed hyphen from formula prevention)</li>
                <li>Fixed Vite cache preventing worker updates</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Improvements
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Added dev:clean script for easy cache clearing</li>
                <li>Created DEV_TROUBLESHOOTING.md guide</li>
                <li>Added enrichment compliance documentation</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* v3.5.2 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>v3.5.2</CardTitle>
                <CardDescription>October 30, 2025</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-red-500" />
                Bug Fixes
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Fixed hyphenated names being split incorrectly (Meng-Ling Erik Kuo)</li>
                <li>Fixed Excel formula injection for values starting with "-"</li>
                <li>Fixed credential matching to not match within hyphenated names</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* v3.3.0 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>v3.3.0</CardTitle>
                <CardDescription>October 28, 2025</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-500" />
                New Features
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Intelligent CSV column detection (single full name, first/last split, or multi-column)</li>
                <li>Auto-detect header row vs data row</li>
                <li>Support multiple name column formats</li>
                <li>Clean credentials from combined first/last names</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-red-500" />
                Bug Fixes
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Fixed NameEnhanced parser marking 99% of names as invalid</li>
                <li>Fixed regex error in batch processing</li>
                <li>Fixed server-side job processor regex error</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* v1.0.0 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>v1.0.0</CardTitle>
                <CardDescription>October 15, 2025</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-500" />
                Initial Release
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Name normalization with 750+ credentials from Wikipedia, FDA, CompTIA, Cisco, Microsoft, AWS</li>
                <li>Phone number normalization with libphonenumber-js integration</li>
                <li>Email normalization with RFC 5322 validation and MX/SMTP verification</li>
                <li>Address normalization with USPS abbreviations</li>
                <li>Company name normalization</li>
                <li>Batch processing with job queue system</li>
                <li>Real-time progress tracking via WebSocket</li>
                <li>S3 file storage for uploads and results</li>
                <li>User authentication and job history</li>
                <li>Hybrid monorepo architecture with @normalization/core package</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          <p>
            View full source code on{" "}
            <a
              href="https://github.com/roALAB1/data-normalization-platform#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              GitHub
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
