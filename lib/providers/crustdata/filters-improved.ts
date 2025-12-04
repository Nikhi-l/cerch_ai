/**
 * Improved Filter Builder with:
 * - Filter validation and conflict detection
 * - Smart suggestions when results are low
 * - Alternative filter combinations
 * - Filter ranking by effectiveness
 * - CrustData API optimization
 */

import type {
  CrustFilterCondition,
  CrustFilterNode,
  SearchQuery,
} from '../types';
import { parseAdvancedPeopleQuery, type AdvancedPeopleFilters } from '../parse-advanced';

// ============================================================================
// FILTER VALIDATION
// ============================================================================

interface FilterValidation {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
  confidence: number;
}

/**
 * Validate filter combinations for potential issues
 */
export function validateFilters(filters: AdvancedPeopleFilters): FilterValidation {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 1.0;

  // Check for over-restrictive filters
  const filterCount = [
    filters.titles.length > 0,
    filters.location !== null,
    filters.skills.length > 0,
    filters.industries.length > 0,
    filters.experience.minYears !== undefined,
    filters.companySize.min !== undefined || filters.companySize.max !== undefined,
  ].filter(Boolean).length;

  if (filterCount > 4) {
    warnings.push('Too many filters may limit results');
    suggestions.push('Try removing less important filters');
    confidence *= 0.7;
  }

  // Check for conflicting experience levels
  if (filters.experience.minYears && filters.experience.maxYears) {
    if (filters.experience.minYears > filters.experience.maxYears) {
      warnings.push('Minimum experience exceeds maximum');
      suggestions.push('Swap min and max experience values');
      confidence = 0.3;
    } else if (filters.experience.maxYears - filters.experience.minYears < 2) {
      warnings.push('Experience range is very narrow');
      suggestions.push('Widen experience range for more results');
      confidence *= 0.8;
    }
  }

  // Check for conflicting company size
  if (filters.companySize.min && filters.companySize.max) {
    if (filters.companySize.min > filters.companySize.max) {
      warnings.push('Minimum company size exceeds maximum');
      suggestions.push('Swap min and max company size');
      confidence = 0.3;
    }
  }

  // Check title-skill alignment
  if (filters.titles.length > 0 && filters.skills.length > 0) {
    const title = filters.titles[0].title.toLowerCase();
    const skills = filters.skills.map(s => s.skill.toLowerCase());

    // Check for mismatches
    if (title.includes('frontend') && skills.some(s => s.includes('python') || s.includes('django'))) {
      warnings.push('Frontend title with backend skills');
      suggestions.push('Align title and skills (e.g., Frontend + React, Backend + Python)');
      confidence *= 0.7;
    }
  }

  // Check for missing critical filters
  if (filters.titles.length === 0) {
    warnings.push('No job title specified');
    suggestions.push('Add a job title for better results');
    confidence *= 0.6;
  }

  return {
    isValid: confidence > 0.5,
    warnings,
    suggestions,
    confidence,
  };
}

// ============================================================================
// FILTER RANKING & OPTIMIZATION
// ============================================================================

interface FilterAlternative {
  description: string;
  filters: Partial<AdvancedPeopleFilters>;
  estimatedResults: 'high' | 'medium' | 'low';
  priority: number;
}

/**
 * Generate alternative filter combinations
 */
