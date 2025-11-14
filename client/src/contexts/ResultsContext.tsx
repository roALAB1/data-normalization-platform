import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ColumnMapping {
  columnName: string;
  detectedType: string;
  confidence: number;
  overrideType?: string;
  sampleValues?: string[];
}

interface ProcessingResult {
  originalRow: Record<string, string>;
  normalizedRow: Record<string, string>;
  rowIndex: number;
}

interface ProcessingStats {
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
}

interface ResultsState {
  file: File | null;
  columnMappings: ColumnMapping[];
  results: ProcessingResult[];
  allResults: any[][];
  stats: ProcessingStats | null;
  outputColumns: string[];
  hasResults: boolean;
}

interface ResultsContextType {
  resultsState: ResultsState;
  saveResults: (state: Partial<ResultsState>) => void;
  clearResults: () => void;
}

const defaultState: ResultsState = {
  file: null,
  columnMappings: [],
  results: [],
  allResults: [],
  stats: null,
  outputColumns: [],
  hasResults: false,
};

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [resultsState, setResultsState] = useState<ResultsState>(defaultState);

  const saveResults = (state: Partial<ResultsState>) => {
    setResultsState(prev => ({
      ...prev,
      ...state,
      hasResults: true,
    }));
  };

  const clearResults = () => {
    setResultsState(defaultState);
  };

  return (
    <ResultsContext.Provider value={{ resultsState, saveResults, clearResults }}>
      {children}
    </ResultsContext.Provider>
  );
}

export function useResults() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResults must be used within ResultsProvider');
  }
  return context;
}
