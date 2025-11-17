/**
 * Consolidation Preview Step
 * Shows duplicate statistics and allows strategy selection before consolidation
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, AlertTriangle, CheckCircle2, ArrowRight, Settings } from 'lucide-react';
import type { UploadedFile } from '@/types/crmSync';

export type DeduplicationStrategy = 'newest' | 'oldest' | 'most_complete' | 'longest' | 'merge';

export interface ConsolidationStats {
  totalFiles: number;
  totalRows: number;
  uniqueIdentifiers: number;
  duplicatesFound: number;
  duplicatePercentage: number;
  columnCount: number;
}

export interface ConsolidationPreviewStepProps {
  enrichedFiles: UploadedFile[];
  identifierColumn: string;
  onContinue: (strategy: DeduplicationStrategy, columnStrategies?: Map<string, DeduplicationStrategy>) => void;
  onBack: () => void;
}

export default function ConsolidationPreviewStep({
  enrichedFiles,
  identifierColumn,
  onContinue,
  onBack
}: ConsolidationPreviewStepProps) {
  const [defaultStrategy, setDefaultStrategy] = useState<DeduplicationStrategy>('most_complete');
  const [columnStrategies, setColumnStrategies] = useState<Map<string, DeduplicationStrategy>>(new Map());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate consolidation statistics
  const stats = useMemo<ConsolidationStats>(() => {
    const totalRows = enrichedFiles.reduce((sum, file) => sum + file.rowCount, 0);
    const allColumns = new Set<string>();
    const identifierCounts = new Map<string, number>();

    // Collect all columns and count identifiers
    for (const file of enrichedFiles) {
      file.columns.forEach(col => allColumns.add(col));
      
      // Count unique identifiers in this file
      if (file.data) {
        for (const row of file.data) {
          const identifier = String(row[identifierColumn] || '').toLowerCase().trim();
          if (identifier) {
            identifierCounts.set(identifier, (identifierCounts.get(identifier) || 0) + 1);
          }
        }
      }
    }

    const uniqueIdentifiers = identifierCounts.size;
    const duplicatesFound = totalRows - uniqueIdentifiers;
    const duplicatePercentage = totalRows > 0 ? (duplicatesFound / totalRows) * 100 : 0;

    return {
      totalFiles: enrichedFiles.length,
      totalRows,
      uniqueIdentifiers,
      duplicatesFound,
      duplicatePercentage,
      columnCount: allColumns.size
    };
  }, [enrichedFiles, identifierColumn]);

  // Get all unique columns across files
  const allColumns = useMemo(() => {
    const columns = new Set<string>();
    enrichedFiles.forEach(file => {
      file.columns.forEach(col => columns.add(col));
    });
    return Array.from(columns).filter(col => col !== identifierColumn);
  }, [enrichedFiles, identifierColumn]);

  const handleContinue = () => {
    onContinue(defaultStrategy, columnStrategies);
  };

  const handleColumnStrategyChange = (column: string, strategy: DeduplicationStrategy) => {
    const newStrategies = new Map(columnStrategies);
    newStrategies.set(column, strategy);
    setColumnStrategies(newStrategies);
  };

  const strategyDescriptions: Record<DeduplicationStrategy, string> = {
    newest: 'Use the most recently added value (last file wins)',
    oldest: 'Use the first value encountered (first file wins)',
    most_complete: 'Use the value with the most complete data',
    longest: 'Use the longest string value',
    merge: 'Combine all unique values (comma-separated)'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Consolidation Preview</h2>
        <p className="text-muted-foreground mt-1">
          Review duplicate statistics and choose how to handle conflicts
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Input Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {stats.totalFiles} file{stats.totalFiles !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Identifiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.uniqueIdentifiers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              After deduplication
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duplicates Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.duplicatesFound.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.duplicatePercentage.toFixed(1)}% of total rows
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Warning */}
      {stats.duplicatesFound > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Found <strong>{stats.duplicatesFound.toLocaleString()} duplicate identifiers</strong> across your enriched files.
            Choose a deduplication strategy to resolve conflicts.
          </AlertDescription>
        </Alert>
      )}

      {/* Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Deduplication Strategy
          </CardTitle>
          <CardDescription>
            Choose how to handle duplicate data when the same identifier appears in multiple files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Default Strategy (All Columns)</label>
            <Select value={defaultStrategy} onValueChange={(v) => setDefaultStrategy(v as DeduplicationStrategy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_complete">Most Complete</SelectItem>
                <SelectItem value="newest">Newest (Last File)</SelectItem>
                <SelectItem value="oldest">Oldest (First File)</SelectItem>
                <SelectItem value="longest">Longest Value</SelectItem>
                <SelectItem value="merge">Merge All</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {strategyDescriptions[defaultStrategy]}
            </p>
          </div>

          {/* Advanced: Per-Column Strategies */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </div>

          {showAdvanced && (
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Per-Column Strategies</p>
              <p className="text-xs text-muted-foreground">
                Override the default strategy for specific columns
              </p>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {allColumns.slice(0, 10).map(column => (
                  <div key={column} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{column}</span>
                    <Select
                      value={columnStrategies.get(column) || defaultStrategy}
                      onValueChange={(v) => handleColumnStrategyChange(column, v as DeduplicationStrategy)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="most_complete">Most Complete</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="longest">Longest</SelectItem>
                        <SelectItem value="merge">Merge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              {allColumns.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  Showing first 10 columns. All others will use the default strategy.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>What happens next:</strong> We'll consolidate your {stats.totalFiles} enriched files into a single master file
          with {stats.uniqueIdentifiers.toLocaleString()} unique rows, then match it with your original CRM file.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          Continue to Consolidation
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
