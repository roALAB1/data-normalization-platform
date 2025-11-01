import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export interface ColumnTransformation {
  inputColumn: string;
  outputColumns: string[];
  transformationType: 'split' | 'normalized' | 'unchanged';
  description?: string;
}

interface ColumnTransformationsSummaryProps {
  transformations: ColumnTransformation[];
}

export function ColumnTransformationsSummary({ transformations }: ColumnTransformationsSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (transformations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 border border-indigo-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold flex items-center justify-between hover:bg-indigo-700 transition-colors"
      >
        <span className="text-lg">Column Transformations Applied</span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      {isExpanded && (
        <div className="p-6 space-y-3">
          {transformations.map((transformation, index) => (
            <div
              key={index}
              className="flex items-start gap-3 py-3 border-b border-gray-200 last:border-b-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-900">
                    {transformation.inputColumn}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-semibold text-indigo-600">
                    {transformation.outputColumns.join(' + ')}
                  </span>
                  {transformation.transformationType === 'split' && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      split
                    </span>
                  )}
                  {transformation.transformationType === 'normalized' && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                      normalized
                    </span>
                  )}
                </div>
                {transformation.description && (
                  <p className="mt-1 text-xs text-gray-500">
                    {transformation.description}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                {transformation.transformationType !== 'unchanged' && (
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
