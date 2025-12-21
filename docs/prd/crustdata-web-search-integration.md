# CrustData Web Search API Integration - Technical PRD

## Document Info
- **Author**: AI Agent (Claude)
- **Created**: 2025-12-21
- **Status**: In Progress
- **Branch**: `claude/integrate-crustdata-search-sAL21`

---

## Context

### Problem Statement
Cerch AI currently provides company and people search functionality via CrustData's People and Company APIs. However, users often need broader web research capabilities to:
- Find news articles about companies or industry trends
- Research academic papers and scholarly content
- Discover competitive intelligence from across the web
- Supplement people/company data with additional context from websites

### Background
CrustData offers two new Web APIs that can enhance Cerch AI's research capabilities:
1. **Web Search API** (`POST /screener/web-search`) - Google SERP-based web search with source filtering
2. **Web Fetch API** (`POST /screener/web-fetch`) - HTML content extraction from URLs

These APIs enable holistic research by combining structured people/company data with unstructured web content.

---

## Goals

### Primary Goals
1. Enable users to perform web searches through natural language queries
2. Display search results (news, web, scholar) in a structured, interactive format
3. Optionally fetch and display full webpage content for deeper analysis
4. Integrate seamlessly with the existing chat and artifact workflow

### Non-Goals
- Deep webpage analysis/summarization (future enhancement)
- Automated periodic monitoring of search results
- Integration with other search engines (Bing, DuckDuckGo)

---

## Scope & Assumptions

### In Scope
- Web Search API integration with all source types (news, web, scholar-articles, scholar-author)
- Web Fetch API integration for content extraction
- New `web-search` artifact type for displaying results
- WebSearchFilters AI tool for query refinement
- WebSearch filter card UI component
- API routes for web search functionality
- Demo mode fallback when API not configured

### Assumptions
- Users have valid CrustData API tokens with web search credits
- Search queries are in English (geolocation can be customized)
- Results are displayed in a tabular format similar to people/company artifacts

### Dependencies
- Existing CrustData client infrastructure (`lib/providers/crustdata/client.ts`)
- Artifact system for content rendering
- AI tools framework for chat integration

---

## Approach

### Architecture Overview

```
User Query ("Find news about AI startups")
    ↓
Chat API + webSearchFilters Tool
    ↓
WebSearch Filters UI (optional refinement)
    ↓
/api/cerch/web-search (API route)
    ↓
CrustData Web Search Client
    ↓
web-search Artifact (results display)
```

### Component Breakdown

#### 1. CrustData Client Extensions (`lib/providers/crustdata/client.ts`)

Add new functions:
```typescript
// Web Search
export async function webSearch(params: WebSearchParams): Promise<WebSearchResult>

// Web Fetch (for content extraction)
export async function webFetch(urls: string[]): Promise<WebFetchResult[]>
```

Types:
```typescript
interface WebSearchParams {
  query: string;
  geolocation?: string;  // ISO 3166-1 alpha-2
  sources?: ('news' | 'web' | 'scholar-articles' | 'scholar-articles-enriched' | 'scholar-author')[];
  site?: string;
  startDate?: number;  // Unix timestamp
  endDate?: number;    // Unix timestamp
  fetchContent?: boolean;
}

interface WebSearchResult {
  success: boolean;
  query: string;
  results: SearchResultItem[];
  contents?: WebFetchResult[];  // If fetch_content=true
  metadata: { totalResults: number };
}

interface SearchResultItem {
  source?: string;
  title: string;
  url: string;
  snippet: string;
  position: number;
  authors?: string[];  // For scholar
}

interface WebFetchResult {
  success: boolean;
  url: string;
  timestamp: number;
  pageTitle: string;
  content: string;  // HTML content
}
```

#### 2. Web Search Artifact (`artifacts/web-search/`)

**Server Handler** (`server.ts`):
- Streams search results as CSV for tabular display
- Columns: title, url, snippet, source, position, date

**Client Renderer** (`client.tsx`):
- Reuses WebsetTable component for consistent UI
- Clickable URLs that open in new tabs
- Source badges (news/web/scholar)
- Snippet preview with expand option

#### 3. WebSearchFilters Tool (`lib/ai/tools/web-search-filters.ts`)

```typescript
export const webSearchFiltersTool = tool({
  description: 'Show a card to refine web search parameters before executing',
  parameters: z.object({
    query: z.string().describe('Initial search query'),
    suggestedSources: z.array(z.enum(['news', 'web', 'scholar-articles', 'scholar-author']))
      .optional().describe('Suggested sources based on query'),
    suggestedGeolocation: z.string().optional(),
    suggestedSite: z.string().optional(),
  }),
  execute: async ({ query, suggestedSources, suggestedGeolocation, suggestedSite }) => {
    // Return filter card data for UI rendering
  },
});
```

#### 4. API Route (`app/(chat)/api/cerch/web-search/route.ts`)

Handles:
- Authentication check
- Credit verification
- WebSearch API call via client
- Result normalization to CSV
- Document/artifact creation and persistence
- Chat message association

#### 5. Filter Card UI (`components/web-search-filters-card.tsx`)

Similar to people-filters-card:
- Query input (pre-filled from initial query)
- Source checkboxes (news, web, scholar)
- Geolocation dropdown
- Site restriction input
- Date range picker (optional)
- Fetch content toggle
- Submit/Skip buttons

