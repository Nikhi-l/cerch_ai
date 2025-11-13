# Cerch AI - Agentic Flow & CrustData Integration Documentation

**Version:** 1.0
**Last Updated:** 2025-11-13
**Author:** Technical Documentation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Agentic Flow - Complete Breakdown](#agentic-flow---complete-breakdown)
4. [CrustData API Integration](#crustdata-api-integration)
5. [Filter Creation Flow](#filter-creation-flow)
6. [Artifact Generation System](#artifact-generation-system)
7. [User Input Handling](#user-input-handling)
8. [Data Streaming & Event System](#data-streaming--event-system)
9. [Identified Issues & Bugs](#identified-issues--bugs)
10. [Recommendations](#recommendations)

---

## System Overview

**Cerch AI** is an AI-powered people and company discovery platform built on:
- **Framework:** Next.js 15 (App Router)
- **AI SDK:** Vercel AI SDK v4.3.13
- **LLM Provider:** OpenAI (GPT-4o-mini, o1)
- **Data Provider:** CrustData API (200M+ profiles)
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** NextAuth.js
- **Caching:** Redis (for resumable streams)

### Core Capabilities
1. **Natural Language Search** → AI parses user intent into structured filters
2. **Real-time Streaming** → Results stream incrementally to UI
3. **Artifact System** → 7 artifact types (people, company, text, code, sheet, webset, image)
4. **Multi-step Tool Execution** → AI can chain multiple tool calls (max 5 steps)
5. **Resumable Streams** → Redis-backed stream resumption on network interruptions

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERACTION                               │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     v
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHAT INTERFACE (Vercel useChat Hook)                     │
│  - Message input with attachments                                           │
│  - Real-time streaming display                                              │
│  - Artifact preview panel                                                   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     │ POST /api/chat
                                     v
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHAT API ROUTE (route.ts:67)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Authentication Check (auth())                                      │  │
│  │ 2. Rate Limiting (entitlementsByUserType)                            │  │
│  │ 3. Save User Message to DB                                           │  │
│  │ 4. Generate Stream ID (Redis-backed)                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     v
┌─────────────────────────────────────────────────────────────────────────────┐
│              VERCEL AI SDK - streamText() (route.ts:165)                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ - Model: GPT-4o-mini / o1                                            │  │
│  │ - System Prompt: artifactsPrompt + regularPrompt                     │  │
│  │ - Max Steps: 5 (multi-turn tool execution)                           │  │
│  │ - Active Tools: [peopleFilters, companyFilters, createDocument,     │  │
│  │                  updateDocument, requestSuggestions, getWeather]     │  │
│  │ - Transform: smoothStream (word-chunking)                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    v                v                v
     ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
     │ peopleFilters    │  │ companyFilters  │  │ createDocument   │
     │ Tool             │  │ Tool            │  │ Tool             │
     └────────┬─────────┘  └────────┬────────┘  └────────┬─────────┘
              │                     │                     │
              │ parsePeopleQuery()  │ parseCompanyQuery() │ generateUUID()
              │ (parse.ts:174)      │ (parse.ts:247)      │ Find handler
              v                     v                     │ by kind
     ┌──────────────────┐  ┌─────────────────┐           │
     │ Returns:         │  │ Returns:        │           │
     │ - baseQuery      │  │ - baseQuery     │           │
     │ - inferredFilters│  │ - inferredFilters│          │
     │ - limit          │  │ - limit         │           │
     └────────┬─────────┘  └────────┬────────┘           │
              │                     │                     │
              v                     v                     v
     ┌──────────────────────────────────────────────────────────────┐
     │      PeopleFiltersCard / CompanyFiltersCard Rendered         │
     │      (User can refine filters or proceed)                    │
     └────────────────────┬─────────────────────────────────────────┘
                          │
                          │ handleCerchNow() → POST /api/cerch/people
                          v
     ┌──────────────────────────────────────────────────────────────┐
     │         /api/cerch/people Route (route.ts:18)                │
     │  ┌────────────────────────────────────────────────────────┐  │
     │  │ 1. Check auth                                          │  │
     │  │ 2. Check in-memory cache                              │  │
     │  │ 3. buildPeopleSearchQuery(spec, limit)                │  │
     │  │ 4. Call crustPeopleProvider.getPeople(query)          │  │
     │  │ 5. Sort results (image-first)                         │  │
     │  │ 6. Convert to CSV                                     │  │
     │  │ 7. Save document to DB                                │  │
     │  │ 8. Cache result                                       │  │
     │  │ 9. Return { id, title, cursor, spec }                │  │
     │  └────────────────────────────────────────────────────────┘  │
     └────────────────────┬─────────────────────────────────────────┘
                          │
                          v
     ┌──────────────────────────────────────────────────────────────┐
     │              CrustData API Integration                       │
     │                                                              │
     │  POST /screener/persondb/search/                            │
     │  Body: { limit, filters: CrustFilterNode, cursor }         │
     │                                                              │
     │  CrustFilterNode Structure:                                 │
     │  {                                                           │
     │    op: 'and' | 'or',                                        │
     │    conditions: [                                            │
     │      { column: 'region', type: '(.)', value: 'SF' },      │
     │      {                                                       │
     │        op: 'or',                                            │
     │        conditions: [                                        │
     │          { column: 'current_employers.title',              │
     │            type: '(.)', value: 'Software Engineer' },      │
     │          { column: 'current_employers.title',              │
     │            type: '(.)', value: 'CTO' }                     │
     │        ]                                                    │
     │      }                                                       │
     │    ]                                                         │
     │  }                                                           │
     │                                                              │
     │  Response: { profiles: [...], next_cursor: string }        │
     └────────────────────┬─────────────────────────────────────────┘
                          │
                          │ Returns normalized data
                          v
     ┌──────────────────────────────────────────────────────────────┐
     │           aggregatePeople() (index.ts)                       │
     │  - Normalizes CrustData response                            │
     │  - Converts to Person[] type                                │
     │  - Returns { rows, nextCursor, source, creditCost }        │
     └────────────────────┬─────────────────────────────────────────┘
                          │
                          v
     ┌──────────────────────────────────────────────────────────────┐
     │      toCSV() - Convert to CSV format (normalize.ts:23)      │
     │                                                              │
     │  Headers: name, title, company, industry, location,         │
     │           linkedin_url, website, profile_image_url,         │
     │           description, tags                                 │
     └────────────────────┬─────────────────────────────────────────┘
                          │
                          │ CSV content returned to client
                          v
     ┌──────────────────────────────────────────────────────────────┐
     │              Client-Side Artifact Rendering                  │
     │                                                              │
     │  DataStreamHandler (data-stream-handler.tsx:26)             │
     │  ↓                                                           │
     │  Processes stream events:                                    │
     │  - 'id' → Set documentId                                    │
     │  - 'title' → Set artifact title                            │
     │  - 'kind' → Set artifact type (people/company/etc)         │
     │  - 'clear' → Clear existing content                        │
     │  - 'sheet-delta' → Append CSV rows                         │
     │  - 'status' → Show status message                          │
     │  - 'error' → Display error                                 │
     │  - 'finish' → Mark as complete                             │
     │  ↓                                                           │
     │  Updates useArtifact hook state                             │
     │  ↓                                                           │
     │  WebsetTable component renders CSV as data grid            │
     │  - Sortable columns                                         │
     │  - Auto-hide empty columns                                  │
     │  - LinkedIn profile links                                   │
     │  - "Load More" button (if cursor available)                │
     └──────────────────────────────────────────────────────────────┘
```

---

## Agentic Flow - Complete Breakdown

### Phase 1: User Message Ingestion

**File:** `app/(chat)/api/chat/route.ts:67`

```typescript
1. Request arrives at POST /api/chat
2. Parse request body (validate with Zod schema)
3. Extract: { id, message, selectedChatModel, selectedVisibilityType, apiKey }
4. Authenticate user session (await auth())
5. Check rate limits:
   - Get messageCount in last 24 hours
   - Compare against entitlementsByUserType[userType].maxMessagesPerDay
   - Return 429 if exceeded
6. Check if chat exists:
   - If not: generateTitleFromUserMessage() → saveChat()
   - If yes: verify userId matches (authorization)
7. Load previous messages: getMessagesByChatId({ id })
8. Append new user message to messages array
9. Save user message to database
10. Generate streamId for resumable streams
```

### Phase 2: AI Tool Execution Loop

**File:** `app/(chat)/api/chat/route.ts:163-249`

```typescript
const stream = createDataStream({
  execute: (dataStream) => {
    const result = streamText({
      model: provider.languageModel(selectedChatModel),
      system: systemPrompt({ selectedChatModel, requestHints }),
      messages,
      maxSteps: 5,  // ⚠️ KEY: Multi-step execution
      experimental_activeTools: [
        'peopleFilters',
        'companyFilters',
        'createDocument',
        'updateDocument',
        'requestSuggestions',
        'getWeather',
        'gmailQuery',
      ],
      tools: { /* tool implementations */ },
      onFinish: async ({ response }) => {
        // Save assistant message to DB
      },
    });
  }
});
```

**System Prompt Injection:**
```typescript
// lib/ai/prompts.ts:67
export const systemPrompt = ({ selectedChatModel, requestHints }) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  if (selectedChatModel === 'chat-model-reasoning') {
    return `${regularPrompt}\n\n${requestPrompt}`;
  } else {
    return `${regularPrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
  }
};
```

**Key Instructions in artifactsPrompt:**
- Use `peopleFilters` tool first for people queries
- Use `companyFilters` tool first for company queries
- Call `createDocument` ONCE after filters are confirmed
- Choose correct artifact kind (people/company/webset/sheet/text/code/image)
- Keep responses concise

### Phase 3: Tool Invocation - `peopleFilters`

**File:** `lib/ai/tools/people-filters.ts:5`

```typescript
export const peopleFiltersTool = tool({
  description: 'Present a minimal UI card to refine People discovery filters',
  parameters: z.object({
    initialQuery: z.string().describe('User intent or query'),
  }),
  execute: async ({ initialQuery }) => {
    const inferred = parsePeopleQuery(initialQuery, 50);
    return {
      baseQuery: initialQuery,
      inferredFilters: inferred.filters || {},
      hint: { ...inferredFilters },
      limit: inferred.limit || 50,
    };
  },
});
```

**Query Parsing Logic (`lib/providers/parse.ts:174`):**
```typescript
export function parsePeopleQuery(text: string, limit = 50): SearchQuery {
  const filters: Record<string, string | number | boolean> = {};

  // Extract region (captureRegion)
  // Pattern: "in San Francisco", "based in NYC"
  const region = captureRegion(text);
  if (region) filters.region = region;

  // Extract titles (extractTitleCandidates)
  // Matches: "Software Engineer", "CTO", "Head of Engineering"
  const titles = extractTitleCandidates(text);
  if (titles.length) filters.title = titles[0];

  // Extract company (inferCompany)
  // Pattern: "at Google", "Google employees"
  const company = inferCompany(text);
  if (company) filters.company = company;

  // Extract industry (extractIndustry)
  // Keywords: AI, FinTech, Healthcare, etc.
  const industry = extractIndustry(text);
  if (industry) filters.industry = industry;

  // Extract skills (extractSkills)
  // Keywords: AR/VR, Machine Learning, Computer Vision
  const skills = extractSkills(text);
  if (skills.length) filters.skills = skills.join(', ');

  // Extract languages (extractLanguages)
  // Keywords: English, Spanish, French, etc.
  const languages = extractLanguages(text);
  if (languages.length) filters.languages = languages.join(', ');

  return {
    q: text,
    filters: Object.keys(filters).length ? filters : undefined,
    limit,
  };
}
```

**Tool Return Value:**
```json
{
  "baseQuery": "software engineers in San Francisco with AR/VR experience",
  "inferredFilters": {
    "region": "San Francisco Bay Area",
    "title": "Software Engineer",
    "skills": "AR/VR, Augmented Reality, Virtual Reality"
  },
  "limit": 50
}
```

### Phase 4: Filter Card Rendering

**File:** `components/people-filters-card.tsx:25`

```typescript
export function PeopleFiltersCard({ chatId, preset, append, setMessages }) {
  // Initialize state from preset.inferredFilters
  const [region, setRegion] = useState(preset?.inferredFilters?.region || '');
  const [title, setTitle] = useState(preset?.inferredFilters?.title || '');
  const [industry, setIndustry] = useState(preset?.inferredFilters?.industry || '');
  const [company, setCompany] = useState(preset?.inferredFilters?.company || '');
  const [skills, setSkills] = useState(preset?.inferredFilters?.skills || '');
  const [languages, setLanguages] = useState(preset?.inferredFilters?.languages || '');
  const [minConnections, setMinConnections] = useState(preset?.inferredFilters?.min_connections || '');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [sizeMin, setSizeMin] = useState(preset?.inferredFilters?.employer_size_min || '');
  const [sizeMax, setSizeMax] = useState(preset?.inferredFilters?.employer_size_max || '');

  // ... UI form inputs ...

  const handleCerchNow = async (mode: 'custom' | 'auto') => {
    const res = await fetch('/api/cerch/people', {
      method: 'POST',
      body: JSON.stringify({
        chatId,
        baseQuery,
        title: peopleTitle,  // "People search — title: SWE; region: SF"
        filters: mode === 'custom'
          ? { region, title, industry, company, skills, languages, minConnections, yearsOfExperience, sizeMin, sizeMax }
          : preset?.inferredFilters || {},
      }),
    });

    const json = await res.json();

    // Update artifact state
    setArtifact({
      documentId: json.id,
      kind: 'people',
      title: json.title,
      content: '',
      isVisible: true,
    });

    // Save pagination metadata
    setMetadata({ cursor: json.cursor, spec: json.spec, limit: 50 });
  };
}
```

**User Options:**
1. **Search with custom filters** → User-edited filter values
2. **Search with automated filters** → AI-inferred values (no edits)

### Phase 5: People Search API Route

**File:** `app/(chat)/api/cerch/people/route.ts:18`

```typescript
export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json();
  const { chatId, baseQuery, title, filters } = body;

  // 1. Check in-memory cache
  const cacheKey = `${session.user.id}|${title}|${JSON.stringify(spec)}|50`;
  const cached = peopleCache.get(cacheKey);
  if (cached) {
    return Response.json({ ok: true, id: cached.id, title: cached.title, cursor: cached.cursor });
  }

  // 2. Build CrustData query
  const spec: PeopleFilterSpec = {
    region: filters?.region,
    title: filters?.title,
    company: filters?.company,
    skills: filters?.skills,
    languages: filters?.languages,
    minConnections: filters?.minConnections,
    experienceBucket: filters?.yearsOfExperience,
    employerSizeMin: filters?.sizeMin,
    employerSizeMax: filters?.sizeMax,
    industry: filters?.industry,
  };
  const query = buildPeopleSearchQuery(spec, 50, baseQuery);

  // 3. Call CrustData API
  const result = await crustPeopleProvider.getPeople(query);

  // 4. Sort results (images first)
  const sortedRows = sortPeopleByImage(result.rows);

  // 5. Convert to CSV
  const csv = toCSV(headers, sortedRows);

  // 6. Save to database
  const id = generateUUID();
  await saveDocument({ id, title, content: csv, kind: 'people', userId: session.user.id });

  // 7. Cache result
  peopleCache.set(cacheKey, { id, title, cursor: result.nextCursor, spec, savedAt: Date.now() });

  // 8. Save assistant message (for chat history)
  await saveMessages([{
    chatId,
    role: 'assistant',
    parts: [{
      type: 'tool-invocation',
      toolInvocation: {
        toolName: 'createDocument',
        state: 'result',
        result: { id, title, kind: 'people' },
      },
    }],
  }]);

  return Response.json({ ok: true, id, title, cursor: result.nextCursor, spec });
}
```

### Phase 6: Alternative Flow - `createDocument` Tool

**File:** `lib/ai/tools/create-document.ts:16`

```typescript
export const createDocument = ({ session, dataStream, apiKey }) =>
  tool({
    description: 'Create a document for writing or content creation',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),  // people, company, text, code, etc.
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();

      // Find handler for this artifact kind
      const documentHandler = documentHandlersByArtifactKind.find(
        (handler) => handler.kind === kind,
      );

      // Stream metadata events
      dataStream.writeData({ type: 'kind', content: kind });
      dataStream.writeData({ type: 'id', content: id });
      dataStream.writeData({ type: 'title', content: title });
      dataStream.writeData({ type: 'clear', content: '' });

      // Delegate to handler
      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        apiKey,
      });

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
```

### Phase 7: People Document Handler

**File:** `artifacts/people/server.ts:15`

```typescript
export const peopleDocumentHandler = createDocumentHandler<'people'>({
  kind: 'people',

  onCreateDocument: async ({ title, dataStream }) => {
    // 1. Parse title for filters
    dataStream.writeData({ type: 'status', content: 'Parsing filters…' });
    const query = await buildPeopleQuery(title, 50);

    // 2. Check API configuration
    if (!(await isCrustConfigured())) {
      dataStream.writeData({ type: 'error', content: 'API not configured' });
      return toCSV(headers, []);
    }

    // 3. Execute search
    dataStream.writeData({ type: 'status', content: 'Searching 200M+ profiles…' });
    const result = await aggregatePeople(query, [crustPeopleProvider]);

    // 4. Check for empty results
    if (result.rows.length === 0) {
      const message = 'No people matched your filters. Try loosening criteria.';
      dataStream.writeData({ type: 'error', content: message });
      throw new Error(message);
    }

    dataStream.writeData({
      type: 'status',
      content: `Found ${result.rows.length} profiles. Preparing…`,
    });

    // 5. Convert to CSV
    const csv = toCSV(headers, result.rows);

    // 6. Stream CSV to client
    dataStream.writeData({ type: 'sheet-delta', content: csv });

    return csv;
  },
});
```

---

## CrustData API Integration

### Client Implementation

**File:** `lib/providers/crustdata/client.ts`

**Base Configuration:**
```typescript
const CRUSTDATA_BASE = 'https://api.crustdata.com/screener';
const PEOPLE_PATH = '/persondb/search/';
const COMPANY_PATH = '/company/search';

// Token resolution order:
// 1. crustdata_api_token cookie
// 2. CRUSTDATA_API_TOKEN env variable
async function crustPost<T>(path: string, body: any): Promise<T> {
  const token = cookies().get('crustdata_api_token')?.value || process.env.CRUSTDATA_API_TOKEN;

  if (!token) {
    throw new CrustdataError('CRUSTDATA_API_TOKEN not configured', 401);
  }

  const res = await fetch(`${CRUSTDATA_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new CrustdataError(`CrustData API error: ${res.statusText}`, res.status);
  }

  return res.json();
}
```

### People Provider

**File:** `lib/providers/crustdata/client.ts`

```typescript
export const crustPeopleProvider: PeopleProvider = {
  async getPeople(query: SearchQuery): Promise<ProviderResult<Person>> {
    const payload = {
      limit: query.limit ?? 50,
      filters: query.filters,  // CrustFilterNode structure
      cursor: query.cursor,
    };

    const json = await crustPost<any>(PEOPLE_PATH, payload);

    // Normalize profiles
    const rows = normalizePeopleRows(json.profiles || []);

    return {
      rows,
      nextCursor: json.next_cursor ?? null,
      source: 'crustdata',
      creditCost: { provider: 'crustdata', estimated: 0 }
    };
  }
};
```

### Filter Structure

**Type Definition:**
```typescript
export type CrustFilterCondition = {
  column: string;
  type: '=' | '!=' | 'in' | 'not_in' | '>' | '<' | '=>' | '=<' | '(.)';
  value: string | number | boolean | Array<string | number | boolean>;
};

export type CrustFilterGroup = {
  op: 'and' | 'or';
  conditions: CrustFilterNode[];
};

export type CrustFilterNode = CrustFilterCondition | CrustFilterGroup;
```

**Example Query:**
```json
{
  "limit": 50,
  "cursor": null,
  "filters": {
    "op": "and",
    "conditions": [
      {
        "op": "or",
        "conditions": [
          {
            "column": "current_employers.title",
            "type": "(.)",
            "value": "Software Engineer"
          },
          {
            "column": "current_employers.title",
            "type": "(.)",
            "value": "Senior Software Engineer"
          }
        ]
      },
      {
        "column": "region",
        "type": "(.)",
        "value": "San Francisco Bay Area"
      },
      {
        "column": "languages",
        "type": "in",
        "value": ["English", "Spanish"]
      },
      {
        "column": "num_of_connections",
        "type": "=>",
        "value": 500
      }
    ]
  }
}
```

### Filter Column Mapping

**File:** `lib/providers/crustdata/people-filters.ts`

| User Filter | CrustData Column | Operator | Example Value |
|------------|------------------|----------|---------------|
| `region` | `region` | `(.)` (fuzzy) | "San Francisco Bay Area" |
| `title` | `current_employers.title` | `(.)` | "Software Engineer" |
| `company` | `current_employers.name` | `(.)` | "Google" |
| `industry` | `all_employers.company_industries` | `(.)` | "Artificial Intelligence" |
| `skills` | `skills` | `(.)` | "Machine Learning, AR/VR" |
| `languages` | `languages` | `in` | ["English", "Spanish"] |
| `minConnections` | `num_of_connections` | `=>` | 500 |
| `experienceBucket` | `years_of_experience_raw` | `=>` | 5 |
| `employerSizeMin` | `current_employers.company_headcount_latest` | `=>` | 50 |
| `employerSizeMax` | `current_employers.company_headcount_latest` | `=<` | 1000 |

**Experience Bucket Mapping:**
```typescript
const experienceBucketToMinYears: Record<string, number> = {
  'Less than 1 year': 0,
  '1 to 2 years': 1,
  '3 to 5 years': 3,
  '6 to 10 years': 6,
  'More than 10 years': 10,
};
```

### Pagination

**Cursor-based Pagination:**
```typescript
// Initial request
const result = await crustPeopleProvider.getPeople({ limit: 50, filters: {...} });
// result.nextCursor = "eyJza2lwIjo1MCwibGltaXQiOjUwfQ=="

// Next page
const nextPage = await crustPeopleProvider.getPeople({
  limit: 50,
  filters: {...},
  cursor: result.nextCursor
});
```

**Load More Implementation:**
```typescript
// components/people-filters-card.tsx:152
const meta = { cursor: json.cursor ?? null, spec: json.spec, limit: 50 };
setMetadata(meta);

// When "Load More" is clicked
const handleLoadMore = async () => {
  const res = await fetch('/api/cerch/people/next', {
    method: 'POST',
    body: JSON.stringify({ documentId, cursor: metadata.cursor, spec: metadata.spec }),
  });
  const { csv, cursor: nextCursor } = await res.json();
  // Append new rows to existing CSV
  setArtifact((draft) => ({ ...draft, content: draft.content + '\n' + csv }));
  setMetadata({ ...metadata, cursor: nextCursor });
};
```

---

## Filter Creation Flow

### Natural Language → Structured Filters

**Step-by-Step Breakdown:**

#### Step 1: User Input
```
"Find software engineers in San Francisco with AR/VR experience"
```

#### Step 2: AI Invokes `peopleFilters` Tool
```typescript
peopleFiltersTool.execute({ initialQuery: "Find software engineers in San Francisco with AR/VR experience" })
```

#### Step 3: Query Parsing (`parsePeopleQuery`)

```typescript
// lib/providers/parse.ts:174

export function parsePeopleQuery(text: string, limit = 50): SearchQuery {
  const filters = {};

  // 1. Extract Region
  // Pattern: /\b(?:in|within|based in)\s+([A-Za-z][A-Za-z\s&.'-]{2,})/i
  const region = captureRegion(text);
  // Result: "San Francisco Bay Area" (matched "in San Francisco")
  filters.region = region;

  // 2. Extract Titles
  // Pattern: /([A-Za-z0-9+/&'\- ]{2,})\s+(developer|engineer|specialist|...)/gi
  const titles = extractTitleCandidates(text);
  // Result: ["Software Engineer"]
  filters.title = titles[0];

  // 3. Extract Skills
  // Keywords: AR/VR, Machine Learning, Computer Vision, etc.
  const skills = extractSkills(text);
  // Result: ["AR/VR", "Augmented Reality", "Virtual Reality"]
  filters.skills = skills.join(', ');

  return {
    q: text,
    filters,
    limit: 50,
  };
}
```

**Result:**
```json
{
  "q": "Find software engineers in San Francisco with AR/VR experience",
  "filters": {
    "region": "San Francisco Bay Area",
    "title": "Software Engineer",
    "skills": "AR/VR, Augmented Reality, Virtual Reality"
  },
  "limit": 50
}
```

#### Step 4: Filter Card Display

User sees pre-filled form:
- **Region:** San Francisco Bay Area
- **Title:** Software Engineer
- **Skills:** AR/VR, Augmented Reality, Virtual Reality

User can:
1. Edit any field
2. Add more filters (industry, company, languages, etc.)
3. Click "Search with custom filters" (uses edited values)
4. Click "Search with automated filters" (uses AI-inferred values)

#### Step 5: Convert to CrustData Filter Structure

**File:** `lib/providers/crustdata/people-filters.ts`

```typescript
export function buildPeopleSearchQuery(
  spec: PeopleFilterSpec,
  limit: number,
  baseQuery?: string,
): SearchQuery {
  const conditions: CrustFilterNode[] = [];

  // Region filter
  if (spec.region) {
    conditions.push({
      column: 'region',
      type: '(.)',  // Fuzzy match
      value: spec.region,
    });
  }

  // Title filter (supports multiple titles with OR)
  if (spec.title) {
    const titleParts = spec.title.split(/[,|;]/).map(t => t.trim()).filter(Boolean);
    if (titleParts.length === 1) {
      conditions.push({
        column: 'current_employers.title',
        type: '(.)',
        value: titleParts[0],
      });
    } else {
      conditions.push({
        op: 'or',
        conditions: titleParts.map(t => ({
          column: 'current_employers.title',
          type: '(.)',
          value: t,
        })),
      });
    }
  }

  // Skills filter
  if (spec.skills) {
    const skillParts = spec.skills.split(',').map(s => s.trim());
    conditions.push({
      op: 'or',
      conditions: skillParts.map(skill => ({
        column: 'skills',
        type: '(.)',
        value: skill,
      })),
    });
  }

  // Languages filter
  if (spec.languages) {
    const langs = spec.languages.split(',').map(l => l.trim());
    conditions.push({
      column: 'languages',
      type: 'in',
      value: langs,
    });
  }

  // Min connections filter
  if (spec.minConnections) {
    conditions.push({
      column: 'num_of_connections',
      type: '=>',
      value: Number(spec.minConnections),
    });
  }

  // Experience filter
  if (spec.experienceBucket) {
    const minYears = experienceBucketToMinYears[spec.experienceBucket];
    conditions.push({
      column: 'years_of_experience_raw',
      type: '=>',
      value: minYears,
    });
  }

  // Employer size filter
  if (spec.employerSizeMin || spec.employerSizeMax) {
    const sizeConditions = [];
    if (spec.employerSizeMin) {
      sizeConditions.push({
        column: 'current_employers.company_headcount_latest',
        type: '=>',
        value: Number(spec.employerSizeMin),
      });
    }
    if (spec.employerSizeMax) {
      sizeConditions.push({
        column: 'current_employers.company_headcount_latest',
        type: '=<',
        value: Number(spec.employerSizeMax),
      });
    }
    conditions.push(...sizeConditions);
  }

  // Industry filter
  if (spec.industry) {
    conditions.push({
      column: 'all_employers.company_industries',
      type: '(.)',
      value: spec.industry,
    });
  }

  // Combine all conditions with AND
  const filters: CrustFilterNode = {
    op: 'and',
    conditions,
  };

  return {
    q: baseQuery || '',
    filters,
    limit,
  };
}
```

**Final CrustData Query:**
```json
{
  "limit": 50,
  "filters": {
    "op": "and",
    "conditions": [
      {
        "column": "region",
        "type": "(.)",
        "value": "San Francisco Bay Area"
      },
      {
        "column": "current_employers.title",
        "type": "(.)",
        "value": "Software Engineer"
      },
      {
        "op": "or",
        "conditions": [
          { "column": "skills", "type": "(.)", "value": "AR/VR" },
          { "column": "skills", "type": "(.)", "value": "Augmented Reality" },
          { "column": "skills", "type": "(.)", "value": "Virtual Reality" }
        ]
      }
    ]
  }
}
```

---

## Artifact Generation System

### Artifact Types

1. **people** - People profiles (CSV)
2. **company** - Company profiles (CSV)
3. **webset** - Mixed people + company data (CSV)
4. **sheet** - Generic spreadsheets (CSV)
5. **text** - Text documents (Markdown)
6. **code** - Code snippets (Python)
7. **image** - Generated images (URL)

### Artifact Handler Registration

**File:** `lib/artifacts/server.ts`

```typescript
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
  codeDocumentHandler,
  imageDocumentHandler,
  sheetDocumentHandler,
  websetDocumentHandler,
  peopleDocumentHandler,
  companyDocumentHandler,
];
```

### Handler Interface

```typescript
interface DocumentHandler<T extends ArtifactKind = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: {
    id: string;
    title: string;
    dataStream: DataStreamWriter;
    session: Session;
    apiKey?: string;
  }) => Promise<string>;
  onUpdateDocument?: (args: {
    document: Document;
    description: string;
    dataStream: DataStreamWriter;
    session: Session;
    apiKey?: string;
  }) => Promise<string>;
}
```

### People Artifact - Full Flow

**Server-Side Handler:** `artifacts/people/server.ts`

```typescript
export const peopleDocumentHandler = createDocumentHandler<'people'>({
  kind: 'people',

  onCreateDocument: async ({ title, dataStream }) => {
    // Step 1: Parse query
    dataStream.writeData({ type: 'status', content: 'Parsing filters…' });
    const query = await buildPeopleQuery(title, 50);

    // Step 2: Check API config
    if (!(await isCrustConfigured())) {
      dataStream.writeData({ type: 'error', content: 'API not configured' });
      return toCSV(headers, []);
    }

    // Step 3: Execute search
    dataStream.writeData({ type: 'status', content: 'Searching 200M+ profiles…' });
    const result = await aggregatePeople(query, [crustPeopleProvider]);

    // Step 4: Validate results
    if (result.rows.length === 0) {
      dataStream.writeData({ type: 'error', content: 'No matches found' });
      throw new Error('No matches');
    }

    dataStream.writeData({
      type: 'status',
      content: `Found ${result.rows.length} profiles. Preparing…`,
    });

    // Step 5: Convert to CSV
    const headers = [
      'name', 'title', 'company', 'industry', 'location',
      'linkedin_url', 'website', 'profile_image_url', 'description', 'tags'
    ];
    const csv = toCSV(headers, result.rows);

    // Step 6: Stream to client
    dataStream.writeData({ type: 'sheet-delta', content: csv });

    return csv;
  },
});
```

**Client-Side Renderer:** `artifacts/people/client.tsx`

```typescript
export const peopleArtifact = new Artifact<'people', Metadata>({
  kind: 'people',

  onStreamPart: ({ setArtifact, setMetadata, streamPart }) => {
    switch (streamPart.type) {
      case 'sheet-delta':
        setArtifact((draft) => ({
          ...draft,
          content: streamPart.content as string,
          isVisible: true,
          status: 'streaming',
        }));
        break;

      case 'status':
        // Show status message in UI
        console.log('Status:', streamPart.content);
        break;

      case 'error':
        // Display error to user
        console.error('Error:', streamPart.content);
        break;

      case 'finish':
        setArtifact((draft) => ({ ...draft, status: 'idle' }));
        break;
    }
  },

  content: ({ content, status, metadata, onSaveContent }) => (
    <WebsetTable
      csv={content}
      variant="people"
      autoHideEmptyColumns
      hideImageUrlColumns
      onLoadMore={metadata?.cursor ? handleLoadMore : undefined}
      onSaveContent={onSaveContent}
    />
  ),

  actions: [
    // Copy action
    {
      icon: Copy,
      label: 'Copy',
      onClick: () => navigator.clipboard.writeText(content),
    },
    // Undo/Redo actions
    // ...
  ],
});
```

### Data Stream Events

**Event Types:**

| Event Type | Purpose | Content | Example |
|-----------|---------|---------|---------|
| `id` | Set document ID | UUID string | `"550e8400-e29b-41d4-a716-446655440000"` |
| `title` | Set artifact title | String | `"People search — title: SWE; region: SF"` |
| `kind` | Set artifact type | ArtifactKind | `"people"` |
| `clear` | Clear existing content | Empty string | `""` |
| `text-delta` | Append text content | String chunk | `"# Heading\n\nParagraph text"` |
| `code-delta` | Append code content | Code string | `"def factorial(n):\n    return n * factorial(n-1)"` |
| `sheet-delta` | Set CSV content | Full CSV | `"name,title,company\nJohn,CEO,Acme"` |
| `status` | Show status message | Status text | `"Searching 200M+ profiles…"` |
| `error` | Display error | Error message | `"No matches found. Try widening filters."` |
| `finish` | Mark complete | Empty string | `""` |

**Event Sequence Example:**
```typescript
// Server-side streaming
dataStream.writeData({ type: 'kind', content: 'people' });
dataStream.writeData({ type: 'id', content: '550e8400-...' });
dataStream.writeData({ type: 'title', content: 'Software Engineers in SF' });
dataStream.writeData({ type: 'clear', content: '' });
dataStream.writeData({ type: 'status', content: 'Parsing filters…' });
dataStream.writeData({ type: 'status', content: 'Searching profiles…' });
dataStream.writeData({ type: 'sheet-delta', content: 'name,title,...\nJohn,SWE,...' });
dataStream.writeData({ type: 'finish', content: '' });
```

---

## User Input Handling

### Input Flow Diagram

```
User Types in Chat
        ↓
┌───────────────────────────────────────┐
│  MultimodalInput Component            │
│  - Text input with attachments        │
│  - Mentions (@)                        │
│  - File uploads                        │
└────────────────┬──────────────────────┘
                 │
                 │ handleSubmit()
                 ↓
┌───────────────────────────────────────┐
│  useChat Hook (Vercel AI SDK)         │
│  - Optimistic message append          │
│  - POST /api/chat                     │
└────────────────┬──────────────────────┘
                 │
                 ↓
┌───────────────────────────────────────┐
│  Chat API Route                       │
│  - Auth check                         │
│  - Rate limit                         │
│  - Save message to DB                 │
│  - Stream AI response                 │
└────────────────┬──────────────────────┘
                 │
                 ↓
┌───────────────────────────────────────┐
│  AI Decides Action                    │
│  - Call peopleFilters tool?           │
│  - Call createDocument tool?          │
│  - Respond with text?                 │
└────────────────┬──────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
     v                       v
┌─────────────┐    ┌─────────────────┐
│ Tool Call   │    │ Text Response   │
└──────┬──────┘    └────────┬────────┘
       │                    │
       v                    v
┌─────────────┐    ┌─────────────────┐
│ Filter Card │    │ Chat Message    │
│ Rendered    │    │ Displayed       │
└──────┬──────┘    └─────────────────┘
       │
       │ User clicks "Search"
       ↓
┌───────────────────────────────────────┐
│  POST /api/cerch/people               │
│  - Build filters                      │
│  - Call CrustData API                 │
│  - Save document                      │
│  - Return artifact metadata           │
└────────────────┬──────────────────────┘
                 │
                 ↓
┌───────────────────────────────────────┐
│  Artifact Rendered                    │
│  - WebsetTable with CSV data          │
│  - Sortable columns                   │
│  - Load More button                   │
└───────────────────────────────────────┘
```

### Filter Input Validation

**Current State:** ⚠️ **Minimal validation** - Users can enter invalid data

**What's Missing:**
1. **No format validation** - Users can enter "abc" for minConnections (expects number)
2. **No range validation** - sizeMin can be > sizeMax
3. **No API feedback** - Invalid region names fail silently at API level
4. **No autocomplete** - No suggestions for regions, industries, or companies

**Recommended Validation:**

```typescript
// Example validation logic (NOT currently implemented)

const validateFilters = (filters: PeopleFilterSpec): ValidationResult => {
  const errors: string[] = [];

  // Validate minConnections
  if (filters.minConnections && isNaN(Number(filters.minConnections))) {
    errors.push('Min connections must be a number');
  }

  // Validate size range
  if (filters.employerSizeMin && filters.employerSizeMax) {
    if (Number(filters.employerSizeMin) > Number(filters.employerSizeMax)) {
      errors.push('Min size cannot be greater than max size');
    }
  }

  // Validate region format
  if (filters.region && filters.region.length < 3) {
    errors.push('Region must be at least 3 characters');
  }

  return { valid: errors.length === 0, errors };
};
```

---

## Data Streaming & Event System

### Stream Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Server-Side                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  streamText() - Vercel AI SDK                         │ │
│  │  - LLM response streaming                              │ │
│  │  - Tool execution                                      │ │
│  │  - smoothStream({ chunking: 'word' })                 │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   v                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  createDataStream() - Custom events                   │ │
│  │  - dataStream.writeData({ type, content })           │ │
│  │  - Mixed LLM + custom event stream                    │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   v                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  resumableStream() - Redis-backed                     │ │
│  │  - Persists stream state                              │ │
│  │  - Allows resume on disconnect                        │ │
│  │  - TTL: auto-cleanup after completion                 │ │
│  └────────────────┬───────────────────────────────────────┘ │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ HTTP Response (SSE-like)
                    v
┌──────────────────────────────────────────────────────────────┐
│                      Client-Side                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useChat() - Vercel AI SDK                            │ │
│  │  - messages: UIMessage[]                              │ │
│  │  - data: DataStreamDelta[]                            │ │
│  │  - isLoading: boolean                                 │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   v                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  DataStreamHandler Component                          │ │
│  │  - Processes data stream events                        │ │
│  │  - Routes to artifact handlers                        │ │
│  │  - Updates useArtifact state                          │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   v                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Artifact Renderer                                     │ │
│  │  - WebsetTable (for people/company)                   │ │
│  │  - CodeBlock (for code)                               │ │
│  │  - Markdown (for text)                                │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Stream Event Processing

**File:** `components/data-stream-handler.tsx:26`

```typescript
export function DataStreamHandler({ id }: { id: string }) {
  const { data: dataStream } = useChat({ id });
  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) return;

    // Process only new events
    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    let currentKind: ArtifactKind = artifact.kind;

    newDeltas.forEach((delta: DataStreamDelta) => {
      // Update core artifact state
      setArtifact((draftArtifact) => {
        switch (delta.type) {
          case 'id':
            return { ...draftArtifact, documentId: delta.content, status: 'streaming' };
          case 'title':
            return { ...draftArtifact, title: delta.content, status: 'streaming' };
          case 'kind':
            return { ...draftArtifact, kind: delta.content, status: 'streaming' };
          case 'clear':
            return { ...draftArtifact, content: '', status: 'streaming' };
          case 'finish':
            return { ...draftArtifact, status: 'idle' };
          default:
            return draftArtifact;
        }
      });

      // Track current kind for routing
      if (delta.type === 'kind') {
        currentKind = delta.content as ArtifactKind;
      }

      // Route to artifact-specific handler
      const artifactDefinition = artifactDefinitions.find(
        (def) => def.kind === currentKind,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }
    });
  }, [dataStream, setArtifact, setMetadata, artifact]);

  return null;
}
```

### Resumable Streams

**Purpose:** Handle network interruptions without losing progress

**Implementation:** `app/(chat)/api/chat/route.ts:45-65`

```typescript
let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,  // Next.js after() for background tasks
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log('Resumable streams disabled (no Redis)');
      }
    }
  }
  return globalStreamContext;
}

