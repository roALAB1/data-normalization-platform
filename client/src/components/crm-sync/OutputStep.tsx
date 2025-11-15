import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Download, Home, FileText, ArrowLeft } from "lucide-react";
import Papa from "papaparse";
import { Link } from "wouter";
import { resolveConflicts, type Conflict, type ResolutionConfig } from "@/lib/conflictResolver";
import type { MatchResult, MatchStats } from "@/lib/matchingEngine";
import type { ColumnConfig, ColumnOrderingMode } from "./ColumnSelectionStep";

interface UploadedFile {
  id: string;
  name: string;
  type: "original" | "enriched";
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
  matchFields?: string[];
}

interface OutputStepProps {
  originalFile: UploadedFile;
  enrichedFiles: UploadedFile[];
  matchResults: Map<string, MatchResult[]>;
  matchStats: Map<string, MatchStats>;
  resolutionConfig: ResolutionConfig;
  allConflicts: Conflict[];
  selectedColumns: string[];
  orderingMode: ColumnOrderingMode;
  columnConfigs: ColumnConfig[];
  onBack: () => void;
  onStartNew: () => void;
}

export default function OutputStep({
  originalFile,
  enrichedFiles,
  matchResults,
  matchStats,
  resolutionConfig,
  allConflicts,
  selectedColumns,
  orderingMode,
  columnConfigs,
  onBack,
  onStartNew,
}: OutputStepProps) {
  const [mergedData, setMergedData] = useState<Record<string, any>[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [outputStats, setOutputStats] = useState({
    totalRows: 0,
    totalColumns: 0,
    columnsAdded: 0,
    conflictsResolved: 0,
  });

  // Perform merge on mount
  useEffect(() => {
    performMerge();
  }, []);

  const performMerge = () => {
    setIsProcessing(true);

    // Start with original data
    let result = JSON.parse(JSON.stringify(originalFile.data));

    // Merge each enriched file
    enrichedFiles.forEach((file) => {
      const matches = matchResults.get(file.id) || [];
      const fileConflicts = allConflicts.filter((c) => c.enrichedFileId === file.id);

      result = resolveConflicts(
        result,
        file.data,
        matches,
        fileConflicts,
        resolutionConfig,
        file.id
      );
    });

    // Filter columns based on selection
    const filteredResult = result.map((row) => {
      const filteredRow: Record<string, any> = {};
      selectedColumns.forEach((col) => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });

    // Reorder columns based on ordering mode
    const orderedResult = reorderColumns(filteredResult, selectedColumns, orderingMode);

    setMergedData(orderedResult);

    // Calculate stats
    const stats = {
      totalRows: orderedResult.length,
      totalColumns: selectedColumns.length,
      columnsAdded: selectedColumns.length - originalFile.columns.length,
      conflictsResolved: allConflicts.length,
    };
    setOutputStats(stats);

    setIsProcessing(false);
  };

  const reorderColumns = (
    data: Record<string, any>[],
    columns: string[],
    mode: ColumnOrderingMode
  ): Record<string, any>[] => {
    if (mode === "append") {
      // Already in correct order (original columns first, then enriched)
      return data;
    }

    if (mode === "insert_related") {
      // Group related columns together
      const orderedColumns: string[] = [];
      const originalCols = originalFile.columns;
      const enrichedCols = columns.filter((c) => !originalCols.includes(c));

      originalCols.forEach((col) => {
        orderedColumns.push(col);

        // Find related enriched columns
        const related = enrichedCols.filter((ec) => {
          const baseName = col.toLowerCase();
          const enrichedName = ec.toLowerCase();
          return (
            enrichedName.includes(baseName) ||
            enrichedName.startsWith(baseName) ||
            ec.startsWith(`${col}_`)
          );
        });

        orderedColumns.push(...related);
      });

      // Add remaining enriched columns
      const remaining = enrichedCols.filter((c) => !orderedColumns.includes(c));
      orderedColumns.push(...remaining);

      // Reorder data
      return data.map((row) => {
        const orderedRow: Record<string, any> = {};
        orderedColumns.forEach((col) => {
          orderedRow[col] = row[col];
        });
        return orderedRow;
      });
    }

    return data;
  };

  const handleDownload = () => {
    const csv = Papa.unparse(mergedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `merged_output_${new Date().getTime()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const totalMatchRate =
    Array.from(matchStats.values()).reduce((sum, stats) => sum + stats.matchRate, 0) /
    matchStats.size;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Success Card */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <CardTitle className="text-green-900">Merge Complete!</CardTitle>
              <CardDescription className="text-green-700">
                Successfully merged {enrichedFiles.length} enriched file
                {enrichedFiles.length !== 1 ? "s" : ""} with your original CRM export
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Merge Summary</CardTitle>
          <CardDescription>Statistics for the merged output file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Rows</p>
              <p className="text-3xl font-bold text-blue-600">
                {outputStats.totalRows.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Columns</p>
              <p className="text-3xl font-bold text-purple-600">{outputStats.totalColumns}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Columns Added</p>
              <p className="text-3xl font-bold text-green-600">+{outputStats.columnsAdded}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Match Rate</p>
              <p className="text-3xl font-bold text-orange-600">{totalMatchRate.toFixed(0)}%</p>
            </div>
          </div>

          {outputStats.conflictsResolved > 0 && (
            <Alert className="mt-4">
              <AlertDescription>
                ✓ Resolved {outputStats.conflictsResolved} conflict
                {outputStats.conflictsResolved !== 1 ? "s" : ""} using{" "}
                <strong>{resolutionConfig.defaultStrategy.replace("_", " ")}</strong> strategy
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Details */}
      <Card>
        <CardHeader>
          <CardTitle>Output File Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Filename:</p>
            <p className="text-sm text-muted-foreground font-mono">
              merged_output_{new Date().getTime()}.csv
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">File Size:</p>
            <p className="text-sm text-muted-foreground">
              ~{Math.round((JSON.stringify(mergedData).length / 1024) * 1.2)} KB
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Column Order:</p>
            <Badge variant="secondary">
              {orderingMode === "append" && "Enriched columns appended at end"}
              {orderingMode === "insert_related" && "Enriched columns inserted next to related"}
              {orderingMode === "custom" && "Custom column order"}
            </Badge>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Columns ({outputStats.totalColumns}):</p>
            <div className="flex flex-wrap gap-2">
              {selectedColumns.slice(0, 20).map((col) => (
                <Badge key={col} variant="outline">
                  {col}
                </Badge>
              ))}
              {selectedColumns.length > 20 && (
                <Badge variant="secondary">+{selectedColumns.length - 20} more</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <CardDescription>First 5 rows of merged output</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded">
              <thead className="bg-muted">
                <tr>
                  {selectedColumns.slice(0, 8).map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium">
                      {col}
                    </th>
                  ))}
                  {selectedColumns.length > 8 && (
                    <th className="px-3 py-2 text-left font-medium">...</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {mergedData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t">
                    {selectedColumns.slice(0, 8).map((col) => (
                      <td key={col} className="px-3 py-2">
                        {String(row[col] || "").substring(0, 30)}
                      </td>
                    ))}
                    {selectedColumns.length > 8 && <td className="px-3 py-2">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={handleDownload} className="w-full">
          <Download className="w-5 h-5 mr-2" />
          Download Merged CSV
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onStartNew} className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Start New Merge
          </Button>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