export function generateFilterAlternatives(
  filters: AdvancedPeopleFilters
): FilterAlternative[] {
  const alternatives: FilterAlternative[] = [];

  // Alternative 1: Broaden titles
  if (filters.titles.length > 0) {
    const broadTitles = filters.titles.slice(0, 3); // Top 3 title matches
    alternatives.push({
      description: 'Use multiple related job titles',
      filters: { ...filters, titles: broadTitles },
      estimatedResults: 'high',
      priority: 1,
    });
  }

  // Alternative 2: Expand location to metro area
  if (filters.location && filters.location.alternatives.length > 0) {
    alternatives.push({
      description: `Expand to ${filters.location.alternatives.join(' or ')}`,
      filters: { ...filters },
      estimatedResults: 'medium',
      priority: 2,
    });
  }

  // Alternative 3: Relax experience requirements
  if (filters.experience.minYears) {
    alternatives.push({
      description: 'Reduce minimum experience by 2 years',
      filters: {
        ...filters,
        experience: {
          ...filters.experience,
          minYears: Math.max(0, filters.experience.minYears - 2),
        },
      },
      estimatedResults: 'high',
      priority: 1,
    });
  }

  // Alternative 4: Broaden company size
  if (filters.companySize.min || filters.companySize.max) {
    alternatives.push({
      description: 'Remove company size filters',
      filters: {
        ...filters,
        companySize: {},
      },
      estimatedResults: 'high',
      priority: 3,
    });
  }

  // Alternative 5: Use only essential filters (title + location)
  if (filters.titles.length > 0 && filters.location) {
    alternatives.push({
      description: 'Use only title and location (remove other filters)',
      filters: {
        titles: filters.titles,
        location: filters.location,
        skills: [],
        industries: [],
        experience: {},
        companySize: {},
        rawQuery: filters.rawQuery,
      },
      estimatedResults: 'high',
      priority: 4,
    });
  }

  return alternatives.sort((a, b) => a.priority - b.priority);
}

// ============================================================================
// IMPROVED FILTER BUILDING
// ============================================================================

function makeCondition(
  column: string,
  type: CrustFilterCondition['type'],
  value: CrustFilterCondition['value'],
): CrustFilterCondition {
  return { column, type, value };
}

function asAndGroup(nodes: CrustFilterNode[]): CrustFilterNode | undefined {
  if (!nodes.length) return undefined;
  if (nodes.length === 1) return nodes[0];
  return { op: 'and', conditions: nodes };
}

function asOrGroup(nodes: CrustFilterNode[]): CrustFilterNode | undefined {
  if (!nodes.length) return undefined;
  if (nodes.length === 1) return nodes[0];
  return { op: 'or', conditions: nodes };
}

/**
 * Build optimized CrustData filter node
 */
export function buildOptimizedPeopleFilter(
  filters: AdvancedPeopleFilters,
  options: {
    useAlternatives?: boolean;
    maxTitles?: number;
    maxSkills?: number;
  } = {}
): CrustFilterNode {
  const {
    useAlternatives = false,
    maxTitles = 3,
    maxSkills = 5,
  } = options;

  const conditions: CrustFilterNode[] = [];

  // 1. Titles (use OR for multiple titles)
  if (filters.titles.length > 0) {
    const topTitles = filters.titles
      .slice(0, maxTitles)
      .filter(t => t.confidence > 0.7);

    if (topTitles.length > 0) {
      const titleConditions = topTitles.map(t =>
        makeCondition('current_employers.title', '(.)', t.title)
      );

      conditions.push(
        titleConditions.length === 1
          ? titleConditions[0]
          : { op: 'or', conditions: titleConditions }
      );
    }
  }

  // 2. Location
  if (filters.location) {
    if (useAlternatives && filters.location.alternatives.length > 0) {
      // Use OR for location alternatives
      const locationConditions = [
        filters.location.primary,
        ...filters.location.alternatives,
      ].map(loc => makeCondition('region', '(.)', loc));

      conditions.push({
        op: 'or',
        conditions: locationConditions,
      });
    } else {
      conditions.push(makeCondition('region', '(.)', filters.location.primary));
    }
  }

  // 3. Skills (use OR for better results)
  if (filters.skills.length > 0) {
    const topSkills = filters.skills.slice(0, maxSkills);
    const skillConditions = topSkills.map(s =>
      makeCondition('skills', '(.)', s.skill)
    );

    conditions.push(
      skillConditions.length === 1
        ? skillConditions[0]
        : { op: 'or', conditions: skillConditions }
    );
  }

  // 4. Industries (use OR for multiple)
  if (filters.industries.length > 0) {
    const industryConditions = filters.industries.map(ind =>
      makeCondition('all_employers.company_industries', '(.)', ind)
    );

    conditions.push(
      industryConditions.length === 1
        ? industryConditions[0]
        : { op: 'or', conditions: industryConditions }
    );
  }

  // 5. Experience
  if (filters.experience.minYears !== undefined) {
    conditions.push(
      makeCondition('years_of_experience_raw', '=>', filters.experience.minYears)
    );
  }

  if (filters.experience.maxYears !== undefined) {
    conditions.push(
      makeCondition('years_of_experience_raw', '=<', filters.experience.maxYears)
    );
  }

  // 6. Company Size
  if (filters.companySize.min !== undefined) {
    conditions.push(
      makeCondition('current_employers.company_headcount_latest', '=>', filters.companySize.min)
    );
  }

  if (filters.companySize.max !== undefined) {
    conditions.push(
      makeCondition('current_employers.company_headcount_latest', '=<', filters.companySize.max)
    );
  }

  // Fallback if no conditions
  if (conditions.length === 0) {
    return makeCondition('headline', '(.)', 'engineer');
  }

  return asAndGroup(conditions) || makeCondition('headline', '(.)', 'engineer');
}