// In POST handler:
const streamId = generateUUID();
await createStreamId({ streamId, chatId: id });

const stream = createDataStream({ execute: (dataStream) => { /* ... */ } });
const streamContext = getStreamContext();

if (streamContext) {
  return new Response(
    await streamContext.resumableStream(streamId, () => stream),
  );
} else {
  return new Response(stream);  // Fallback: non-resumable
}
```

**Resume Logic:** `GET /api/chat?chatId=X`

```typescript
export async function GET(request: Request) {
  const streamContext = getStreamContext();
  if (!streamContext) return new Response(null, { status: 204 });

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  const streamIds = await getStreamIdsByChatId({ chatId });
  const recentStreamId = streamIds.at(-1);

  // Attempt to resume stream
  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  // If stream completed, restore last message
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (mostRecentMessage?.role === 'assistant') {
      const messageCreatedAt = new Date(mostRecentMessage.createdAt);
      if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) < 15) {
        // Restore completed message
        const restoredStream = createDataStream({
          execute: (buffer) => {
            buffer.writeData({
              type: 'append-message',
              message: JSON.stringify(mostRecentMessage),
            });
          },
        });
        return new Response(restoredStream, { status: 200 });
      }
    }
  }

  return new Response(stream, { status: 200 });
}
```

---

## Identified Issues & Bugs

### 1. **Filter Handling Issues**

#### 1.1 **Inconsistent Filter Parsing**
**Location:** `lib/providers/parse.ts:174`

**Problem:**
```typescript
// Title parsing is too greedy
const titles = extractTitleCandidates(normalizedText);
if (titles.length) {
  filters.title = titles[0];  // ⚠️ Only takes first title, ignores others
}
```

**Impact:**
- Query "software engineers and CTOs" → only extracts "Software Engineer"
- Multiple titles are parsed but discarded

**Fix:**
```typescript
// Should join multiple titles
if (titles.length) {
  filters.title = titles.join(' | ');  // Support multiple titles
}
```

#### 1.2 **No Validation on Filter Inputs**
**Location:** `components/people-filters-card.tsx:96`

**Problem:**
```typescript
const handleCerchNow = async (mode: 'custom' | 'auto') => {
  // ⚠️ No validation before API call
  const res = await fetch('/api/cerch/people', {
    body: JSON.stringify({ filters: { region, title, /* ... */ } }),
  });
};
```

**Impact:**
- Invalid inputs reach API (e.g., "abc" for minConnections)
- API errors are not user-friendly
- No autocomplete for regions (users may misspell)

**Fix:**
```typescript
const handleCerchNow = async (mode: 'custom' | 'auto') => {
  // Validate inputs
  const validation = validateFilters({ region, title, /* ... */ });
  if (!validation.valid) {
    setErrorText(validation.errors.join('; '));
    return;
  }
  // ... proceed with fetch
};
```

#### 1.3 **Company Filters Less Sophisticated**
**Location:** `lib/providers/crustdata/company-filters.ts`

**Problem:**
- People filters support 10+ fields
- Company filters only support 5 fields: industry, region, size, year founded
- No support for company skills, funding stage, revenue, etc.
- Company filters card missing "custom/auto" mode

**Fix:**
- Add more filter fields to match people parity
- Implement dual-mode search for companies

### 2. **Artifact Handling Issues**

#### 2.1 **In-Memory Cache Not Scalable**
**Location:** `app/(chat)/api/cerch/people/route.ts:16`

**Problem:**
```typescript
// ⚠️ In-memory cache on server
const peopleCache = new Map<string, { id, title, cursor, spec, savedAt }>();
```

**Impact:**
- Cache is lost on serverless function cold starts
- No TTL on entries (memory leak risk)
- Cache not shared across multiple server instances
- Cache keys don't consider API token changes

**Fix:**
```typescript
// Use Redis with TTL
import { redis } from '@/lib/redis';

