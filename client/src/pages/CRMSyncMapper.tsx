import { useState, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Home, Upload, X, Plus, FileText, AlertCircle, CheckCircle2, ArrowRight, Activity, Info, HelpCircle } from "lucide-react";
import Papa from "papaparse";
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
import MatchingStep from "@/components/crm-sync/MatchingStep";
import ConflictResolutionStep from "@/components/crm-sync/ConflictResolutionStep";
import ColumnSelectionStep from "@/components/crm-sync/ColumnSelectionStep";
import OutputStep from "@/components/crm-sync/OutputStep";
import type { Conflict, ResolutionConfig } from "@/lib/conflictResolver";
import type { ColumnConfig, ColumnOrderingMode } from "@/components/crm-sync/ColumnSelectionStep";

interface UploadedFile {
  id: string;
  name: string;
  type: "original" | "enriched";
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
  matchFields?: string[];
  uploadedAt: Date;
}

type WorkflowStep = "upload" | "matching" | "conflicts" | "columns" | "output";

export default function CRMSyncMapper() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload");
  const [originalFile, setOriginalFile] = useState<UploadedFile | null>(null);
  const [enrichedFiles, setEnrichedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  // Matching state
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>("");
  const [matchResults, setMatchResults] = useState<Map<string, MatchResult[]>>(new Map());
  const [matchStats, setMatchStats] = useState<Map<string, MatchStats>>(new Map());
  const [unmatchedRows, setUnmatchedRows] = useState<Map<string, UnmatchedRow[]>>(new Map());

  // Conflict resolution state
  const [resolutionConfig, setResolutionConfig] = useState<ResolutionConfig | null>(null);
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([]);

  // Column selection state
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [orderingMode, setOrderingMode] = useState<ColumnOrderingMode>("append");
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [showGuide, setShowGuide] = useState(true);

  // File upload handler
  const handleFileUpload = useCallback(
    (file: File, type: "original" | "enriched") => {
      setIsUploading(true);
      setUploadError("");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setUploadError(`Error parsing ${file.name}: ${results.errors[0].message}`);
            setIsUploading(false);
            return;
          }

          const uploadedFile: UploadedFile = {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name,
            type,
            rowCount: results.data.length,
            columns: results.meta.fields || [],
            data: results.data as Record<string, any>[],
            uploadedAt: new Date(),
          };

          if (type === "original") {
            setOriginalFile(uploadedFile);
          } else {
            setEnrichedFiles((prev) => [...prev, uploadedFile]);
          }

          setIsUploading(false);
        },
        error: (error) => {
          setUploadError(`Error reading ${file.name}: ${error.message}`);
          setIsUploading(false);
        },
      });
    },
    []
  );

  // Remove enriched file
  const removeEnrichedFile = useCallback((fileId: string) => {
    setEnrichedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Update match fields for enriched file
  const updateMatchFields = useCallback((fileId: string, fields: string[]) => {
    setEnrichedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, matchFields: fields } : f))
    );
  }, []);

  // Toggle match field
  const toggleMatchField = useCallback(
    (fileId: string, field: string, checked: boolean) => {
      setEnrichedFiles((prev) =>
        prev.map((f) => {
          if (f.id !== fileId) return f;
          const currentFields = f.matchFields || [];
          const newFields = checked
            ? [...currentFields, field]
            : currentFields.filter((mf) => mf !== field);
          return { ...f, matchFields: newFields };
        })
      );
    },
    []
  );

  // Check if can proceed to next step
  const canProceed = originalFile && enrichedFiles.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CRM Sync Mapper
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/batch-jobs">
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Batch Jobs
              </Button>
            </Link>
            <Link href="/monitoring">
              <Button variant="outline" size="sm">
                <Activity className="w-4 h-4 mr-2" />
                Monitoring
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { id: "upload", label: "Upload Files" },
            { id: "matching", label: "Configure Matching" },
            { id: "conflicts", label: "Resolve Conflicts" },
            { id: "columns", label: "Select Columns" },
            { id: "output", label: "Download Output" },
          ].map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentStep === step.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-muted-foreground"
                }`}
              >
                <span className="font-medium">{index + 1}</span>
                <span className="text-sm">{step.label}</span>
              </div>
              {index < 4 && (
                <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* How It Works Guide */}
        {showGuide && (
          <div className="max-w-5xl mx-auto mb-8">
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">How CRM Sync Mapper Works</CardTitle>
                      <CardDescription className="mt-1">
                        Follow these 5 simple steps to merge enriched data back into your CRM
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGuide(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4">
                  {/* Step 1 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <h4 className="font-semibold text-sm">Upload Files</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upload your original CRM export and one or more enriched data files (e.g., from AudienceLab)
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <h4 className="font-semibold text-sm">Configure Matching</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Choose identifier column (Email/Phone), map columns if names differ, preview matches, and test identifiers
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <h4 className="font-semibold text-sm">Resolve Conflicts</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      When enriched data differs from original, choose which value to keep (original, enriched, or merge)
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        4
                      </div>
                      <h4 className="font-semibold text-sm">Select Columns</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Choose which columns to include in final output and how to order them (original, enriched, or custom)
                    </p>
                  </div>

                  {/* Step 5 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        5
                      </div>
                      <h4 className="font-semibold text-sm">Download Output</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Download your merged CSV file with enriched data matched back to original CRM row order
                    </p>
                  </div>
                </div>

                {/* Key Features */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong className="text-foreground">Pro Tips:</strong> Use Smart Auto-Map to automatically suggest column mappings • 
                      Preview matches before proceeding • Test all identifiers to find the best match rate • 
                      Files can be in any order - matching is done by identifier value, not row position
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!showGuide && (
          <div className="max-w-5xl mx-auto mb-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="gap-2"
            >
              <Info className="w-4 h-4" />
              Show Guide
            </Button>
          </div>
        )}

        {/* Step 1: Upload Files */}
        {currentStep === "upload" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Original CRM Export */}
            <Card>
              <CardHeader>
                <CardTitle>Original CRM Export</CardTitle>
                <CardDescription>
                  Upload your original CRM export file (source of truth for row order and structure)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!originalFile ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("original-file-input")?.click()}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Drop your CSV file here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This is your original CRM export with all contacts
                    </p>
                    <input
                      id="original-file-input"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "original");
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 border rounded-lg bg-green-50">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">{originalFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {originalFile.rowCount.toLocaleString()} rows •{" "}
                            {originalFile.columns.length} columns
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOriginalFile(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Column Preview */}
                    <div>
                      <p className="text-sm font-medium mb-2">Columns:</p>
                      <div className="flex flex-wrap gap-2">
                        {originalFile.columns.map((col) => (
                          <Badge key={col} variant="secondary">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Sample Data */}
                    <div>
                      <p className="text-sm font-medium mb-2">Sample Data (First 3 rows):</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border rounded">
                          <thead className="bg-muted">
                            <tr>
                              {originalFile.columns.slice(0, 6).map((col) => (
                                <th key={col} className="px-3 py-2 text-left font-medium">
                                  {col}
                                </th>
                              ))}
                              {originalFile.columns.length > 6 && (
                                <th className="px-3 py-2 text-left font-medium">...</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {originalFile.data.slice(0, 3).map((row, i) => (
                              <tr key={i} className="border-t">
                                {originalFile.columns.slice(0, 6).map((col) => (
                                  <td key={col} className="px-3 py-2">
                                    {String(row[col] || "").substring(0, 30)}
                                  </td>
                                ))}
                                {originalFile.columns.length > 6 && (
                                  <td className="px-3 py-2">...</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enriched Files */}
            <Card>
              <CardHeader>
                <CardTitle>Enriched Files</CardTitle>
                <CardDescription>
                  Upload one or more enriched files from your enrichment platform. Each file may
                  have been enriched using different match strategies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrichedFiles.map((file, index) => (
                    <EnrichedFileCard
                      key={file.id}
                      file={file}
                      index={index}
                      onRemove={() => removeEnrichedFile(file.id)}
                      onToggleMatchField={(field, checked) =>
                        toggleMatchField(file.id, field, checked)
                      }
                    />
                  ))}

                  {/* Add File Button */}
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("enriched-file-input")?.click()}
                  >
                    <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">Add Enriched File</p>
                    <p className="text-sm text-muted-foreground">
                      Upload another enriched CSV file
                    </p>
                    <input
                      id="enriched-file-input"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, "enriched");
                          e.target.value = ""; // Reset input
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Alert */}
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {/* Continue Button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={!canProceed || isUploading}
                onClick={() => setCurrentStep("matching")}
              >
                Continue to Matching
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Matching */}
        {currentStep === "matching" && originalFile && enrichedFiles.length > 0 && (
          <MatchingStep
            originalFile={originalFile}
            enrichedFiles={enrichedFiles}
            onBack={() => setCurrentStep("upload")}
            onContinue={(data) => {
              setSelectedIdentifier(data.identifier);
              setMatchResults(data.matchResults);
              setMatchStats(data.matchStats);
              setUnmatchedRows(data.unmatchedRows);
              setCurrentStep("conflicts");
            }}
          />
        )}

        {/* Step 3: Conflict Resolution */}
        {currentStep === "conflicts" && originalFile && enrichedFiles.length > 0 && (
          <ConflictResolutionStep
            originalFile={originalFile}
            enrichedFiles={enrichedFiles}
            matchResults={matchResults}
            onBack={() => setCurrentStep("matching")}
            onContinue={(config, conflicts) => {
              setResolutionConfig(config);
              setAllConflicts(conflicts);
              setCurrentStep("columns");
            }}
          />
        )}

        {/* Step 4: Column Selection */}
        {currentStep === "columns" && originalFile && enrichedFiles.length > 0 && resolutionConfig && (
          <ColumnSelectionStep
            originalFile={originalFile}
            enrichedFiles={enrichedFiles}
            resolutionConfig={resolutionConfig}
            onBack={() => setCurrentStep("conflicts")}
            onContinue={(data) => {
              setSelectedColumns(data.selectedColumns);
              setOrderingMode(data.orderingMode);
              setColumnConfigs(data.columnConfigs);
              setCurrentStep("output");
            }}
          />
        )}

        {/* Step 5: Output */}
        {currentStep === "output" && originalFile && enrichedFiles.length > 0 && resolutionConfig && (
          <OutputStep
            originalFile={originalFile}
            enrichedFiles={enrichedFiles}
            matchResults={matchResults}
            matchStats={matchStats}
            resolutionConfig={resolutionConfig}
            allConflicts={allConflicts}
            selectedColumns={selectedColumns}
            orderingMode={orderingMode}
            columnConfigs={columnConfigs}
            onBack={() => setCurrentStep("columns")}
            onStartNew={() => {
              setOriginalFile(null);
              setEnrichedFiles([]);
              setCurrentStep("upload");
            }}
          />
        )}

        {/* Placeholder for other steps */}
        {currentStep !== "upload" &&
          currentStep !== "matching" &&
          currentStep !== "conflicts" &&
          currentStep !== "columns" &&
          currentStep !== "output" && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Step {currentStep} - Coming Soon</h3>
              <p className="text-muted-foreground mb-6">
                This step is currently under development
              </p>
              <Button variant="outline" onClick={() => setCurrentStep("upload")}>
                Back to Upload
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>v3.31.0 • CRM Sync Mapper - Intelligent Multi-File Merge</p>
        </div>
      </footer>
    </div>
  );
}

// Enriched File Card Component
interface EnrichedFileCardProps {
  file: UploadedFile;
  index: number;
  onRemove: () => void;
  onToggleMatchField: (field: string, checked: boolean) => void;
}

function EnrichedFileCard({ file, index, onRemove, onToggleMatchField }: EnrichedFileCardProps) {
  const commonMatchFields = ["First Name", "Last Name", "Email", "Phone", "Company", "ID"];

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium">
              File {index + 1}: {file.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {file.rowCount.toLocaleString()} rows • {file.columns.length} columns
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Columns */}
      <div>
        <p className="text-sm font-medium mb-2">Columns:</p>
        <div className="flex flex-wrap gap-2">
          {file.columns.map((col) => (
            <Badge key={col} variant="outline">
              {col}
            </Badge>
          ))}
        </div>
      </div>

      {/* Match Fields (Optional) */}
      <div>
        <p className="text-sm font-medium mb-2">
          Enrichment Match Fields{" "}
          <span className="text-muted-foreground font-normal">(Optional)</span>
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Which fields were used to match this enrichment? This helps with debugging and matching
          quality.
        </p>
        <div className="flex flex-wrap gap-2">
          {commonMatchFields.map((field) => (
            <label
              key={field}
              className="flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer hover:bg-muted transition-colors"
            >
              <input
                type="checkbox"
                checked={file.matchFields?.includes(field) || false}
                onChange={(e) => onToggleMatchField(field, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">{field}</span>
            </label>
          ))}
        </div>
        {file.matchFields && file.matchFields.length > 0 && (
          <p className="text-xs text-green-600 mt-2">
            ✓ Matched using: {file.matchFields.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
