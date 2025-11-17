/**
 * Match Review Step
 * Allows users to review and approve/reject low-confidence matches
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertTriangle, Info, ArrowRight, Eye } from 'lucide-react';

export interface MatchWithQuality {
  originalRowIndex: number;
  enrichedRowIndex: number;
  matchedOn: string[];
  confidence: number;
  qualityScore: number;
  matchQuality: 'high' | 'medium' | 'low';
  reasoning: string[];
  originalData: Record<string, any>;
  enrichedData: Record<string, any>;
}

export interface MatchReviewStepProps {
  matches: MatchWithQuality[];
  onContinue: (approvedMatches: Set<number>) => void;
  onBack: () => void;
}

export default function MatchReviewStep({
  matches,
  onContinue,
  onBack
}: MatchReviewStepProps) {
  // Filter to only low and medium confidence matches
  const reviewableMatches = useMemo(() => {
    return matches.filter(m => m.matchQuality === 'low' || m.matchQuality === 'medium');
  }, [matches]);

  const [approvedMatches, setApprovedMatches] = useState<Set<number>>(
    new Set(reviewableMatches.filter(m => m.matchQuality === 'medium').map(m => m.originalRowIndex))
  );

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Statistics
  const stats = useMemo(() => {
    const high = matches.filter(m => m.matchQuality === 'high').length;
    const medium = matches.filter(m => m.matchQuality === 'medium').length;
    const low = matches.filter(m => m.matchQuality === 'low').length;
    
    return {
      total: matches.length,
      high,
      medium,
      low,
      needsReview: medium + low
    };
  }, [matches]);

  const toggleMatch = (rowIndex: number) => {
    const newApproved = new Set(approvedMatches);
    if (newApproved.has(rowIndex)) {
      newApproved.delete(rowIndex);
    } else {
      newApproved.add(rowIndex);
    }
    setApprovedMatches(newApproved);
  };

  const toggleExpanded = (rowIndex: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedRows(newExpanded);
  };

  const approveAll = () => {
    setApprovedMatches(new Set(reviewableMatches.map(m => m.originalRowIndex)));
  };

  const rejectAll = () => {
    setApprovedMatches(new Set());
  };

  const handleContinue = () => {
    // Include all high-confidence matches automatically
    const finalApproved = new Set(approvedMatches);
    matches.filter(m => m.matchQuality === 'high').forEach(m => {
      finalApproved.add(m.originalRowIndex);
    });
    onContinue(finalApproved);
  };

  const getQualityBadge = (quality: 'high' | 'medium' | 'low') => {
    switch (quality) {
      case 'high':
        return <Badge className="bg-green-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge className="bg-red-500">Low</Badge>;
    }
  };

  // If no matches need review, skip this step
  if (stats.needsReview === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Match Review</h2>
          <p className="text-muted-foreground mt-1">
            Review match quality before finalizing
          </p>
        </div>

        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Great news!</strong> All {stats.high} matches are high confidence. No review needed!
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={() => onContinue(new Set())}>
            Continue to Output
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Match Review</h2>
        <p className="text-muted-foreground mt-1">
          Review {stats.needsReview} matches that need your attention
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.high.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Auto-approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Medium Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.medium.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Review recommended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.low.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Review required</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={approveAll}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Approve All
        </Button>
        <Button variant="outline" size="sm" onClick={rejectAll}>
          <XCircle className="mr-2 h-4 w-4" />
          Reject All
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {approvedMatches.size} of {stats.needsReview} approved
        </div>
      </div>

      {/* Matches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matches Needing Review</CardTitle>
          <CardDescription>
            Click on a row to see details. Check the box to approve the match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Approve</TableHead>
                  <TableHead className="w-24">Quality</TableHead>
                  <TableHead className="w-24">Confidence</TableHead>
                  <TableHead>Matched On</TableHead>
                  <TableHead>Reasoning</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewableMatches.map((match, idx) => {
                  const isExpanded = expandedRows.has(match.originalRowIndex);
                  const isApproved = approvedMatches.has(match.originalRowIndex);

                  return (
                    <>
                      <TableRow key={match.originalRowIndex} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isApproved}
                            onCheckedChange={() => toggleMatch(match.originalRowIndex)}
                          />
                        </TableCell>
                        <TableCell>{getQualityBadge(match.matchQuality)}</TableCell>
                        <TableCell>{Math.round(match.confidence * 100)}%</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {match.matchedOn.map(id => (
                              <Badge key={id} variant="outline" className="text-xs">{id}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {match.reasoning[0]}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(match.originalRowIndex)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="p-4 space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Match Reasoning:</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  {match.reasoning.map((reason, i) => (
                                    <li key={i}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Original Data (Sample):</h4>
                                  <div className="text-sm space-y-1 bg-background p-3 rounded border">
                                    {Object.entries(match.originalData).slice(0, 3).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key}:</span> {String(value).substring(0, 50)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Enriched Data (Sample):</h4>
                                  <div className="text-sm space-y-1 bg-background p-3 rounded border">
                                    {Object.entries(match.enrichedData).slice(0, 3).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key}:</span> {String(value).substring(0, 50)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> High-quality matches ({stats.high}) are automatically approved.
          Only medium and low-quality matches require your review.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          Continue with {approvedMatches.size + stats.high} Approved Matches
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
