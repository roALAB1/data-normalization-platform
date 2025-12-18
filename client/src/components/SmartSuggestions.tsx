/**
 * SmartSuggestions.tsx
 * 
 * Displays intelligent column combination suggestions before normalization.
 * Allows users to accept, customize, or ignore detected combinations.
 * 
 * @version 3.50.0
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, MapPin, User, Phone, Check, X, Settings } from "lucide-react";
import type { CombinationSuggestion } from "@/../../shared/utils/ColumnCombinationDetector";

interface SmartSuggestionsProps {
  suggestions: CombinationSuggestion[];
  onAccept: (suggestion: CombinationSuggestion) => void;
  onIgnore: (suggestion: CombinationSuggestion) => void;
  onCustomize: (suggestion: CombinationSuggestion) => void;
}

export function SmartSuggestions({
  suggestions,
  onAccept,
  onIgnore,
  onCustomize,
}: SmartSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'address':
        return <MapPin className="h-5 w-5 text-blue-600" />;
      case 'name':
        return <User className="h-5 w-5 text-purple-600" />;
      case 'phone':
        return <Phone className="h-5 w-5 text-green-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-amber-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'address':
        return 'Address Components';
      case 'name':
        return 'Name Components';
      case 'phone':
        return 'Phone Components';
      default:
        return 'Components';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-green-600">High Confidence ({Math.round(confidence * 100)}%)</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge variant="secondary">Medium Confidence ({Math.round(confidence * 100)}%)</Badge>;
    } else {
      return <Badge variant="outline">Low Confidence ({Math.round(confidence * 100)}%)</Badge>;
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-semibold">Smart Suggestions</h3>
        <Badge variant="secondary">{suggestions.length} detected</Badge>
      </div>

      <div className="grid gap-4">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="border-2 border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(suggestion.type)}
                  <div>
                    <CardTitle className="text-base">{getTypeLabel(suggestion.type)} Detected</CardTitle>
                    <CardDescription className="mt-1">
                      Combine {suggestion.columns.length} columns into "{suggestion.targetColumnName}"
                    </CardDescription>
                  </div>
                </div>
                {getConfidenceBadge(suggestion.confidence)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Column List */}
              <div className="flex flex-wrap gap-2">
                {suggestion.columns.map((col, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono text-xs">
                    {col.name}
                  </Badge>
                ))}
                <span className="text-muted-foreground">→</span>
                <Badge variant="default" className="font-mono text-xs bg-blue-600">
                  {suggestion.targetColumnName}
                </Badge>
              </div>

              {/* Preview Samples */}
              <div className="rounded-lg bg-white p-3 border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Preview:</p>
                <div className="space-y-1">
                  {suggestion.previewSamples.slice(0, 3).map((sample, idx) => (
                    <div key={idx} className="font-mono text-sm text-foreground">
                      • {sample}
                    </div>
                  ))}
                </div>
              </div>

              {/* Formula */}
              <div className="rounded-lg bg-slate-100 p-3 border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Formula:</p>
                <code className="text-xs text-slate-700">{suggestion.formula}</code>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => onAccept(suggestion)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCustomize(suggestion)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Customize
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onIgnore(suggestion)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Ignore
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        💡 <strong>Tip:</strong> Accepting these suggestions will combine fragmented columns before normalization, 
        improving data quality and enrichment accuracy.
      </p>
    </div>
  );
}
