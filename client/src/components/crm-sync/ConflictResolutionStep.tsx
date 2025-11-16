import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  detectConflicts,
  calculateConflictSummary,
  getConflictColumns,
  type Conflict,
  type ResolutionStrategy,
  type ResolutionConfig,
  type ConflictSummary,
} from "@/lib/conflictResolver";
import type { MatchResult } from "@/lib/matchingEngine";

interface UploadedFile {
  id: string;
  name: string;
  type: "original" | "enriched";
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
  matchFields?: string[];
}

interface ConflictResolutionStepProps {
  originalFile: UploadedFile;
  enrichedFiles: UploadedFile[];
  matchResults: Map<string, MatchResult[]>;
  onBack: () => void;
  onContinue: (config: ResolutionConfig, allConflicts: Conflict[]) => void;
}

export default function ConflictResolutionStep({
  originalFile,
  enrichedFiles,
  matchResults,
  onBack,
  onContinue,
}: ConflictResolutionStepProps) {
  const [defaultStrategy, setDefaultStrategy] = useState<ResolutionStrategy>("create_alternate");
  const [columnStrategies, setColumnStrategies] = useState<Record<string, ResolutionStrategy>>({});
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([]);
  const [conflictSummary, setConflictSummary] = useState<ConflictSummary | null>(null);
  const [conflictColumns, setConflictColumns] = useState<string[]>([]);

  // Detect conflicts on mount
  useEffect(() => {
    const conflicts: Conflict[] = [];

    enrichedFiles.forEach((file) => {
      const matches = matchResults.get(file.id) || [];
      const fileConflicts = detectConflicts(
        originalFile.data,
        file.data,
        matches,
        file.id,
        file.name
      );
      conflicts.push(...fileConflicts);
    });

    setAllConflicts(conflicts);
    setConflictSummary(calculateConflictSummary(conflicts));
    setConflictColumns(getConflictColumns(conflicts));
  }, [originalFile, enrichedFiles, matchResults]);

  const handleColumnStrategyChange = (column: string, strategy: ResolutionStrategy) => {
    setColumnStrategies((prev) => ({
      ...prev,
      [column]: strategy,
    }));
  };

  const handleContinue = () => {
    const config: ResolutionConfig = {
      defaultStrategy,
      columnStrategies,
      alternateFieldSuffix: "_Alt",
    };
    onContinue(config, allConflicts);
  };

  const getStrategyLabel = (strategy: ResolutionStrategy): string => {
    switch (strategy) {
      case "keep_original":
        return "Keep Original";
      case "use_enriched":
        return "Replace with Enriched";
      case "create_alternate":
        return "Create Alternate Field";
    }
  };

  const getStrategyDescription = (strategy: ResolutionStrategy): string => {
    switch (strategy) {
      case "keep_original":
        return "Ignore enriched values, keep original data unchanged";
      case "use_enriched":
        return "Overwrite original values with enriched data";
      case "create_alternate":
        return "Add enriched values as new columns (e.g., Email_Alt)";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Conflict Summary */}
      {conflictSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Conflict Detection</CardTitle>
            <CardDescription>
              Found {conflictSummary.totalConflicts} conflicts where enriched values differ from
              original data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {conflictSummary.totalConflicts === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  No conflicts detected! All enriched data can be merged without issues.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Conflicts by Column */}
                <div>
                  <p className="text-sm font-medium mb-2">Conflicts by Column:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(conflictSummary.conflictsByColumn)
                      .sort(([, a], [, b]) => b - a)
                      .map(([column, count]) => (
                        <Badge key={column} variant="outline">
                          {column}: {count}
                        </Badge>
                      ))}
                  </div>
                </div>

                {/* Conflicts by File */}
                <div>
                  <p className="text-sm font-medium mb-2">Conflicts by File:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(conflictSummary.conflictsByFile).map(([file, count]) => (
                      <Badge key={file} variant="secondary">
                        {file}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resolution Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Strategy</CardTitle>
          <CardDescription>
            Choose how to handle conflicts when enriched values differ from original data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Strategy */}
          <div>
            <Label className="text-base font-medium mb-3 block">Default Strategy</Label>
            <RadioGroup value={defaultStrategy} onValueChange={(v) => setDefaultStrategy(v as ResolutionStrategy)}>
              <div className="space-y-3">
                {(["keep_original", "use_enriched", "create_alternate"] as ResolutionStrategy[]).map((strategy) => (
                  <div key={strategy} className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={strategy} id={strategy} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={strategy} className="font-medium cursor-pointer">
                        {getStrategyLabel(strategy)}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getStrategyDescription(strategy)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Per-Column Overrides */}
          {conflictColumns.length > 0 && (
            <div>
              <Label className="text-base font-medium mb-3 block">
                Column-Specific Overrides{" "}
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Override the default strategy for specific columns
              </p>
              <div className="space-y-3">
                {conflictColumns.map((column) => {
                  const conflictCount = conflictSummary?.conflictsByColumn[column] || 0;
                  const strategy = columnStrategies[column] || defaultStrategy;

                  return (
                    <div key={column} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{column}</p>
                        <p className="text-xs text-muted-foreground">
                          {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Select
                        value={strategy}
                        onValueChange={(v) => handleColumnStrategyChange(column, v as ResolutionStrategy)}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep_original">Keep Original</SelectItem>
                          <SelectItem value="use_enriched">Replace</SelectItem>
                          <SelectItem value="create_alternate">Create Alternate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strategy Preview */}
          {defaultStrategy === "create_alternate" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommended:</strong> Creating alternate fields preserves all data. For
                example, if the original has <code>Email: john@old.com</code> and enriched has{" "}
                <code>Email: john@new.com</code>, the output will have both{" "}
                <code>Email: john@old.com</code> and <code>Email_Alt: john@new.com</code>.
              </AlertDescription>
            </Alert>
          )}

          {defaultStrategy === "use_enriched" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Replacing original values will permanently overwrite your
                CRM data. Make sure enriched data is more accurate before proceeding.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Matching
        </Button>
        <Button size="lg" onClick={handleContinue}>
          Continue to Columns
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