const getCachedResult = async (cacheKey: string) => {
  return await redis.get(cacheKey);
};

const setCachedResult = async (cacheKey: string, data: any) => {
  await redis.setex(cacheKey, 3600, JSON.stringify(data));  // 1 hour TTL
};
```

#### 2.2 **Sheet-Delta Replaces Instead of Appends**
**Location:** `artifacts/people/client.tsx`

**Problem:**
```typescript
onStreamPart: ({ setArtifact, streamPart }) => {
  if (streamPart.type === 'sheet-delta') {
    setArtifact((draft) => ({
      ...draft,
      content: streamPart.content as string,  // ⚠️ Replaces entire content
    }));
  }
}
```

**Impact:**
- If multiple `sheet-delta` events are sent, only the last one is shown
- Should append rows instead of replacing

**Expected Behavior:**
- First `sheet-delta` → Set full CSV (headers + initial rows)
- Subsequent `sheet-delta` → Append new rows only

**Fix:**
```typescript
onStreamPart: ({ setArtifact, streamPart }) => {
  if (streamPart.type === 'sheet-delta') {
    setArtifact((draft) => {
      const newContent = streamPart.content as string;
      if (!draft.content) {
        // First delta: set full CSV
        return { ...draft, content: newContent, isVisible: true };
      } else {
        // Subsequent deltas: append rows (skip headers)
        const rows = newContent.split('\n').slice(1).join('\n');
        return { ...draft, content: draft.content + '\n' + rows };
      }
    });
  }
}
```

#### 2.3 **Pagination State Not Persisted**
**Location:** `hooks/use-artifact.ts`

**Problem:**
- Pagination cursor stored in SWR metadata (in-memory)
- Lost when page refreshes
- User cannot resume "Load More" after page reload

**Fix:**
```typescript
// Store pagination state in document metadata (DB)
// Update Document schema to include:
// metadata: jsonb { cursor?: string, spec?: any, limit?: number }

