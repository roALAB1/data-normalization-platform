/**
 * BatchUploadStep - UI for parallel file uploads
 * 
 * Allows users to upload 1 original + N enriched files simultaneously
 * with individual and overall progress tracking.
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useBatchUpload, type FileWithType } from '@/hooks/useBatchUpload';
import type { UploadedFile } from '@/types/crmSync';

interface BatchUploadStepProps {
  onUploadComplete: (originalFile: UploadedFile, enrichedFiles: UploadedFile[]) => void;
}

export default function BatchUploadStep({ onUploadComplete }: BatchUploadStepProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithType[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    overallProgress,
    fileProgresses,
    errors,
    validateFiles,
    uploadBatch,
    reset,
  } = useBatchUpload();

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // First file is original, rest are enriched
    const filesWithType: FileWithType[] = files.map((file, index) => ({
      file,
      type: index === 0 ? 'original' : 'enriched',
    }));

    setSelectedFiles(filesWithType);
    setValidationErrors([]);
    setValidationWarnings([]);
  }, []);

  /**
   * Remove selected file
   */
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Toggle file type (original <-> enriched)
   */
  const toggleFileType = useCallback((index: number) => {
    setSelectedFiles(prev => prev.map((f, i) => {
      if (i !== index) return f;
      return {
        ...f,
        type: f.type === 'original' ? 'enriched' : 'original',
      };
    }));
  }, []);

  /**
   * Validate and upload files
   */
  const handleUpload = useCallback(async () => {
    // Validate files
    const validation = await validateFiles(selectedFiles);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
    }

    // Upload files
    try {
      const result = await uploadBatch(selectedFiles);
      
      if (result.originalFile) {
        onUploadComplete(result.originalFile, result.enrichedFiles);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [selectedFiles, validateFiles, uploadBatch, onUploadComplete]);

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Format upload speed
   */
  const formatSpeed = (mbps: number): string => {
    if (mbps < 1) return `${(mbps * 1024).toFixed(0)} KB/s`;
    return `${mbps.toFixed(1)} MB/s`;
  };

  const hasOriginalFile = selectedFiles.some(f => f.type === 'original');
  const hasEnrichedFiles = selectedFiles.some(f => f.type === 'enriched');
  const canUpload = hasOriginalFile && hasEnrichedFiles && !isUploading;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files for CRM Merge</CardTitle>
          <CardDescription>
            Select your original CRM file and enriched data files. All files will be uploaded in parallel for faster processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                <strong>Step 1:</strong> Select files (first file = original CRM, rest = enriched data)
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Step 2:</strong> Adjust file types if needed by clicking the badges
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Step 3:</strong> Click "Upload All Files" to start parallel upload
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Select CSV Files
              </Button>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Files ({selectedFiles.length})</p>
                {selectedFiles.map((fileWithType, index) => {
                  const fileProgress = Array.from(fileProgresses.values())[index];
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{fileWithType.file.name}</p>
                          <Badge
                            variant={fileWithType.type === 'original' ? 'default' : 'secondary'}
                            className="cursor-pointer flex-shrink-0"
                            onClick={() => !isUploading && toggleFileType(index)}
                          >
                            {fileWithType.type === 'original' ? 'Original' : 'Enriched'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileWithType.file.size)}
                        </p>

                        {/* Progress Bar */}
                        {fileProgress && fileProgress.status !== 'pending' && (
                          <div className="mt-2 space-y-1">
                            <Progress value={fileProgress.progress} className="h-2" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {fileProgress.status === 'uploading' && `${fileProgress.progress}%`}
                                {fileProgress.status === 'completed' && 'Completed'}
                                {fileProgress.status === 'error' && 'Failed'}
                              </span>
                              {fileProgress.speedMBps > 0 && (
                                <span>{formatSpeed(fileProgress.speedMBps)}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {fileProgress?.error && (
                          <p className="text-xs text-destructive mt-1">{fileProgress.error}</p>
                        )}
                      </div>

                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {fileProgress?.status === 'uploading' && (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        )}
                        {fileProgress?.status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {fileProgress?.status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                        {!fileProgress && !isUploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Overall Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!canUpload}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading {selectedFiles.length} Files...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Upload All Files ({selectedFiles.length})
                </>
              )}
            </Button>

            {!hasOriginalFile && selectedFiles.length > 0 && (
              <p className="text-sm text-destructive">Please mark one file as "Original"</p>
            )}
            {!hasEnrichedFiles && selectedFiles.length > 0 && (
              <p className="text-sm text-destructive">Please add at least one enriched file</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
