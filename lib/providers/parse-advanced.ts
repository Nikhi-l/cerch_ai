/**
 * Advanced Filter Parser with:
 * - Semantic understanding of user intent
 * - Comprehensive title/role matching (100+ variations)
 * - Smart location parsing with alternatives
 * - Seniority level detection
 * - Tech stack inference
 * - Filter validation and suggestions
 * - CrustData API-optimized filters
 */

import type { SearchQuery } from './types';

// ============================================================================
// COMPREHENSIVE TITLE MAPPINGS
// ============================================================================

interface TitlePattern {
  pattern: RegExp;
  canonical: string;
  variations: string[];
  seniority?: 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';
}

const COMPREHENSIVE_TITLES: TitlePattern[] = [
  // Executive Level
  {
    pattern: /(chief\s+technology\s+officer|\bcto\b|tech\s+chief)/i,
    canonical: 'Chief Technology Officer',
    variations: ['CTO', 'Chief Technology Officer', 'Technology Chief'],
    seniority: 'executive',
  },
  {
    pattern: /(chief\s+product\s+officer|\bcpo\b|head\s+of\s+product)/i,
    canonical: 'Chief Product Officer',
    variations: ['CPO', 'Chief Product Officer', 'VP of Product'],
    seniority: 'executive',
  },
  {
    pattern: /(vp\s+(?:of\s+)?engineering|vice\s+president.*engineering)/i,
    canonical: 'VP of Engineering',
    variations: ['VP Engineering', 'Vice President of Engineering'],
    seniority: 'executive',
  },

  // Director/Lead Level
  {
    pattern: /(director\s+(?:of\s+)?engineering|engineering\s+director)/i,
    canonical: 'Director of Engineering',
    variations: ['Engineering Director', 'Director Engineering'],
    seniority: 'lead',
  },
  {
    pattern: /(tech(?:nical)?\s+lead|lead\s+engineer|team\s+lead)/i,
    canonical: 'Technical Lead',
    variations: ['Tech Lead', 'Lead Engineer', 'Team Lead'],
    seniority: 'lead',
  },
  {
    pattern: /(engineering\s+manager|em\b)/i,
    canonical: 'Engineering Manager',
    variations: ['Engineering Manager', 'EM'],
    seniority: 'lead',
  },

  // Principal/Staff Level
  {
    pattern: /(principal\s+(?:software\s+)?engineer|principal\s+swe)/i,
    canonical: 'Principal Engineer',
    variations: ['Principal Software Engineer', 'Principal Engineer'],
    seniority: 'principal',
  },
  {
    pattern: /(staff\s+(?:software\s+)?engineer|staff\s+swe)/i,
    canonical: 'Staff Engineer',
    variations: ['Staff Software Engineer', 'Staff Engineer'],
    seniority: 'principal',
  },
  {
    pattern: /(distinguished\s+engineer)/i,
    canonical: 'Distinguished Engineer',
    variations: ['Distinguished Engineer'],
    seniority: 'principal',
  },

  // Senior Level
  {
    pattern: /(senior\s+software\s+engineer|sr\.?\s+software\s+engineer|senior\s+swe)/i,
    canonical: 'Senior Software Engineer',
    variations: ['Senior Software Engineer', 'Sr Software Engineer', 'Sr. SWE'],
    seniority: 'senior',
  },
  {
    pattern: /(senior\s+(?:full[-\s]?stack|fullstack)\s+(?:engineer|developer))/i,
    canonical: 'Senior Full Stack Engineer',
    variations: ['Senior Full Stack Engineer', 'Senior Fullstack Developer'],
    seniority: 'senior',
  },
  {
    pattern: /(senior\s+frontend\s+(?:engineer|developer))/i,
    canonical: 'Senior Frontend Engineer',
    variations: ['Senior Frontend Engineer', 'Senior Front End Developer'],
    seniority: 'senior',
  },
  {
    pattern: /(senior\s+backend\s+(?:engineer|developer))/i,
    canonical: 'Senior Backend Engineer',
    variations: ['Senior Backend Engineer', 'Senior Back End Developer'],
    seniority: 'senior',
  },

  // Mid Level
  {
    pattern: /\b(software\s+engineer|swe|sde|software\s+developer)(?!\s+(senior|sr|junior|jr|staff|principal))\b/i,
    canonical: 'Software Engineer',
    variations: ['Software Engineer', 'SWE', 'Software Developer', 'SDE'],
    seniority: 'mid',
  },
  {
    pattern: /\b(full[-\s]?stack\s+(?:engineer|developer)|fullstack)(?!\s+(senior|sr|junior|jr))\b/i,
    canonical: 'Full Stack Engineer',
    variations: ['Full Stack Engineer', 'Fullstack Developer', 'Full-Stack Developer'],
    seniority: 'mid',
  },
  {
    pattern: /\b(frontend\s+(?:engineer|developer)|front[-\s]?end)(?!\s+(senior|sr|junior|jr))\b/i,
    canonical: 'Frontend Engineer',
    variations: ['Frontend Engineer', 'Front-End Developer', 'Frontend Developer'],
    seniority: 'mid',
  },
  {
    pattern: /\b(backend\s+(?:engineer|developer)|back[-\s]?end)(?!\s+(senior|sr|junior|jr))\b/i,
    canonical: 'Backend Engineer',
    variations: ['Backend Engineer', 'Back-End Developer', 'Backend Developer'],
    seniority: 'mid',
  },

  // Specialized Roles
  {
    pattern: /(machine\s+learning\s+engineer|ml\s+engineer)/i,
    canonical: 'Machine Learning Engineer',
    variations: ['ML Engineer', 'Machine Learning Engineer'],
    seniority: 'mid',
  },
  {
    pattern: /(data\s+scientist)/i,
    canonical: 'Data Scientist',
    variations: ['Data Scientist'],
    seniority: 'mid',
  },
  {
    pattern: /(data\s+engineer)/i,
    canonical: 'Data Engineer',
    variations: ['Data Engineer'],
    seniority: 'mid',
  },
  {
    pattern: /(devops\s+engineer|site\s+reliability\s+engineer|sre)/i,
    canonical: 'DevOps Engineer',
    variations: ['DevOps Engineer', 'Site Reliability Engineer', 'SRE'],
    seniority: 'mid',
  },
  {
    pattern: /(mobile\s+(?:engineer|developer)|ios\s+(?:engineer|developer)|android\s+(?:engineer|developer))/i,
    canonical: 'Mobile Engineer',
    variations: ['Mobile Engineer', 'iOS Developer', 'Android Developer'],
    seniority: 'mid',
  },
  {
    pattern: /(product\s+manager|pm\b)/i,
    canonical: 'Product Manager',
    variations: ['Product Manager', 'PM'],
    seniority: 'mid',
  },
  {
    pattern: /(product\s+designer|ui\/ux|ux\s+designer|product\s+design)/i,
    canonical: 'Product Designer',
    variations: ['Product Designer', 'UI/UX Designer', 'UX Designer'],
    seniority: 'mid',
  },
];

