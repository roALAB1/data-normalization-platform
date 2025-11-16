import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { parseArrayValue, type ArrayHandlingStrategy } from "@/lib/arrayParser";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArrayColumn {
  name: string;
  fileId: string;
  fileName: string;
  avgValueCount: number;
  hasDuplicates: boolean;
  sampleValue: string;
}

interface ArrayStrategySelectorProps {
  enrichedFiles: Array<{
    id: string;
    name: string;
    columns: string[];
    data: Record<string, any>[];
  }>;
  arrayStrategies: Map<string, ArrayHandlingStrategy>;
  onStrategyChange: (column: string, strategy: ArrayHandlingStrategy) => void;
}

export default function ArrayStrategySelector({
  enrichedFiles,
  arrayStrategies,
  onStrategyChange,
}: ArrayStrategySelectorProps) {
  const [arrayColumns, setArrayColumns] = useState<ArrayColumn[]>([]);

  // Detect array columns on mount
  useEffect(() => {
    const detected: ArrayColumn[] = [];

    enrichedFiles.forEach((file) => {
      // Sample first 10 rows to detect arrays
      const sampleSize = Math.min(10, file.data.length);
      const sampleRows = file.data.slice(0, sampleSize);

      file.columns.forEach((column) => {
        let totalValues = 0;
        let rowsWithArrays = 0;
        let hasDuplicates = false;
        let sampleValue = "";

        sampleRows.forEach((row) => {
          const value = row[column];
          if (value) {
            const parseResult = parseArrayValue(value);
            if (parseResult.values.length > 1) {
              rowsWithArrays++;
              totalValues += parseResult.values.length;
              if (parseResult.hasDuplicates) {
                hasDuplicates = true;
              }
              if (!sampleValue) {
                sampleValue = String(value);
              }
            }
          }
        });

        // If >50% of sampled rows have arrays, consider it an array column
        if (rowsWithArrays / sampleSize > 0.5) {
          const avgValueCount = Math.round(totalValues / rowsWithArrays);
          detected.push({
            name: column,
            fileId: file.id,
            fileName: file.name,
            avgValueCount,
            hasDuplicates,
            sampleValue: sampleValue.length > 100 ? sampleValue.slice(0, 100) + "..." : sampleValue,
          });

          // Set default strategy if not already set
          if (!arrayStrategies.has(column)) {
            onStrategyChange(column, "first");
          }
        }
      });
    });

    setArrayColumns(detected);
  }, [enrichedFiles]);

  if (arrayColumns.length === 0) {
    return null; // No array columns detected
  }

  const strategyDescriptions: Record<ArrayHandlingStrategy, string> = {
    first: "Use only the first value from the array (fastest, simplest)",
    all: "Keep all values comma-separated (preserves complete data)",
    best: "Select highest quality value (verified > unverified, mobile > landline)",
    deduplicated: "Remove duplicates and join with commas (clean comprehensive list)",
  };

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-600" />
          <CardTitle>Array Handling Detected</CardTitle>
        </div>
        <CardDescription>
          {arrayColumns.length} column{arrayColumns.length > 1 ? "s" : ""} contain multiple values per row. Choose how to handle these arrays in the output.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {arrayColumns.map((col) => (
          <div key={`${col.fileId}-${col.name}`} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{col.name}</span>
                <Badge variant="secondary" className="text-xs">
                  ~{col.avgValueCount} values/row
                </Badge>
                {col.hasDuplicates && (
                  <Badge variant="outline" className="text-xs text-amber-600">
                    Has duplicates
                  </Badge>
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      <strong>Sample:</strong> {col.sampleValue}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Strategy:</span>
              <Select
                value={arrayStrategies.get(col.name) || "first"}
                onValueChange={(value) =>
                  onStrategyChange(col.name, value as ArrayHandlingStrategy)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First Value</SelectItem>
                  <SelectItem value="all">All Values</SelectItem>
                  <SelectItem value="best">Best Match</SelectItem>
                  <SelectItem value="deduplicated">Deduplicated</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground flex-1">
                {strategyDescriptions[arrayStrategies.get(col.name) || "first"]}
              </span>
            </div>
          </div>
        ))}

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Array handling applies to the final output CSV. The matching engine already tries all values in arrays when finding matches, so this setting only affects how values appear in your output file.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