#### 6. System Prompt Updates (`lib/ai/prompts.ts`)

Add web search guidance:
```
- web-search: search results from web, news, or academic sources

Selection guidelines:
- If user asks for news, articles, or recent information → use kind='web-search' with sources=['news']
- If user asks for research papers or academic work → use kind='web-search' with sources=['scholar-articles']
- If user wants general web research → use kind='web-search' with sources=['web', 'news']
```

### Data Flow

1. **User Request**: "Find recent news about OpenAI's latest releases"

2. **AI Recognizes Intent**: Web search with news source

3. **Tool Call**: `webSearchFilters({ query: "OpenAI latest releases", suggestedSources: ["news"] })`

4. **Filter Card Rendered**: User can refine or skip

5. **API Call**: POST to `/api/cerch/web-search` with final parameters

6. **CrustData Request**: POST to `/screener/web-search`

7. **Response Processing**: Normalize results to CSV format

8. **Artifact Created**: `web-search` artifact with results table

9. **Chat Updated**: Tool invocation result saved to chat history

### CSV Schema for Results

```csv
title,url,snippet,source,position,date,authors
"OpenAI Releases GPT-5","https://example.com/article","OpenAI announced their latest model...","news",1,"2025-12-20",""
```

---

## Impacted Areas

### New Files
- `lib/providers/crustdata/web-search.ts` - Web search types and utilities
- `lib/ai/tools/web-search-filters.ts` - AI tool definition
- `artifacts/web-search/server.ts` - Server handler
- `artifacts/web-search/client.tsx` - Client renderer
- `app/(chat)/api/cerch/web-search/route.ts` - API route
- `components/web-search-filters-card.tsx` - Filter UI

### Modified Files
- `lib/providers/crustdata/client.ts` - Add webSearch/webFetch functions
- `lib/ai/prompts.ts` - Add web-search artifact guidelines
- `lib/ai/tools/index.ts` - Export new tool
- `app/(chat)/api/chat/route.ts` - Register webSearchFilters tool
- `components/artifact.tsx` - Register web-search artifact kind
- `components/document.tsx` - Handle web-search tool preview
- `lib/providers/types.ts` - Add web search types

### Database
- No schema changes (uses existing Document table with kind='web-search')

---

## Risks & Mitigations

### Risk 1: API Rate Limits
- **Risk**: CrustData imposes 15 requests/minute limit
- **Mitigation**: Implement request queuing and rate limit handling in client; surface clear error messages

### Risk 2: Large Result Sets
- **Risk**: Search results could return many items, affecting performance
- **Mitigation**: Limit display to first 20 results; implement pagination

### Risk 3: Content Fetching Latency
- **Risk**: `fetch_content=true` can significantly increase response time
- **Mitigation**: Make content fetching opt-in; show loading state; consider async fetch after initial results

### Risk 4: HTML Content Size
- **Risk**: Fetched HTML can be very large
- **Mitigation**: Store truncated/cleaned content; implement on-demand full fetch

---

## Validation

### Unit Tests
- WebSearch client function tests (mock API responses)
- Filter building logic tests
- CSV normalization tests

### Integration Tests
- API route tests with mocked CrustData responses
- Artifact creation and display tests

### E2E Tests (Playwright)
- Complete flow: query → filter card → search → results display
- Demo mode fallback verification
- Error handling scenarios

### Success Criteria
1. Users can perform web searches through natural language
2. Results display in interactive table format
3. Source filtering works correctly (news/web/scholar)
4. Cached results prevent duplicate API calls
5. Demo mode works without API configuration

---

## Rollout/Rollback

### Rollout Plan
1. **Phase 1**: Core client functions + API route (internal testing)
2. **Phase 2**: Artifact handlers + filter UI (feature complete)
3. **Phase 3**: Integration with chat flow + prompt updates (user-facing)

### Feature Flag
- `ENABLE_WEB_SEARCH=true` environment variable to enable/disable feature
- Defaults to `true` when CrustData token is configured

### Rollback
- Revert prompt changes to remove web-search references
- Keep API routes but disable tool registration
- No database rollback needed

---

## Links

### API Documentation
- CrustData Web Search API: (provided in task)
- CrustData Web Fetch API: (provided in task)

### Related PRDs
- `docs/prd/people-crustdata-integration.md`
- `docs/prd/company-crustdata-integration.md`
- `docs/prd/crustdata-hardening.md`

### Related Code
- `lib/providers/crustdata/client.ts` - Existing CrustData client
- `app/(chat)/api/cerch/people/route.ts` - Pattern for API routes
- `artifacts/webset/server.ts` - Pattern for artifact handlers

---

## Implementation Checklist

- [x] Create PRD document
- [ ] Add web search types to `lib/providers/types.ts`
- [ ] Implement `webSearch()` in CrustData client
- [ ] Implement `webFetch()` in CrustData client
- [ ] Create `web-search` artifact server handler
- [ ] Create `web-search` artifact client renderer
- [ ] Create `webSearchFilters` AI tool
- [ ] Create `/api/cerch/web-search` API route
- [ ] Create `WebSearchFiltersCard` UI component
- [ ] Update system prompts with web-search guidance
- [ ] Register tool in chat route
- [ ] Add demo mode fallback
- [ ] Write tests
- [ ] Update documentation