await saveDocument({
  id,
  title,
  content: csv,
  kind: 'people',
  metadata: { cursor, spec, limit },
  userId: session.user.id,
});
```

#### 2.4 **Error Events Don't Surface to Chat**
**Location:** `artifacts/people/server.ts:46`

**Problem:**
```typescript
if (result.rows.length === 0) {
  dataStream.writeData({ type: 'error', content: 'No matches found' });
  throw new Error('No matches found');  // ⚠️ Uncaught error
}
```

**Impact:**
- Error message appears in artifact area only
- AI chat doesn't see the error
- AI cannot suggest filter adjustments

**Fix:**
```typescript
if (result.rows.length === 0) {
  const errorMsg = 'No matches found. Try widening filters.';
  dataStream.writeData({ type: 'error', content: errorMsg });
  dataStream.writeData({ type: 'finish', content: '' });
  // Return empty CSV instead of throwing
  return toCSV(headers, []);
}
```

### 3. **Data Flow Issues**

#### 3.1 **Dual Artifact Creation Paths**
**Location:** Multiple files

**Problem:**
Two ways to create people artifacts:
1. **AI Tool Path:** `peopleFilters` → `createDocument` → `peopleDocumentHandler`
2. **Direct API Path:** `PeopleFiltersCard` → `/api/cerch/people`

**Impact:**
- Code duplication
- Inconsistent behavior
- Direct API path bypasses AI conversation flow
- Filter card doesn't appear in AI path if user phrases query differently

**Fix:**
- Unify paths: Always use AI tool path
- Make `/api/cerch/people` internal-only (called by handler)
- Ensure consistent UX regardless of query phrasing

#### 3.2 **Type Safety Issues**
**Location:** Multiple files

**Problem:**
```typescript
// app/(chat)/api/chat/route.ts:126
const messages = appendClientMessage({
  // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
  messages: previousMessages,
  message,
});
```

**Impact:**
- Type mismatches between DB and UI message formats
- Unsafe casts with `any` types
- Metadata stored as `any` (should be typed per artifact kind)

**Fix:**
```typescript
// Define strict types
type DBMessage = { /* ... */ };
type UIMessage = { /* ... */ };

