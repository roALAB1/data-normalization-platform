import type { UploadedFile } from "@/types/crmSync";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ResolutionConfig } from "@/lib/conflictResolver";


export type ColumnOrderingMode = "append" | "insert_related" | "custom";

export interface ColumnConfig {
  name: string;
  source: "original" | "enriched";
  enrichedFileId?: string;
  selected: boolean;
  position: number;
}

interface ColumnSelectionStepProps {
  originalFile: UploadedFile;
  enrichedFiles: UploadedFile[];
  resolutionConfig: ResolutionConfig;
  onBack: () => void;
  onContinue: (data: {
    selectedColumns: string[];
    orderingMode: ColumnOrderingMode;
    columnConfigs: ColumnConfig[];
  }) => void;
}

export default function ColumnSelectionStep({
  originalFile,
  enrichedFiles,
  resolutionConfig,
  onBack,
  onContinue,
}: ColumnSelectionStepProps) {
  const [orderingMode, setOrderingMode] = useState<ColumnOrderingMode>("append");
  const [selectedEnrichedColumns, setSelectedEnrichedColumns] = useState<Set<string>>(new Set());
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);

  // Initialize column configs
  useEffect(() => {
    const configs: ColumnConfig[] = [];
    let position = 0;

    // Add original columns (always included)
    originalFile.columns.forEach((col) => {
      configs.push({
        name: col,
        source: "original",
        selected: true,
        position: position++,
      });
    });

    // Add enriched columns (selectable)
    const enrichedColumnsSet = new Set<string>();
    enrichedFiles.forEach((file) => {
      file.columns.forEach((col) => {
        if (!originalFile.columns.includes(col) && !enrichedColumnsSet.has(col)) {
          enrichedColumnsSet.add(col);
          configs.push({
            name: col,
            source: "enriched",
            enrichedFileId: file.id,
            selected: true, // Default: select all
            position: position++,
          });
        }
      });
    });

    // Add alternate columns from conflict resolution
    if (resolutionConfig.defaultStrategy === "create_alternate") {
      const alternateColumns = new Set<string>();
      Object.keys(resolutionConfig.columnStrategies).forEach((col) => {
        if (resolutionConfig.columnStrategies[col] === "create_alternate") {
          const altCol = `${col}${resolutionConfig.alternateFieldSuffix}`;
          if (!alternateColumns.has(altCol)) {
            alternateColumns.add(altCol);
            configs.push({
              name: altCol,
              source: "enriched",
              selected: true,
              position: position++,
            });
          }
        }
      });
    }

    setColumnConfigs(configs);

    // Select all enriched columns by default
    const enrichedCols = configs.filter((c) => c.source === "enriched").map((c) => c.name);
    setSelectedEnrichedColumns(new Set(enrichedCols));
  }, [originalFile, enrichedFiles, resolutionConfig]);

  const toggleColumn = (columnName: string) => {
    setSelectedEnrichedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    // Update column configs with selection state
    const updatedConfigs = columnConfigs.map((config) => ({
      ...config,
      selected: config.source === "original" || selectedEnrichedColumns.has(config.name),
    }));

    const selectedColumns = updatedConfigs.filter((c) => c.selected).map((c) => c.name);

    onContinue({
      selectedColumns,
      orderingMode,
      columnConfigs: updatedConfigs,
    });
  };

  const originalColumns = columnConfigs.filter((c) => c.source === "original");
  const enrichedColumns = columnConfigs.filter((c) => c.source === "enriched");
  const selectedCount = originalColumns.length + selectedEnrichedColumns.size;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Column Ordering Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Column Ordering</CardTitle>
          <CardDescription>
            Choose how enriched columns should be positioned in the output file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={orderingMode} onValueChange={(v) => setOrderingMode(v as ColumnOrderingMode)}>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="append" id="append" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="append" className="font-medium cursor-pointer">
                    Append at End
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add all enriched columns after original columns (recommended for most CRMs)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="insert_related" id="insert_related" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="insert_related" className="font-medium cursor-pointer">
                    Insert Next to Related
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Place enriched columns next to related original columns (e.g., Email_Verified
                    next to Email)
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Column Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Column Selection</CardTitle>
          <CardDescription>
            Select which enriched columns to include in the final output ({selectedCount} total
            columns)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Original Columns */}
          <div>
            <h4 className="font-medium mb-3">
              Original Columns{" "}
              <Badge variant="secondary" className="ml-2">
                Always Included
              </Badge>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {originalColumns.map((col) => (
                <div key={col.name} className="flex items-center gap-2 p-2 border rounded">
                  <Checkbox checked disabled />
                  <span className="text-sm">{col.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Enriched Columns */}
          <div>
            <h4 className="font-medium mb-3">
              Enriched Columns{" "}
              <Badge variant="outline" className="ml-2">
                Select to Add
              </Badge>
            </h4>
            <div className="space-y-2">
              {enrichedColumns.map((col) => (
                <label
                  key={col.name}
                  className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Checkbox
                    checked={selectedEnrichedColumns.has(col.name)}
                    onCheckedChange={() => toggleColumn(col.name)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{col.name}</span>
                    {col.enrichedFileId && (
                      <span className="text-xs text-muted-foreground ml-2">
                        from {enrichedFiles.find((f) => f.id === col.enrichedFileId)?.name}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Conflicts
        </Button>
        <Button size="lg" onClick={handleContinue}>
          Generate Output
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
