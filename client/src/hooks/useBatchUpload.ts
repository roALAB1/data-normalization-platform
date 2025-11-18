/**
 * useBatchUpload - Hook for parallel file uploads with progress tracking
 * 
 * Supports uploading 1 original + N enriched files simultaneously
 * with individual and aggregate progress tracking.
 */

import { useState, useCallback } from 'react';
import { uploadCSVToS3, loadSampleData } from '@/lib/crmFileUpload';
import { validateCSVFile } from '@/lib/csvValidator';
import type { UploadedFile } from '@/types/crmSync';

export interface FileWithType {
  file: File;
  type: 'original' | 'enriched';
}

export interface FileProgress {
  fileId: string;
  fileName: string;
  progress: number;
  speedMBps: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface BatchUploadState {
  isUploading: boolean;
  overallProgress: number;
  fileProgresses: Map<string, FileProgress>;
  uploadedFiles: UploadedFile[];
  errors: string[];
}

export interface BatchUploadResult {
  originalFile: UploadedFile | null;
  enrichedFiles: UploadedFile[];
  errors: string[];
}

export function useBatchUpload() {
  const [state, setState] = useState<BatchUploadState>({
    isUploading: false,
    overallProgress: 0,
    fileProgresses: new Map(),
    uploadedFiles: [],
    errors: [],
  });

  /**
   * Validate all files before upload
   */
  const validateFiles = useCallback(async (files: FileWithType[]): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check we have exactly 1 original file
    const originalFiles = files.filter(f => f.type === 'original');
    if (originalFiles.length === 0) {
      errors.push('Please select an original CRM file');
    } else if (originalFiles.length > 1) {
      errors.push('Only one original CRM file is allowed');
    }

    // Check we have at least 1 enriched file
    const enrichedFiles = files.filter(f => f.type === 'enriched');
    if (enrichedFiles.length === 0) {
      errors.push('Please select at least one enriched file');
    }

    // Validate each file
    for (const { file, type } of files) {
      const validation = await validateCSVFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        warnings.push(`${file.name}: ${validation.warnings.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  /**
   * Upload single file with progress tracking
   */
  const uploadSingleFile = useCallback(async (
    fileWithType: FileWithType,
    fileId: string,
    startTime: number
  ): Promise<UploadedFile> => {
    const { file, type } = fileWithType;

    // Update progress: uploading
    setState(prev => ({
      ...prev,
      fileProgresses: new Map(prev.fileProgresses).set(fileId, {
        fileId,
        fileName: file.name,
        progress: 0,
        speedMBps: 0,
        status: 'uploading',
      }),
    }));

    try {
      // Upload to S3 with progress tracking
      const fileMetadata = await uploadCSVToS3(file, type, (progress) => {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const uploadedBytes = (progress / 100) * file.size;
        const speedMBps = (uploadedBytes / (1024 * 1024)) / elapsed;

        setState(prev => ({
          ...prev,
          fileProgresses: new Map(prev.fileProgresses).set(fileId, {
            fileId,
            fileName: file.name,
            progress,
            speedMBps,
            status: 'uploading',
          }),
        }));
      });

      // Load sample data for matching (1000 rows)
      const sampleData = await loadSampleData(fileMetadata.s3Url, 1000);

      const uploadedFile: UploadedFile = {
        ...fileMetadata,
        data: sampleData,
      };

      // Update progress: completed
      setState(prev => ({
        ...prev,
        fileProgresses: new Map(prev.fileProgresses).set(fileId, {
          fileId,
          fileName: file.name,
          progress: 100,
          speedMBps: 0,
          status: 'completed',
        }),
      }));

      return uploadedFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update progress: error
      setState(prev => ({
        ...prev,
        fileProgresses: new Map(prev.fileProgresses).set(fileId, {
          fileId,
          fileName: file.name,
          progress: 0,
          speedMBps: 0,
          status: 'error',
          error: errorMessage,
        }),
        errors: [...prev.errors, `${file.name}: ${errorMessage}`],
      }));

      throw error;
    }
  }, []);

  /**
   * Upload all files in parallel
   */
  const uploadBatch = useCallback(async (
    files: FileWithType[]
  ): Promise<BatchUploadResult> => {
    // Reset state
    setState({
      isUploading: true,
      overallProgress: 0,
      fileProgresses: new Map(),
      uploadedFiles: [],
      errors: [],
    });

    // Initialize file progresses
    const initialProgresses = new Map<string, FileProgress>();
    files.forEach((fileWithType, index) => {
      const fileId = `${Date.now()}-${index}`;
      initialProgresses.set(fileId, {
        fileId,
        fileName: fileWithType.file.name,
        progress: 0,
        speedMBps: 0,
        status: 'pending',
      });
    });

    setState(prev => ({
      ...prev,
      fileProgresses: initialProgresses,
    }));

    const startTime = Date.now();

    try {
      // Upload all files in parallel using Promise.all
      const uploadPromises = files.map((fileWithType, index) => {
        const fileId = `${Date.now()}-${index}`;
        return uploadSingleFile(fileWithType, fileId, startTime);
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Calculate overall progress
      const calculateOverallProgress = () => {
        let totalProgress = 0;
        initialProgresses.forEach((_, fileId) => {
          const progress = state.fileProgresses.get(fileId);
          if (progress) {
            totalProgress += progress.progress;
          }
        });
        return Math.round(totalProgress / files.length);
      };

      // Update overall progress periodically
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          overallProgress: calculateOverallProgress(),
        }));
      }, 100);

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      clearInterval(progressInterval);

      // Separate original and enriched files
      const originalFile = uploadedFiles.find((_, index) => files[index].type === 'original') || null;
      const enrichedFiles = uploadedFiles.filter((_, index) => files[index].type === 'enriched');

      setState(prev => ({
        ...prev,
        isUploading: false,
        overallProgress: 100,
        uploadedFiles,
      }));

      return {
        originalFile,
        enrichedFiles,
        errors: state.errors,
      };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
      }));

      throw error;
    }
  }, [uploadSingleFile, state.errors, state.fileProgresses]);

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setState({
      isUploading: false,
      overallProgress: 0,
      fileProgresses: new Map(),
      uploadedFiles: [],
      errors: [],
    });
  }, []);

  return {
    ...state,
    validateFiles,
    uploadBatch,
    reset,
  };
}