const convertDBMessageToUI = (dbMessage: DBMessage): UIMessage => { /* ... */ };

const messages = appendClientMessage({
  messages: previousMessages.map(convertDBMessageToUI),
  message,
});
```

### 4. **API Integration Issues**

#### 4.1 **No Retry Logic for CrustData**
**Location:** `lib/providers/crustdata/client.ts`

**Problem:**
```typescript
const res = await fetch(`${CRUSTDATA_BASE}${path}`, { /* ... */ });
if (!res.ok) {
  throw new CrustdataError(`API error: ${res.statusText}`, res.status);
}
```

**Impact:**
- Network hiccups cause immediate failure
- No exponential backoff
- Transient 5xx errors fail permanently

**Fix:**
```typescript
const crustPostWithRetry = async <T>(
  path: string,
  body: any,
  retries = 3,
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${CRUSTDATA_BASE}${path}`, { /* ... */ });
      if (res.ok) return res.json();
      if (res.status >= 400 && res.status < 500) {
        // Client error: don't retry
        throw new CrustdataError(`API error: ${res.statusText}`, res.status);
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 2 ** i * 1000));  // Exponential backoff
    }
  }
};
```

#### 4.2 **Credit Limit Not Surfaced Proactively**
**Location:** `lib/providers/crustdata/client.ts`

**Problem:**
- CrustData has usage limits
- No proactive check before expensive queries
- User only learns about limits after failure

**Fix:**
```typescript
// Check credits before search
export async function getCrustdataCredits(): Promise<number> {
  const token = getCrustToken();
  const res = await fetch(`${CRUSTDATA_BASE}/user/credits`, {
    headers: { Authorization: `Token ${token}` },
  });
  const { credits } = await res.json();
  return credits;
}

// In peopleDocumentHandler:
const credits = await getCrustdataCredits();
if (credits < 10) {
  dataStream.writeData({
    type: 'error',
    content: `Low credits: ${credits} remaining. Upgrade to continue.`,
  });
  return toCSV(headers, []);
}
```

### 5. **Performance Issues**

#### 5.1 **No Debouncing on Filter Inputs**
**Location:** `components/people-filters-card.tsx`

**Problem:**
```typescript
<Input
  value={region}
  onChange={(e) => setRegion(e.target.value)}  // ⚠️ Re-renders on every keystroke
/>
```

**Impact:**
- Excessive re-renders
- Title recomputation on every keystroke
- Poor UX with rapid typing

**Fix:**
```typescript
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const [regionInput, setRegionInput] = useState('');
const region = useDebouncedValue(regionInput, 300);  // 300ms delay
```

#### 5.2 **CSV Parsing on Every Render**
**Location:** `components/webset-table.tsx`

**Problem:**
```typescript
export function WebsetTable({ csv }: { csv: string }) {
  const rows = csv.split('\n').map(row => row.split(','));  // ⚠️ Re-parses on every render
  // ...
}
```

**Impact:**
- Expensive parsing repeated unnecessarily
- Large CSVs (1000+ rows) cause lag

**Fix:**
```typescript
export function WebsetTable({ csv }: { csv: string }) {
  const rows = useMemo(() => {
    return csv.split('\n').map(row => row.split(','));
  }, [csv]);  // Only re-parse when CSV changes
  // ...
}
```

### 6. **UX Issues**

#### 6.1 **No Loading States for Autocomplete**
**Location:** `components/people-filters-card.tsx`

**Problem:**
- No autocomplete for regions, industries, companies
- User must type exact strings (error-prone)

**Fix:**
- Add autocomplete with loading states
- Suggest from CrustData canonical values

#### 6.2 **Error Messages Too Generic**
**Location:** `app/(chat)/api/cerch/people/route.ts:152`

**Problem:**
```typescript
return Response.json({
  ok: false,
  error: 'No profiles matched your filters. Try widening criteria.',
}, { status: 200 });
```

**Impact:**
- User doesn't know which filter is too restrictive
- No actionable guidance

**Fix:**
```typescript
// Analyze which filter causes no results
const diagnostics = await diagnoseEmptyResult(spec);
return Response.json({
  ok: false,
  error: `No matches found. Try: ${diagnostics.suggestions.join(', ')}`,
}, { status: 200 });

// Example diagnostics:
// - "Widen region from 'San Francisco' to 'San Francisco Bay Area'"
// - "Remove minConnections filter (500+ is very restrictive)"
```

---

## Recommendations

### High Priority (P0)

1. **Implement Redis Caching**
   - Replace in-memory cache with Redis
   - Add TTL (1 hour) to prevent stale data
   - Share cache across server instances

2. **Add Input Validation**
   - Validate filter types (number, string, date)
   - Check ranges (sizeMin <= sizeMax)
   - Validate region format
   - Add client-side + server-side validation

3. **Fix Sheet-Delta Append Logic**
   - Change from replace to append
   - Handle multiple delta events correctly
   - Test with large datasets (1000+ rows)

4. **Add Retry Logic for API Calls**
   - Exponential backoff for transient errors
   - Max 3 retries for 5xx errors
   - Immediate fail for 4xx errors

5. **Surface Credit Limits Proactively**
   - Check credits before expensive queries
   - Show credit count in UI
   - Warn at 20% remaining

### Medium Priority (P1)

6. **Persist Pagination State**
   - Store cursor in document metadata (DB)
   - Allow resume after page refresh
   - Add "Load More" state to DB

7. **Improve Error Surfacing**
   - Errors should appear in both artifact + chat
   - AI should see errors and suggest fixes
   - Add actionable error messages

8. **Unify Artifact Creation Paths**
   - Single code path for artifact creation
   - Always go through AI tool flow
   - Make `/api/cerch/people` internal-only

9. **Add Type Safety**
   - Remove `@ts-expect-error` comments
   - Add strict types for metadata
   - Type-safe message conversions

10. **Improve Company Filter Parity**
    - Add more filter fields for companies
    - Implement dual-mode (custom/auto)
    - Add autocomplete

### Low Priority (P2)

11. **Add Autocomplete for Filters**
    - Region autocomplete with canonical values
    - Industry suggestions
    - Company name search
    - Skills autocomplete

12. **Implement Filter Presets**
    - Save frequently used filter combinations
    - Quick access to "Recent searches"
    - Share filter presets

13. **Add Analytics & Telemetry**
    - Track filter usage patterns
    - Monitor API error rates
    - Measure time-to-first-result

14. **Optimize Performance**
    - Debounce filter inputs
    - Memoize CSV parsing
    - Lazy load artifacts
    - Virtual scrolling for large tables

15. **Add Export Formats**
    - JSON export
    - Excel (.xlsx) export
    - PDF export with formatting

16. **Multi-Provider Support**
    - Abstract provider interface
    - Support multiple data sources beyond CrustData
    - Aggregate results from multiple providers

---

## Summary

**Cerch AI** is a well-architected AI-powered discovery platform with:
- ✅ **Clean agentic flow** with multi-step tool execution
- ✅ **Robust streaming system** with resumable streams
- ✅ **Modular artifact architecture** (7 artifact types)
- ✅ **Sophisticated filter parsing** for natural language queries
- ✅ **Comprehensive documentation** and PRDs

**Main Areas for Improvement:**
1. **Caching Strategy** - Move to Redis from in-memory
2. **Input Validation** - Add client + server validation
3. **Artifact Handling** - Fix sheet-delta append logic
4. **Error Surfacing** - Improve error messages and visibility
5. **Company Filter Parity** - Match people filter sophistication
6. **Type Safety** - Remove type hacks and add strict types

**Production Readiness:** 85%
- Core functionality works well
- Edge cases need attention (empty results, network errors, invalid inputs)
- Performance optimizations needed for scale

---

## Appendix: Key Files Reference

| File | Purpose | Lines of Code |
|------|---------|---------------|
| `app/(chat)/api/chat/route.ts` | Main chat streaming endpoint | 387 |
| `lib/ai/tools/people-filters.ts` | People filter tool | 27 |
| `lib/ai/tools/create-document.ts` | Document creation tool | 68 |
| `artifacts/people/server.ts` | People artifact server handler | 131 |
| `artifacts/people/client.tsx` | People artifact renderer | 200+ |
| `components/people-filters-card.tsx` | Filter input form | 245 |
| `app/(chat)/api/cerch/people/route.ts` | People search API | 211 |
| `lib/providers/parse.ts` | Query parsing logic | 271 |
| `lib/providers/crustdata/client.ts` | CrustData API client | 150+ |
| `lib/providers/crustdata/people-filters.ts` | Filter builder | 200+ |
| `components/data-stream-handler.tsx` | Stream event processor | 107 |

---

**End of Documentation**