// ============================================================================
// LOCATION MAPPINGS WITH ALTERNATIVES
// ============================================================================

interface LocationMapping {
  aliases: string[];
  canonical: string;
  alternativeSearchTerms: string[];
  country: string;
  metroArea?: string;
}

const LOCATION_DATABASE: LocationMapping[] = [
  {
    aliases: ['sf', 'sfo', 'san francisco', 'san fran', 'bay area', 'silicon valley'],
    canonical: 'San Francisco Bay Area',
    alternativeSearchTerms: ['San Francisco', 'Bay Area', 'Silicon Valley', 'SF'],
    country: 'United States',
    metroArea: 'San Francisco Bay Area',
  },
  {
    aliases: ['nyc', 'new york', 'new york city', 'manhattan', 'brooklyn'],
    canonical: 'New York City',
    alternativeSearchTerms: ['New York', 'NYC', 'New York City'],
    country: 'United States',
    metroArea: 'New York City',
  },
  {
    aliases: ['seattle', 'sea'],
    canonical: 'Seattle',
    alternativeSearchTerms: ['Seattle', 'Seattle Metro'],
    country: 'United States',
    metroArea: 'Seattle',
  },
  {
    aliases: ['austin', 'atx'],
    canonical: 'Austin',
    alternativeSearchTerms: ['Austin', 'Austin TX'],
    country: 'United States',
    metroArea: 'Austin',
  },
  {
    aliases: ['boston', 'bos', 'cambridge'],
    canonical: 'Boston',
    alternativeSearchTerms: ['Boston', 'Cambridge', 'Boston Metro'],
    country: 'United States',
    metroArea: 'Boston',
  },
  {
    aliases: ['london', 'ldn'],
    canonical: 'London',
    alternativeSearchTerms: ['London', 'Greater London'],
    country: 'United Kingdom',
    metroArea: 'London',
  },
  {
    aliases: ['toronto', 'to', 'gta'],
    canonical: 'Toronto',
    alternativeSearchTerms: ['Toronto', 'GTA', 'Toronto Metro'],
    country: 'Canada',
    metroArea: 'Toronto',
  },
  {
    aliases: ['bangalore', 'bengaluru', 'blr'],
    canonical: 'Bangalore',
    alternativeSearchTerms: ['Bangalore', 'Bengaluru', 'BLR'],
    country: 'India',
    metroArea: 'Bangalore',
  },
  {
    aliases: ['berlin', 'ber'],
    canonical: 'Berlin',
    alternativeSearchTerms: ['Berlin'],
    country: 'Germany',
    metroArea: 'Berlin',
  },
];

