/**
 * Column Matcher - Fuzzy string matching for automatic column mapping
 */

export interface ColumnMatch {
  sourceColumn: string;
  targetColumn: string;
  confidence: number; // 0-100
  reason: string;
}

/**
 * Normalize column name for comparison
 * Converts to lowercase, removes special chars, handles common separators
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\s-]+/g, '') // Remove underscores, spaces, hyphens
    .replace(/[^a-z0-9]/g, ''); // Remove other special chars
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two column names (0-100)
 */
function calculateSimilarity(source: string, target: string): number {
  const normalizedSource = normalizeColumnName(source);
  const normalizedTarget = normalizeColumnName(target);

  // Exact match after normalization
  if (normalizedSource === normalizedTarget) {
    return 100;
  }

  // Check if one contains the other
  if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
    const longer = Math.max(normalizedSource.length, normalizedTarget.length);
    const shorter = Math.min(normalizedSource.length, normalizedTarget.length);
    return Math.round((shorter / longer) * 95); // 95% for substring matches
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedSource, normalizedTarget);
  const maxLength = Math.max(normalizedSource.length, normalizedTarget.length);
  
  if (maxLength === 0) return 0;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
}

/**
 * Get reason for match confidence
 */
function getMatchReason(source: string, target: string, confidence: number): string {
  const normalizedSource = normalizeColumnName(source);
  const normalizedTarget = normalizeColumnName(target);

  if (confidence === 100) {
    return "Exact match";
  } else if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
    return "Substring match";
  } else if (confidence >= 80) {
    return "Very similar";
  } else if (confidence >= 60) {
    return "Similar";
  } else {
    return "Possible match";
  }
}

/**
 * Auto-map columns based on name similarity
 * Returns suggested mappings with confidence scores
 */
export function autoMapColumns(
  sourceColumns: string[],
  targetColumns: string[]
): ColumnMatch[] {
  const matches: ColumnMatch[] = [];
  const usedTargets = new Set<string>();

  // For each source column, find best matching target
  for (const sourceCol of sourceColumns) {
    let bestMatch: { target: string; confidence: number } | null = null;

    for (const targetCol of targetColumns) {
      if (usedTargets.has(targetCol)) continue;

      const confidence = calculateSimilarity(sourceCol, targetCol);
      
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { target: targetCol, confidence };
      }
    }

    // Only include matches with confidence >= 50%
    if (bestMatch && bestMatch.confidence >= 50) {
      usedTargets.add(bestMatch.target);
      matches.push({
        sourceColumn: sourceCol,
        targetColumn: bestMatch.target,
        confidence: bestMatch.confidence,
        reason: getMatchReason(sourceCol, bestMatch.target, bestMatch.confidence)
      });
    }
  }

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Convert matches to mapping object
 */
export function matchesToMappings(matches: ColumnMatch[]): Record<string, string> {
  const mappings: Record<string, string> = {};
  for (const match of matches) {
    mappings[match.sourceColumn] = match.targetColumn;
  }
  return mappings;
}
