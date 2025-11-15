import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import {
  autoDetectIdentifier,
  matchRows,
  calculateMatchStats,
  getUnmatchedRows,
  getAvailableIdentifiers,
  calculateIdentifierQuality,
  type MatchResult,
  type MatchStats,
  type UnmatchedRow
} from "@/lib/matchingEngine";

interface UploadedFile {
  id: string;
  name: string;
  type: "original" | "enriched";
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
  matchFields?: string[];
}

interface MatchingStepProps {
  originalFile: UploadedFile;
  enrichedFiles: UploadedFile[];
  onBack: () => void;
  onContinue: (data: {
    identifier: string;
    matchResults: Map<string, MatchResult[]>;
    matchStats: Map<string, MatchStats>;
    unmatchedRows: Map<string, UnmatchedRow[]>;
  }) => void;
}

export default function MatchingStep({
  originalFile,
  enrichedFiles,
  onBack,
  onContinue
}: MatchingStepProps) {
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>("");
  const [availableIdentifiers, setAvailableIdentifiers] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<Map<string, MatchResult[]>>(new Map());
  const [matchStats, setMatchStats] = useState<Map<string, MatchStats>>(new Map());
  const [unmatchedRows, setUnmatchedRows] = useState<Map<string, UnmatchedRow[]>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState<string | null>(null);

  // Auto-detect identifier on mount
  useEffect(() => {
    if (enrichedFiles.length === 0) return;

    // Get available identifiers from first enriched file
    const identifiers = getAvailableIdentifiers(originalFile.data, enrichedFiles[0].data);
    setAvailableIdentifiers(identifiers);

    // Auto-detect best identifier
    const detected = autoDetectIdentifier(originalFile.data, enrichedFiles[0].data);
    if (detected) {
      setSelectedIdentifier(detected);
    }
  }, [originalFile, enrichedFiles]);

  // Perform matching when identifier changes
  useEffect(() => {
    if (!selectedIdentifier) return;

    setIsProcessing(true);

    // Match each enriched file
    const newMatchResults = new Map<string, MatchResult[]>();
    const newMatchStats = new Map<string, MatchStats>();
    const newUnmatchedRows = new Map<string, UnmatchedRow[]>();

    enrichedFiles.forEach(file => {
      const matches = matchRows(originalFile.data, file.data, selectedIdentifier);
      const stats = calculateMatchStats(originalFile.data, file.data, matches, selectedIdentifier);
      const unmatched = getUnmatchedRows(originalFile.data, matches, selectedIdentifier);

      newMatchResults.set(file.id, matches);
      newMatchStats.set(file.id, stats);
      newUnmatchedRows.set(file.id, unmatched);
    });

    setMatchResults(newMatchResults);
    setMatchStats(newMatchStats);
    setUnmatchedRows(newUnmatchedRows);
    setIsProcessing(false);
  }, [selectedIdentifier, originalFile, enrichedFiles]);

  const handleContinue = () => {
    onContinue({
      identifier: selectedIdentifier,
      matchResults,
      matchStats,
      unmatchedRows
    });
  };

  const canContinue = selectedIdentifier && matchResults.size > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Identifier Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Matching Configuration</CardTitle>
          <CardDescription>
            Select the column to use for matching enriched data back to original CRM rows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Identifier Column
              {selectedIdentifier && (
                <Badge variant="secondary" className="ml-2">
                  Auto-detected
                </Badge>
              )}
            </label>
            <Select value={selectedIdentifier} onValueChange={setSelectedIdentifier}>
              <SelectTrigger>
                <SelectValue placeholder="Select identifier column" />
              </SelectTrigger>
              <SelectContent>
                {availableIdentifiers.map(col => {
                  const quality = calculateIdentifierQuality(
                    originalFile.data,
                    enrichedFiles[0].data,
                    col
                  );
                  return (
                    <SelectItem key={col} value={col}>
                      <div className="flex items-center justify-between w-full">
                        <span>{col}</span>
                        <Badge
                          variant={quality >= 80 ? "default" : quality >= 60 ? "secondary" : "outline"}
                          className="ml-2"
                        >
                          {quality}% quality
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Higher quality scores indicate better matching reliability (uniqueness + type bonus)
            </p>
          </div>

          {/* Identifier Info */}
          {selectedIdentifier && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Using <strong>{selectedIdentifier}</strong> as the matching identifier.
                {/email/i.test(selectedIdentifier) && " Email is highly reliable for matching."}
                {/phone/i.test(selectedIdentifier) && " Phone numbers work well if normalized."}
                {/^id$|customer.*id/i.test(selectedIdentifier) && " IDs provide perfect matching."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Match Results */}
      {selectedIdentifier && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
            <CardDescription>
              Statistics for each enriched file matched against the original CRM export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrichedFiles.map(file => {
              const stats = matchStats.get(file.id);
              const unmatched = unmatchedRows.get(file.id) || [];

              if (!stats) return null;

              return (
                <div key={file.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.rowCount.toLocaleString()} rows • {file.columns.length} columns
                      </p>
                    </div>
                    <Badge
                      variant={stats.matchRate >= 90 ? "default" : stats.matchRate >= 70 ? "secondary" : "destructive"}
                    >
                      {stats.matchRate.toFixed(1)}% match rate
                    </Badge>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Matched</p>
                      <p className="text-lg font-semibold text-green-600">
                        {stats.matchedCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unmatched</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {stats.unmatchedCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duplicates</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {stats.duplicateMatches}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Match Progress</span>
                      <span>{stats.matchedCount} / {stats.totalOriginalRows}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${stats.matchRate}%` }}
                      />
                    </div>
                  </div>

                  {/* View Unmatched Button */}
                  {unmatched.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUnmatched(showUnmatched === file.id ? null : file.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {showUnmatched === file.id ? "Hide" : "View"} Unmatched Rows ({unmatched.length})
                    </Button>
                  )}

                  {/* Unmatched Rows Table */}
                  {showUnmatched === file.id && unmatched.length > 0 && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Row #</th>
                              <th className="px-3 py-2 text-left font-medium">{selectedIdentifier}</th>
                              <th className="px-3 py-2 text-left font-medium">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unmatched.slice(0, 10).map(row => (
                              <tr key={row.rowIndex} className="border-t">
                                <td className="px-3 py-2">{row.rowIndex + 1}</td>
                                <td className="px-3 py-2">
                                  {String(row.data[selectedIdentifier] || "").substring(0, 40)}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{row.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {unmatched.length > 10 && (
                        <div className="px-3 py-2 bg-muted text-xs text-muted-foreground text-center">
                          Showing first 10 of {unmatched.length} unmatched rows
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Upload
        </Button>
        <Button
          size="lg"
          disabled={!canContinue || isProcessing}
          onClick={handleContinue}
        >
          Continue to Conflicts
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