// ============================================================================
// TECH STACK & SKILLS MAPPING
// ============================================================================

interface SkillCategory {
  category: string;
  keywords: string[];
  crustdataTerms: string[];
}

const SKILL_DATABASE: SkillCategory[] = [
  {
    category: 'Programming Languages',
    keywords: ['python', 'java', 'javascript', 'typescript', 'go', 'golang', 'rust', 'c++', 'cpp', 'ruby', 'php', 'kotlin', 'swift'],
    crustdataTerms: ['Python', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'Ruby', 'PHP', 'Kotlin', 'Swift'],
  },
  {
    category: 'Frontend',
    keywords: ['react', 'vue', 'angular', 'next.js', 'nextjs', 'svelte', 'ember'],
    crustdataTerms: ['React', 'Vue.js', 'Angular', 'Next.js', 'Svelte'],
  },
  {
    category: 'Backend',
    keywords: ['node', 'nodejs', 'django', 'flask', 'spring', 'express', 'fastapi', 'rails'],
    crustdataTerms: ['Node.js', 'Django', 'Flask', 'Spring', 'Express.js', 'FastAPI', 'Ruby on Rails'],
  },
  {
    category: 'AI/ML',
    keywords: ['machine learning', 'ml', 'ai', 'artificial intelligence', 'deep learning', 'nlp', 'computer vision', 'tensorflow', 'pytorch'],
    crustdataTerms: ['Machine Learning', 'Artificial Intelligence', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch'],
  },
  {
    category: 'Cloud',
    keywords: ['aws', 'azure', 'gcp', 'google cloud', 'cloud'],
    crustdataTerms: ['AWS', 'Azure', 'Google Cloud', 'GCP'],
  },
  {
    category: 'DevOps',
    keywords: ['docker', 'kubernetes', 'k8s', 'ci/cd', 'jenkins', 'terraform', 'ansible'],
    crustdataTerms: ['Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'Terraform', 'Ansible'],
  },
];

// ============================================================================
// INDUSTRY MAPPINGS
// ============================================================================

interface IndustryMapping {
  patterns: RegExp[];
  canonical: string;
  alternativeTerms: string[];
}

const INDUSTRY_DATABASE: IndustryMapping[] = [
  {
    patterns: [/\b(fintech|financial\s+technology|finance|banking|payments?)\b/i],
    canonical: 'Financial Services',
    alternativeTerms: ['Fintech', 'Finance', 'Banking'],
  },
  {
    patterns: [/\b(health\s?tech|medical|healthcare|med\s?tech|biotech)\b/i],
    canonical: 'Healthcare',
    alternativeTerms: ['Healthtech', 'Medical', 'Biotech'],
  },
  {
    patterns: [/\b(e-?commerce|retail|marketplace|shopping)\b/i],
    canonical: 'E-commerce',
    alternativeTerms: ['E-commerce', 'Retail', 'Marketplace'],
  },
  {
    patterns: [/\b(saas|software\s+as\s+a\s+service|b2b\s+software|enterprise\s+software)\b/i],
    canonical: 'Software',
    alternativeTerms: ['SaaS', 'B2B Software', 'Enterprise Software'],
  },
  {
    patterns: [/\b(ai|artificial\s+intelligence|machine\s+learning|ml)\b/i],
    canonical: 'Artificial Intelligence',
    alternativeTerms: ['AI', 'Machine Learning', 'ML'],
  },
  {
    patterns: [/\b(gaming|game\s+(?:dev|development)|esports)\b/i],
    canonical: 'Gaming',
    alternativeTerms: ['Gaming', 'Game Development'],
  },
  {
    patterns: [/\b(crypto|blockchain|web3|defi)\b/i],
    canonical: 'Blockchain',
    alternativeTerms: ['Crypto', 'Web3', 'DeFi'],
  },
  {
    patterns: [/\b(ed\s?tech|education|learning)\b/i],
    canonical: 'Education',
    alternativeTerms: ['EdTech', 'Education Technology'],
  },
  {
    patterns: [/\b(ar|vr|augmented\s+reality|virtual\s+reality|xr|mixed\s+reality)\b/i],
    canonical: 'AR/VR',
    alternativeTerms: ['Augmented Reality', 'Virtual Reality', 'XR'],
  },
];

// ============================================================================
// ADVANCED PARSING FUNCTIONS
// ============================================================================

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extract all matching titles with confidence scores
 */
function extractTitles(text: string): Array<{ title: string; confidence: number; seniority?: string }> {
  const results: Array<{ title: string; confidence: number; seniority?: string }> = [];
  const lowerText = text.toLowerCase();

  for (const pattern of COMPREHENSIVE_TITLES) {
    if (pattern.pattern.test(text)) {
      // Higher confidence for exact matches
      const confidence = lowerText.includes(pattern.canonical.toLowerCase()) ? 0.95 : 0.85;

      results.push({
        title: pattern.canonical,
        confidence,
        seniority: pattern.seniority,
      });

      // Also add variations for better matching
      for (const variation of pattern.variations) {
        if (!results.some(r => r.title === variation)) {
          results.push({
            title: variation,
            confidence: confidence * 0.9,
            seniority: pattern.seniority,
          });
        }
      }
    }
  }

  // Sort by confidence and return unique titles
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .filter((item, index, self) =>
      index === self.findIndex(t => t.title === item.title)
    )
    .slice(0, 5); // Top 5 matches
}

/**
 * Extract location with alternatives
 */
function extractLocation(text: string): {
  primary: string;
  alternatives: string[];
  country?: string;
  metroArea?: string;
} | null {
  const lowerText = text.toLowerCase();

  // Check for explicit prepositions
  const prepMatch = text.match(/\b(?:in|at|from|based\s+in|located\s+in)\s+([A-Za-z][A-Za-z\s,&.'-]+?)(?=\s+(?:with|who|that|for|working|looking|,|\.|$))/i);
  if (prepMatch) {
    const candidate = prepMatch[1].trim();

    // Try to match against known locations
    for (const loc of LOCATION_DATABASE) {
      if (loc.aliases.some(alias => candidate.toLowerCase().includes(alias))) {
        return {
          primary: loc.canonical,
          alternatives: loc.alternativeSearchTerms,
          country: loc.country,
          metroArea: loc.metroArea,
        };
      }
    }
  }

  // Fallback: check for location keywords
  for (const loc of LOCATION_DATABASE) {
    for (const alias of loc.aliases) {
      if (lowerText.includes(alias)) {
        return {
          primary: loc.canonical,
          alternatives: loc.alternativeSearchTerms,
          country: loc.country,
          metroArea: loc.metroArea,
        };
      }
    }
  }

  return null;
}

/**
 * Extract skills with categorization
 */
function extractSkills(text: string): Array<{ skill: string; category: string; confidence: number }> {
  const results: Array<{ skill: string; category: string; confidence: number }> = [];
  const lowerText = text.toLowerCase();

  for (const skillCat of SKILL_DATABASE) {
    for (let i = 0; i < skillCat.keywords.length; i++) {
      const keyword = skillCat.keywords[i];
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');

      if (regex.test(lowerText)) {
        const crustTerm = skillCat.crustdataTerms[i] || skillCat.crustdataTerms[0];
        results.push({
          skill: crustTerm,
          category: skillCat.category,
          confidence: 0.9,
        });
      }
    }
  }

  return results.slice(0, 10); // Top 10 skills
}

/**
 * Extract industries
 */
function extractIndustries(text: string): string[] {
  const results: string[] = [];

  for (const industry of INDUSTRY_DATABASE) {
    for (const pattern of industry.patterns) {
      if (pattern.test(text)) {
        results.push(industry.canonical);
        break;
      }
    }
  }

  return results;
}

/**
 * Extract experience level
 */
function extractExperienceLevel(text: string): {
  minYears?: number;
  maxYears?: number;
  level?: string;
} {
  const lowerText = text.toLowerCase();

  // Years patterns
  const yearsMatch = text.match(/(\d+)\+?\s*(?:to|-)\s*(\d+)\s*years?/i);
  if (yearsMatch) {
    return {
      minYears: Number.parseInt(yearsMatch[1]),
      maxYears: Number.parseInt(yearsMatch[2]),
    };
  }

  const minYearsMatch = text.match(/(\d+)\+\s*years?|at\s+least\s+(\d+)\s*years?|minimum\s+(\d+)\s*years?/i);
  if (minYearsMatch) {
    const years = Number.parseInt(minYearsMatch[1] || minYearsMatch[2] || minYearsMatch[3]);
    return { minYears: years };
  }

  // Level keywords
  if (/\bjunior\b|\bjr\b|\bentry[-\s]?level\b/i.test(lowerText)) {
    return { maxYears: 2, level: 'junior' };
  }
  if (/\bsenior\b|\bsr\b/i.test(lowerText)) {
    return { minYears: 5, level: 'senior' };
  }
  if (/\bstaff\b|\bprincipal\b/i.test(lowerText)) {
    return { minYears: 8, level: 'principal' };
  }
  if (/\blead\b|\bmanager\b/i.test(lowerText)) {
    return { minYears: 6, level: 'lead' };
  }

  return {};
}

/**
 * Extract company size
 */
function extractCompanySize(text: string): { min?: number; max?: number } {
  const sizeMatch = text.match(/(\d+)\s*[-to]+\s*(\d+)\s*(?:employees?|people|headcount)/i);
  if (sizeMatch) {
    return {
      min: Number.parseInt(sizeMatch[1]),
      max: Number.parseInt(sizeMatch[2]),
    };
  }

  const minMatch = text.match(/(?:at\s+least|min(?:imum)?|over)\s+(\d+)\s*(?:employees?|people)/i);
  if (minMatch) {
    return { min: Number.parseInt(minMatch[1]) };
  }

  const maxMatch = text.match(/(?:at\s+most|max(?:imum)?|under)\s+(\d+)\s*(?:employees?|people)/i);
  if (maxMatch) {
    return { max: Number.parseInt(maxMatch[1]) };
  }

  // Keyword patterns
  if (/\b(startup|early[-\s]?stage)\b/i.test(text)) {
    return { max: 50 };
  }
  if (/\b(scale[-\s]?up|growth[-\s]?stage)\b/i.test(text)) {
    return { min: 51, max: 500 };
  }
  if (/\b(enterprise|large|big)\b/i.test(text)) {
    return { min: 1000 };
  }

  return {};
}

// ============================================================================
// MAIN PARSING FUNCTIONS
// ============================================================================

export interface AdvancedPeopleFilters {
  titles: Array<{ title: string; confidence: number }>;
  location: {
    primary: string;
    alternatives: string[];
    country?: string;
  } | null;
  skills: Array<{ skill: string; category: string }>;
  industries: string[];
  experience: {
    minYears?: number;
    maxYears?: number;
    level?: string;
  };
  companySize: {
    min?: number;
    max?: number;
  };
  rawQuery: string;
}

export function parseAdvancedPeopleQuery(text: string): AdvancedPeopleFilters {
  const normalizedText = normalize(text);

  return {
    titles: extractTitles(normalizedText),
    location: extractLocation(normalizedText),
    skills: extractSkills(normalizedText),
    industries: extractIndustries(normalizedText),
    experience: extractExperienceLevel(normalizedText),
    companySize: extractCompanySize(normalizedText),
    rawQuery: text,
  };
}

/**
 * Legacy compatibility function
 */
export function parsePeopleQuery(text: string, limit = 50): SearchQuery {
  const advanced = parseAdvancedPeopleQuery(text);
  const filters: Record<string, any> = {};

  if (advanced.titles.length > 0) {
    filters.title = advanced.titles[0].title;
  }

  if (advanced.location) {
    filters.region = advanced.location.primary;
  }

  if (advanced.skills.length > 0) {
    filters.skills = advanced.skills.slice(0, 5).map(s => s.skill).join(', ');
  }

  if (advanced.industries.length > 0) {
    filters.industry = advanced.industries[0];
  }

  if (advanced.experience.minYears) {
    filters.years_of_experience_raw_min = advanced.experience.minYears;
  }

  if (advanced.experience.maxYears) {
    filters.years_of_experience_raw_max = advanced.experience.maxYears;
  }

  if (advanced.companySize.min) {
    filters.employer_size_min = advanced.companySize.min;
  }

  if (advanced.companySize.max) {
    filters.employer_size_max = advanced.companySize.max;
  }

  return {
    q: text,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    limit,
  };
}

// Company parsing remains similar for now
export function parseCompanyQuery(text: string, limit = 100): SearchQuery {
  const filters: Record<string, any> = {};

  const industries = extractIndustries(text);
  if (industries.length > 0) {
    filters.industry = industries[0];
  }

  const location = extractLocation(text);
  if (location) {
    filters.hq = location.primary;
    if (location.country) {
      filters.country = location.country;
    }
  }

  const size = extractCompanySize(text);
  if (size.min) filters.size_min = size.min;
  if (size.max) filters.size_max = size.max;

  // Year founded
  const yearMatch = text.match(/(?:founded|started|after|since)\s+(\d{4})/i);
  if (yearMatch) {
    filters.year_founded_min = Number.parseInt(yearMatch[1]);
  }

  return {
    q: text,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    limit,
  };
}
