import { useState, useEffect, useMemo } from "react";
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
import { autoMapColumns, matchesToMappings, type ColumnMatch } from "@/lib/columnMatcher";
import { type ArrayHandlingStrategy } from "@/lib/arrayParser";
import ArrayStrategySelector from "./ArrayStrategySelector";

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
    arrayStrategies?: Map<string, ArrayHandlingStrategy>;
  }) => void;
}

export default function MatchingStep({
  originalFile,
  enrichedFiles,
  onBack,
  onContinue
}: MatchingStepProps) {
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<string[]>([]);
  const [availableIdentifiers, setAvailableIdentifiers] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<Map<string, MatchResult[]>>(new Map());
  const [matchStats, setMatchStats] = useState<Map<string, MatchStats>>(new Map());
  const [unmatchedRows, setUnmatchedRows] = useState<Map<string, UnmatchedRow[]>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState<string | null>(null);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [columnMappingTab, setColumnMappingTab] = useState<"input" | "output">("input");
  const [inputMappings, setInputMappings] = useState<Record<string, string>>({});
  const [outputMappings, setOutputMappings] = useState<Record<string, string>>({});
  const [showMatchPreview, setShowMatchPreview] = useState(false);
  const [showBulkTest, setShowBulkTest] = useState(false);
  const [bulkTestResults, setBulkTestResults] = useState<Array<{identifier: string, matchRate: number, matchedCount: number}>>([]);
  const [autoMapSuggestions, setAutoMapSuggestions] = useState<ColumnMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [arrayStrategies, setArrayStrategies] = useState<Map<string, ArrayHandlingStrategy>>(new Map());

  // Auto-detect identifier on mount
  useEffect(() => {
    if (enrichedFiles.length === 0) return;

    // Get available identifiers from first enriched file
    const identifiers = getAvailableIdentifiers(originalFile.data, enrichedFiles[0].data);
    setAvailableIdentifiers(identifiers);

    // Auto-detect best identifier
    const detected = autoDetectIdentifier(originalFile.data, enrichedFiles[0].data);
    if (detected) {
      setSelectedIdentifiers([detected]); // Start with single auto-detected identifier
    }
  }, [originalFile, enrichedFiles]);

  // Perform matching when identifiers change
  useEffect(() => {
    if (selectedIdentifiers.length === 0) return;

    setIsProcessing(true);

    // Match each enriched file
    const newMatchResults = new Map<string, MatchResult[]>();
    const newMatchStats = new Map<string, MatchStats>();
    const newUnmatchedRows = new Map<string, UnmatchedRow[]>();

    enrichedFiles.forEach(file => {
      const matches = matchRows(originalFile.data, file.data, selectedIdentifiers, inputMappings);
      const stats = calculateMatchStats(originalFile.data, file.data, matches, selectedIdentifiers[0]); // Use primary for stats
      const unmatched = getUnmatchedRows(originalFile.data, matches, selectedIdentifiers[0]);

      newMatchResults.set(file.id, matches);
      newMatchStats.set(file.id, stats);
      newUnmatchedRows.set(file.id, unmatched);
    });

    setMatchResults(newMatchResults);
    setMatchStats(newMatchStats);
    setUnmatchedRows(newUnmatchedRows);
    setIsProcessing(false);
  }, [selectedIdentifiers, originalFile, enrichedFiles, inputMappings]);

  const handleContinue = () => {
    onContinue({
      identifier: selectedIdentifiers.join(', '), // Pass comma-separated list
      matchResults,
      matchStats,
      unmatchedRows,
      arrayStrategies
    });
  };

  const canContinue = selectedIdentifiers.length > 0 && matchResults.size > 0;

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
              Identifier Columns
              {selectedIdentifiers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedIdentifiers.length} selected
                </Badge>
              )}
            </label>
            
            {/* Display selected identifiers with priority */}
            <div className="space-y-2 mb-3">
              {selectedIdentifiers.map((identifier, index) => {
                const quality = calculateIdentifierQuality(
                  originalFile.data,
                  enrichedFiles[0].data,
                  identifier
                );
                const priorityLabel = index === 0 ? "Primary" : index === 1 ? "Secondary" : "Tertiary";
                return (
                  <div key={identifier} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Badge variant="default" className="text-xs">
                      {priorityLabel}
                    </Badge>
                    <span className="flex-1 font-medium">{identifier}</span>
                    <Badge variant={quality >= 80 ? "default" : quality >= 60 ? "secondary" : "outline"}>
                      {quality}% quality
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedIdentifiers(prev => prev.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add identifier dropdown */}
            <Select
              value=""
              onValueChange={(value) => {
                if (value && !selectedIdentifiers.includes(value)) {
                  setSelectedIdentifiers(prev => [...prev, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add identifier column" />
              </SelectTrigger>
              <SelectContent>
                {availableIdentifiers
                  .filter(col => !selectedIdentifiers.includes(col))
                  .map(col => {
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
              Add multiple identifiers for fallback matching. Higher priority identifiers are tried first.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnMapper(!showColumnMapper)}
            >
              {showColumnMapper ? "Hide" : "Show"} Column Mapper
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedIdentifiers.length === 0) return;
                setShowMatchPreview(!showMatchPreview);
              }}
              disabled={selectedIdentifiers.length === 0}
            >
              {showMatchPreview ? "Hide" : "Show"} Match Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowBulkTest(true);
                // Test all identifiers
                const results = availableIdentifiers.map(id => {
                  const matches = matchRows(originalFile.data, enrichedFiles[0].data, id);
                  const stats = calculateMatchStats(originalFile.data, enrichedFiles[0].data, matches, id);
                  return {
                    identifier: id,
                    matchRate: stats.matchRate,
                    matchedCount: stats.matchedCount
                  };
                }).sort((a, b) => b.matchRate - a.matchRate);
                setBulkTestResults(results);
              }}
            >
              Test All Identifiers
            </Button>
          </div>

          {/* Column Mapper */}
          {showColumnMapper && enrichedFiles.length > 0 && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div>
                <h4 className="font-medium text-sm">Column Mapping</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure how columns are mapped between files
                </p>
              </div>

              {/* Header with Smart Auto-Map button */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2 border-b flex-1">
                <button
                  onClick={() => setColumnMappingTab("input")}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    columnMappingTab === "input"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Input Mapping
                </button>
                <button
                  onClick={() => setColumnMappingTab("output")}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    columnMappingTab === "output"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Output Mapping
                </button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const sourceColumns = columnMappingTab === "input" ? enrichedFiles[0].columns : originalFile.columns;
                    const targetColumns = columnMappingTab === "input" ? originalFile.columns : enrichedFiles[0].columns;
                    const suggestions = autoMapColumns(sourceColumns, targetColumns);
                    setAutoMapSuggestions(suggestions);
                    setShowSuggestions(true);
                  }}
                  className="ml-2"
                >
                  Smart Auto-Map
                </Button>
              </div>

              {/* Auto-Map Suggestions */}
              {showSuggestions && autoMapSuggestions.length > 0 && (
                <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950 space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="text-sm font-medium">Suggested Mappings ({autoMapSuggestions.length})</h5>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const mappings = matchesToMappings(autoMapSuggestions);
                          if (columnMappingTab === "input") {
                            setInputMappings(prev => ({ ...prev, ...mappings }));
                          } else {
                            setOutputMappings(prev => ({ ...prev, ...mappings }));
                          }
                          setShowSuggestions(false);
                        }}
                      >
                        Accept All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSuggestions(false)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {autoMapSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm bg-white dark:bg-gray-900 rounded p-2">
                        <span className="w-1/4 truncate font-medium">{suggestion.sourceColumn}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="w-1/4 truncate">{suggestion.targetColumn}</span>
                        <Badge
                          variant={suggestion.confidence >= 80 ? "default" : suggestion.confidence >= 60 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {suggestion.confidence}%
                        </Badge>
                        <span className="text-xs text-muted-foreground flex-1">{suggestion.reason}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (columnMappingTab === "input") {
                              setInputMappings(prev => ({ ...prev, [suggestion.sourceColumn]: suggestion.targetColumn }));
                            } else {
                              setOutputMappings(prev => ({ ...prev, [suggestion.sourceColumn]: suggestion.targetColumn }));
                            }
                          }}
                        >
                          Accept
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Mapping Tab */}
              {columnMappingTab === "input" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Map enriched file columns → original file columns (for finding matching identifier)
                  </p>
                  <div className="space-y-2">
                    {enrichedFiles[0].columns.map(enrichedCol => (
                      <div key={enrichedCol} className="flex items-center gap-2 text-sm">
                        <span className="w-1/3 truncate font-medium">{enrichedCol}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Select
                          value={inputMappings[enrichedCol] || ""}
                          onValueChange={(val) => setInputMappings(prev => ({...prev, [enrichedCol]: val}))}
                        >
                          <SelectTrigger className="w-1/2">
                            <SelectValue placeholder="Select original column" />
                          </SelectTrigger>
                          <SelectContent>
                            {originalFile.columns.map(origCol => (
                              <SelectItem key={origCol} value={origCol}>{origCol}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Output Mapping Tab */}
              {columnMappingTab === "output" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Map original file columns → enriched file columns (for merging enriched data back)
                  </p>
                  <div className="space-y-2">
                    {originalFile.columns.map(origCol => (
                      <div key={origCol} className="flex items-center gap-2 text-sm">
                        <span className="w-1/3 truncate font-medium">{origCol}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Select
                          value={outputMappings[origCol] || ""}
                          onValueChange={(val) => setOutputMappings(prev => ({...prev, [origCol]: val}))}
                        >
                          <SelectTrigger className="w-1/2">
                            <SelectValue placeholder="Select enriched column" />
                          </SelectTrigger>
                          <SelectContent>
                            {enrichedFiles[0].columns.map(enrichedCol => (
                              <SelectItem key={enrichedCol} value={enrichedCol}>{enrichedCol}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Match Preview */}
          {showMatchPreview && selectedIdentifiers.length > 0 && matchResults.size > 0 && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <h4 className="font-medium text-sm">Match Preview (First 10 Rows)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">#</th>
                      <th className="px-2 py-1 text-left">Matched By</th>
                      <th className="px-2 py-1 text-left">Original Value</th>
                      <th className="px-2 py-1 text-left">Enriched Value</th>
                      <th className="px-2 py-1 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(matchResults.values())[0]?.slice(0, 10).map((match, idx) => {
                      const origRow = originalFile.data[match.originalRowIndex];
                      const enrichedRow = enrichedFiles[0].data[match.enrichedRowIndex];
                      const matchedByCol = match.matchedBy || selectedIdentifiers[0];
                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1">{idx + 1}</td>
                          <td className="px-2 py-1">
                            <Badge variant="secondary" className="text-xs">{matchedByCol}</Badge>
                          </td>
                          <td className="px-2 py-1 truncate max-w-[150px]">
                            {String(origRow[matchedByCol] || '').substring(0, 30)}
                          </td>
                          <td className="px-2 py-1 truncate max-w-[150px]">
                            {String(enrichedRow[matchedByCol] || '').substring(0, 30)}
                          </td>
                          <td className="px-2 py-1">
                            <Badge variant="default" className="text-xs">Matched</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bulk Test Results */}
          {showBulkTest && bulkTestResults.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Identifier Comparison</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowBulkTest(false)}>Close</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Identifier</th>
                      <th className="px-3 py-2 text-left">Match Rate</th>
                      <th className="px-3 py-2 text-left">Matched Rows</th>
                      <th className="px-3 py-2 text-left">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkTestResults.map((result, idx) => (
                      <tr key={result.identifier} className="border-t">
                        <td className="px-3 py-2 font-medium">{result.identifier}</td>
                        <td className="px-3 py-2">
                          <Badge variant={result.matchRate >= 90 ? "default" : result.matchRate >= 70 ? "secondary" : "outline"}>
                            {result.matchRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{result.matchedCount.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          {idx === 0 && <Badge variant="default">Best Match</Badge>}
                          {idx > 0 && result.matchRate >= 90 && <Badge variant="secondary">Good</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Identifier Info */}
          {selectedIdentifiers.length > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Using <strong>{selectedIdentifiers.join(', ')}</strong> as matching identifier(s).
                {selectedIdentifiers.length > 1 && " Multiple identifiers provide fallback matching for better coverage."}
                {selectedIdentifiers.length === 1 && /email/i.test(selectedIdentifiers[0]) && " Email is highly reliable for matching."}
                {selectedIdentifiers.length === 1 && /phone/i.test(selectedIdentifiers[0]) && " Phone numbers work well if normalized."}
                {selectedIdentifiers.length === 1 && /^id$|customer.*id/i.test(selectedIdentifiers[0]) && " IDs provide perfect matching."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Match Results */}
      {selectedIdentifiers.length > 0 && !isProcessing && (
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
                              <th className="px-3 py-2 text-left font-medium">Identifier Value</th>
                              <th className="px-3 py-2 text-left font-medium">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unmatched.slice(0, 10).map(row => (
                              <tr key={row.rowIndex} className="border-t">
                                <td className="px-3 py-2">{row.rowIndex + 1}</td>
                                <td className="px-3 py-2">
                                  {String(row.data[selectedIdentifiers[0]] || "").substring(0, 40)}
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

      {/* Array Handling Configuration */}
      {matchResults.size > 0 && (
        <ArrayStrategySelector
          enrichedFiles={enrichedFiles}
          arrayStrategies={arrayStrategies}
          onStrategyChange={(column, strategy) => {
            setArrayStrategies((prev) => {
              const newMap = new Map(prev);
              newMap.set(column, strategy);
              return newMap;
            });
          }}
        />
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