// ============================================================================
// MAIN QUERY BUILDER
// ============================================================================

export interface BuildQueryResult {
  query: SearchQuery;
  validation: FilterValidation;
  alternatives: FilterAlternative[];
  metadata: {
    parsedFilters: AdvancedPeopleFilters;
    filterCount: number;
    estimatedResults: 'high' | 'medium' | 'low';
  };
}

/**
 * Build complete search query with validation and alternatives
 */
export function buildAdvancedPeopleQuery(
  text: string,
  limit: number = 50
): BuildQueryResult {
  // Parse the query
  const parsed = parseAdvancedPeopleQuery(text);

  // Validate filters
  const validation = validateFilters(parsed);

  // Generate alternatives
  const alternatives = generateFilterAlternatives(parsed);

  // Build the filter node
  const filterNode = buildOptimizedPeopleFilter(parsed, {
    useAlternatives: false,
    maxTitles: 3,
    maxSkills: 5,
  });

  // Calculate filter count
  const filterCount = [
    parsed.titles.length > 0,
    parsed.location !== null,
    parsed.skills.length > 0,
    parsed.industries.length > 0,
    parsed.experience.minYears !== undefined || parsed.experience.maxYears !== undefined,
    parsed.companySize.min !== undefined || parsed.companySize.max !== undefined,
  ].filter(Boolean).length;

  // Estimate results
  let estimatedResults: 'high' | 'medium' | 'low' = 'medium';
  if (filterCount === 0) {
    estimatedResults = 'high';
  } else if (filterCount <= 2 && validation.confidence > 0.8) {
    estimatedResults = 'high';
  } else if (filterCount > 4 || validation.confidence < 0.6) {
    estimatedResults = 'low';
  }

  return {
    query: {
      filters: filterNode,
      limit,
    },
    validation,
    alternatives,
    metadata: {
      parsedFilters: parsed,
      filterCount,
      estimatedResults,
    },
  };
}

/**
 * Build query with automatic fallback if original is too restrictive
 */
export async function buildAdaptivePeopleQuery(
  text: string,
  limit: number = 50,
  attemptNumber: number = 1
): Promise<{
  query: SearchQuery;
  usedAlternative: boolean;
  alternativeDescription?: string;
}> {
  const result = buildAdvancedPeopleQuery(text, limit);

  // If confidence is low and we have alternatives, use the first one
  if (attemptNumber === 1 && result.validation.confidence < 0.6 && result.alternatives.length > 0) {
    const alternative = result.alternatives[0];
    const altFilterNode = buildOptimizedPeopleFilter(alternative.filters as AdvancedPeopleFilters, {
      useAlternatives: true,
      maxTitles: 3,
      maxSkills: 5,
    });

    return {
      query: {
        filters: altFilterNode,
        limit,
      },
      usedAlternative: true,
      alternativeDescription: alternative.description,
    };
  }

  return {
    query: result.query,
    usedAlternative: false,
  };
}
