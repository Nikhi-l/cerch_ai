# Cerch AI - Complete Architecture & Flow Documentation

> **Last Updated:** December 3, 2025
> **Branch:** `claude/fix-agent-flow-artifacts-011CV4iHfURgqGqoUqpXtFyt`
> **Purpose:** Comprehensive documentation of all user flows, architecture, and execution plan

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Chat Flow Architecture](#chat-flow-architecture)
3. [Artifact System](#artifact-system)
4. [CrustData Integration](#crustdata-integration)
5. [Authentication & Authorization](#authentication--authorization)
6. [Database Schema](#database-schema)
7. [API Routes](#api-routes)
8. [Component Architecture](#component-architecture)
9. [Current Issues & Fixes](#current-issues--fixes)
10. [Execution Plan](#execution-plan)

---

## System Overview

### Technology Stack

```
Frontend:  Next.js 15.3.0 (App Router) + React 19 RC + TypeScript 5.8.2
Backend:   Next.js API Routes + Server Actions
AI:        OpenAI GPT-4o/4o-mini via Vercel AI SDK 4.3.13
Database:  PostgreSQL via Vercel Postgres + Drizzle ORM 0.34.1
Cache:     Redis via Upstash (optional, for resumable streams)
Storage:   Vercel Blob Storage (file uploads)
Auth:      NextAuth 5.0.0-beta.25 (credentials provider)
Data:      CrustData API (people & company search)
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Interface                         │
│  (Next.js App Router + React Components + Tailwind CSS)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Route Handlers)                 │
│  • /api/chat (streaming AI responses)                           │
│  • /api/document (artifact CRUD)                                │
│  • /api/cerch/* (CrustData proxy)                               │
│  • /api/history (chat history)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ↓         ↓         ↓
         ┌──────────────┐ ┌──────────┐ ┌────────────────┐
         │  OpenAI API  │ │PostgreSQL│ │ CrustData API  │
         │  (GPT-4o)    │ │(Drizzle) │ │ (People/Co.)   │
         └──────────────┘ └──────────┘ └────────────────┘
```

---

## Chat Flow Architecture

### Complete Message Flow Diagram

```
User Types Message
        ↓
    Submit Form
        ↓
┌──────────────────────────────────────────────────────────────┐
│ useChat hook (Vercel AI SDK)                                 │
│ • Generates UUID for message                                 │
│ • Appends to local messages array                            │
│ • Calls experimental_prepareRequestBody()                    │
└──────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────┐
│ POST /api/chat                                               │
│ 1. Parse & validate request body (Zod schema)               │
│ 2. Authenticate user (NextAuth session)                     │
│ 3. Rate limit check (10 msgs/day guest, 100/day regular)   │
│ 4. Chat creation or retrieval                               │
│ 5. Save user message to PostgreSQL                          │
│ 6. Initialize AI stream                                     │
└──────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────┐
│ streamText() - Vercel AI SDK                                 │
│ • Model: GPT-4o or GPT-4o-mini                              │
│ • System prompt with user hints (geolocation, etc.)         │
│ • maxSteps: 8 (multi-turn reasoning)                        │
│ • Tools: createDocument, updateDocument, peopleFilters, etc.│
└──────────────────────────────────────────────────────────────┘
        ↓
    Tool Invoked?
        ├─ Yes → Execute tool (e.g., createDocument)
        │            ↓
        │     ┌────────────────────────────────────────┐
        │     │ Artifact Handler                       │
        │     │ • Parse query                          │
        │     │ • Call CrustData API                   │
        │     │ • Stream CSV progressively             │
        │     │ • Save to database                     │
        │     └────────────────────────────────────────┘
        │            ↓
        │     Tool result returned to AI
        │            ↓
        └─ No → Stream text directly
                    ↓
┌──────────────────────────────────────────────────────────────┐
│ Response Stream                                              │
│ • text-delta (word-by-word streaming)                       │
│ • tool-call (tool invocation)                               │
│ • tool-result (tool response)                               │
│ • finish (completion)                                       │
└──────────────────────────────────────────────────────────────┘
        ↓
    Client receives stream chunks
        ↓
    Update UI in real-time
        ↓
    Save assistant message to PostgreSQL
```

### File Locations

- **Entry Point:** `app/(chat)/api/chat/route.ts` (POST handler, lines 79-272)
- **Client Hook:** `components/chat.tsx` (useChat hook, lines 50-85)
- **System Prompt:** `lib/ai/prompts.ts`
- **Provider Config:** `lib/ai/providers.ts`
- **Tools:** `lib/ai/tools/*`

### Key Code Sections

**POST Handler Initialization (lines 79-151):**

```typescript
export async function POST(request: Request) {
  // 1. Parse request
  const json = await request.json();
  const requestBody = postRequestBodySchema.parse(json);
  const { id, message, selectedChatModel, selectedVisibilityType, apiKey } = requestBody;

  // 2. Get geolocation hints
  const requestHints: RequestHints = { geolocation: geolocation(request) };

  // 3. Authenticate
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // 4. Rate limiting
  const userType: UserType = session.user.type;
  const messageCount = await getMessageCountByUserId({
    id: session.user.id,
    differenceInHours: 24,
  });
  if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
    return new ChatSDKError('rate_limit:chat').toResponse();
  }

  // 5. Chat management
  let chat: Chat;
  if (!id) {
    const title = await generateTitleFromUserMessage({ message: message.content });
    chat = await saveChat({ id: generateUUID(), userId: session.user.id, title });
  } else {
    chat = await getChatById({ id });
    if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }
  }

  // 6. Append user message to history
  const previousMessages = await getMessagesByChatId({ id: chat.id });
  const messages = appendClientMessage({ messages: previousMessages, message });

  // 7. Save message
  await saveMessages({ messages: [{ ...message, chatId: chat.id }] });
}
```

**Stream Generation (lines 163-249):**

```typescript
const stream = createDataStream({
  execute: (dataStream) => {
    const result = streamText({
      model: provider.languageModel(selectedChatModel),
      system: systemPrompt({ selectedChatModel, requestHints }),
      messages,
      maxSteps: 8, // Increased from 5 to handle complex multi-step queries
      experimental_activeTools:
        selectedChatModel === 'chat-model-reasoning'
          ? [] // Reasoning model doesn't use tools
          : [
              'getWeather',
              'peopleFilters',
              'companyFilters',
              'createDocument',
              'updateDocument',
              'requestSuggestions',
              'gmailQuery',
            ],
      tools: {
        getWeather,
        peopleFilters: peopleFiltersTool,
        companyFilters: companyFiltersTool,
        createDocument: createDocument({ session, dataStream, apiKey }),
        updateDocument: updateDocument({ session, dataStream, apiKey }),
        requestSuggestions,
        gmailQuery: gmailQueryTool({ apiKey }),
      },
      onFinish: async ({ response }) => {
        // Save assistant messages after completion
        await saveMessages({
          messages: appendResponseMessages({
            messages,
            responseMessages: response.messages,
          }),
        });
      },
    });

    // Smooth streaming for better UX
    return smoothStream(result.fullStream, { delayInMs: 10 });
  },
});
```

### Available Tools

| Tool | Purpose | Implementation |
|------|---------|----------------|
| `createDocument` | Create new artifacts (text, code, people, company, sheet, webset, image) | `lib/ai/tools/create-document.ts` |
| `updateDocument` | Modify existing artifacts | `lib/ai/tools/update-document.ts` |
| `peopleFilters` | Interactive people search refinement | `lib/ai/tools/people-filters.ts` |
| `companyFilters` | Interactive company search refinement | `lib/ai/tools/company-filters.ts` |
| `requestSuggestions` | Generate content improvement suggestions | `lib/ai/tools/request-suggestions.ts` |
| `getWeather` | Demo weather information tool | `lib/ai/tools/get-weather.ts` |
| `gmailQuery` | Search Gmail inbox (requires OAuth) | `lib/ai/tools/gmail.ts` |

---

## Artifact System

### Overview

Artifacts are live-editable documents created and updated by the AI. They appear in a split-screen view with chat on the left and the artifact on the right.

### Artifact Types

| Type | Description | File Extension | Server Handler | Client Renderer |
|------|-------------|----------------|----------------|-----------------|
| `text` | Markdown documents | `.md` | `artifacts/text/server.ts` | `artifacts/text/client.tsx` |
| `code` | Python code | `.py` | `artifacts/code/server.ts` | `artifacts/code/client.tsx` |
| `image` | AI-generated images | `.png` | `artifacts/image/server.ts` | `artifacts/image/client.tsx` |
| `sheet` | Generic CSV spreadsheets | `.csv` | `artifacts/sheet/server.ts` | `artifacts/sheet/client.tsx` |
| `people` | People search results | `.csv` | `artifacts/people/server.ts` | `artifacts/people/client.tsx` |
| `company` | Company search results | `.csv` | `artifacts/company/server.ts` | `artifacts/company/client.tsx` |
| `webset` | Mixed people+company data | `.csv` | `artifacts/webset/server.ts` | `artifacts/webset/client.tsx` |

### Architecture Pattern

**All artifacts follow this structure:**

```typescript
// artifacts/{type}/server.ts
export const {type}DocumentHandler = createDocumentHandler<'{type}'>({
  kind: '{type}',
  onCreateDocument: async ({ title, dataStream }) => {
    // 1. Validate configuration
    // 2. Parse user query
    // 3. Execute search/generation
    // 4. Stream progressive updates
    // 5. Return final content for database save
    return content;
  },
  onUpdateDocument: async ({ content, dataStream }) => {
    // Handle updates/edits
    return updatedContent;
  },
});

// artifacts/{type}/client.tsx
export const {type}Artifact = new Artifact<'{type}', Metadata>({
  kind: '{type}',
  description: 'Human-readable description',

  initialize: async ({ documentId, setMetadata }) => {
    // One-time setup when artifact opens
  },

  onStreamPart: ({ setArtifact, setMetadata, streamPart }) => {
    // Handle streaming data from server
    if (streamPart.type === '{type}-delta') {
      setArtifact(draft => ({ ...draft, content: streamPart.content }));
    }
  },

  content: ({ content, status, metadata, onSaveContent }) => {
    // Render artifact UI
    return <YourComponent content={content} />;
  },

  actions: [/* toolbar actions */],
  toolbar: [/* additional toolbar items */],
});
```

### People Artifact Deep Dive

**User Flow:**
```
1. User: "Find senior software engineers at Google in San Francisco"
2. AI invokes createDocument tool with kind='people', title=query
3. Server: artifacts/people/server.ts:onCreateDocument()
   ├─ Check CrustData configuration
   ├─ Check remaining API credits
   ├─ Parse query: buildPeopleQuery(title, 50)
   ├─ Execute search: aggregatePeople(query, [crustPeopleProvider])
   ├─ Stream CSV progressively (10 rows at a time)
   │  ├─ Stream chunk 1: rows 1-10
   │  ├─ dataStream.writeData({ type: 'status', content: 'Processed 10...' })
   │  ├─ Stream chunk 2: rows 11-20
   │  └─ ...
   └─ Return complete CSV for database save
4. Client: artifacts/people/client.tsx:onStreamPart()
   ├─ Receive 'sheet-delta' → Update artifact.content
   └─ Receive 'status' → Update metadata.statusText
5. Render: <WebsetTable csv={content} variant="people" />
```

**Progressive Streaming Implementation:**

`artifacts/people/server.ts`, lines 29-71:

```typescript
function streamCSVRows(
  headers: string[],
  rows: any[],
  dataStream: any,
  chunkSize: number = 10
): string {
  const csvLines: string[] = [headers.join(',')];

  // Stream rows in chunks for better UX
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    // Convert chunk to CSV lines
    const chunkLines = chunk.map(row => {
      return headers.map(h => {
        const value = row[h] ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
          ? `"${escaped}"`
          : escaped;
      }).join(',');
    });

    csvLines.push(...chunkLines);

    // Stream this partial CSV to client
    const partialCSV = csvLines.join('\n');
    dataStream.writeData({ type: 'sheet-delta', content: partialCSV });

    // Update progress status
    if (i + chunkSize < rows.length) {
      dataStream.writeData({
        type: 'status',
        content: `Processed ${Math.min(i + chunkSize, rows.length)} of ${rows.length} profiles...`,
      });
    }
  }

  return csvLines.join('\n');
}
```

**Status Updates During Creation:**

```
1. "Initializing people search..."
2. "Checking API configuration..."
3. "Remaining credits: 1,234"
4. "Parsing query..."
5. "Building search filters..."
6. "Calling CrustData API..."
7. "Received 50 profiles"
8. "Normalizing data..."
9. "Generating CSV..."
10. "Processed 10 of 50 profiles..."
11. "Finalizing search results..."
```

### Versioning System

**How It Works:**
- Each artifact has a unique `id` (UUID)
- Every edit creates a new row with the same `id` but different `createdAt` timestamp
- Composite primary key: `(id, createdAt)`
- Versions ordered by `createdAt` (oldest → newest)

**Database Schema:**

```sql
CREATE TABLE "Document" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "kind" VARCHAR NOT NULL DEFAULT 'text',
  "userId" UUID NOT NULL REFERENCES "User"("id"),
  PRIMARY KEY ("id", "createdAt")
);
```

**Client-Side Version Navigation:**

`components/artifact.tsx`, lines 210-237:

```typescript
const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
  if (type === 'latest') {
    // Jump to newest version
    setCurrentVersionIndex(documents.length - 1);
    setMode('edit');
  } else if (type === 'prev') {
    // Go back one version
    if (currentVersionIndex > 0) {
      setCurrentVersionIndex(index => index - 1);
    }
  } else if (type === 'next') {
    // Go forward one version
    if (currentVersionIndex < documents.length - 1) {
      setCurrentVersionIndex(index => index + 1);
    }
  } else if (type === 'toggle') {
    // Toggle between current and previous
    if (currentVersionIndex === documents.length - 1 && documents.length > 1) {
      setCurrentVersionIndex(documents.length - 2);
    } else {
      setCurrentVersionIndex(documents.length - 1);
    }
  }
};
```

**Version Footer UI:**

```
┌────────────────────────────────────────────────────────────┐
│ [<] Version 3 of 5 [>]                    [View Latest]    │
└────────────────────────────────────────────────────────────┘
```

---

## CrustData Integration

### Complete Filter Flow Diagram

```
User Query: "Find senior software engineers at Google in San Francisco"
        ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Query Parsing                                        │
│ File: lib/providers/parse.ts                                 │
│ Function: parsePeopleQuery(text, limit)                      │
└──────────────────────────────────────────────────────────────┘
        ↓
    Extract Components:
    • Region: "San Francisco" (from "in San Francisco")
    • Title: "Senior Software Engineer" (from "senior software engineers")
    • Company: "Google" (from "at Google")
        ↓
    Output: SearchQuery {
      q: "Find senior software engineers at Google in San Francisco",
      filters: {
        region: "San Francisco",
        title: "Senior Software Engineer",
        company: "Google"
      },
      limit: 50
    }
        ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Advanced Filter Building                            │
│ File: lib/providers/people-extract.ts                       │
│ Function: buildPeopleQuery(text, limit)                     │
└──────────────────────────────────────────────────────────────┘
        ↓
    Enhancement Steps:
    1. Parse base query (from Step 1)
    2. Extract type-safe filters with guards
    3. Infer additional titles from text patterns
    4. Parse key:value hints (skills:, experience:, etc.)
    5. Canonicalize locations (SF → San Francisco Bay Area)
        ↓
    Output: PeopleFilterSpec {
      region: "San Francisco",
      title: ["Senior Software Engineer", "Staff Engineer"],
      company: "Google",
      skills: undefined,
      languages: undefined,
      minConnections: undefined,
      experienceBucket: undefined
    }
        ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: CrustData Filter Transformation                     │
│ File: lib/providers/crustdata/people-filters.ts             │
│ Function: buildPeopleSearchQuery(spec, limit, baseQuery)    │
└──────────────────────────────────────────────────────────────┘
        ↓
    Build CrustFilterNode:
    {
      op: "and",
      conditions: [
        {
          op: "or",
          conditions: [
            {
              column: "current_employers.title",
              type: "(.)",
              value: "Senior Software Engineer"
            },
            {
              column: "current_employers.title",
              type: "(.)",
              value: "Staff Engineer"
            }
          ]
        },
        {
          column: "current_employers.name",
          type: "(.)",
          value: "Google"
        },
        {
          column: "region",
          type: "(.)",
          value: "San Francisco"
        }
      ]
    }
        ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: API Request with Retry & Caching                    │
│ File: lib/providers/crustdata/client.ts                     │
│ Function: crustPeopleProvider.getPeople(query)              │
└──────────────────────────────────────────────────────────────┘
        ↓
    1. Check cache (5-minute TTL)
       ├─ Hit → Return cached result
       └─ Miss → Continue
    2. Check credits (estimate 10 per search)
    3. Build request payload
    4. POST to https://api.crustdata.com/screener/persondb/search/
       Headers: { Authorization: "Token xxx" }
       Body: {
         limit: 50,
         filters: { op: "and", conditions: [...] },
         cursor: null
       }
    5. Retry with exponential backoff (max 3 attempts)
       Delays: 1s, 2s, 4s (with jitter)
    6. Parse response JSON
        ↓
    Response: {
      profiles: [
        {
          name: "John Doe",
          current_employers: [
            { title: "Senior Software Engineer", name: "Google" }
          ],
          region: "San Francisco, California",
          linkedin_profile_url: "https://linkedin.com/in/johndoe",
          profile_picture_url: "https://...",
          headline: "Building scalable systems...",
          ...
        },
        ...
      ],
      next_cursor: "eyJsYXN0X2lkIjoxMjM0NX0="
    }
        ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: Response Normalization                              │
│ File: lib/providers/normalize.ts                            │
│ Function: normalizePeopleRows(rows)                         │
└──────────────────────────────────────────────────────────────┘
        ↓
    Map CrustData schema → Internal schema:
    {
      name: r.name || r.full_name || r.person_name,
      title: r.default_position_title || currentEmp?.title,
      company: currentEmp?.name || r.company,
      industry: r.industry,
      location: r.region || r.location,
      linkedin_url: r.linkedin_profile_url,
      website: r.website,
      profile_image_url: r.profile_picture_url,
      description: r.headline || r.summary,
      tags: r.tags
    }
        ↓
    Array of Person objects
        ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: CSV Generation & Progressive Streaming              │
│ File: artifacts/people/server.ts                            │
│ Function: streamCSVRows(headers, rows, dataStream, 10)      │
└──────────────────────────────────────────────────────────────┘
        ↓
    CSV Output:
    name,title,company,industry,location,linkedin_url,...
    John Doe,Senior Software Engineer,Google,Technology,San Francisco,...
    Jane Smith,Staff Engineer,Google,Technology,San Francisco,...
    ...
        ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 7: Client Display                                      │
│ File: artifacts/people/client.tsx                           │
│ Component: <WebsetTable csv={content} variant="people" />   │
└──────────────────────────────────────────────────────────────┘
        ↓
    Rendered Table:
    ┌────────────────┬─────────────────────┬─────────┬────────────┐
    │ Name           │ Title               │ Company │ Location   │
    ├────────────────┼─────────────────────┼─────────┼────────────┤
    │ John Doe       │ Sr. Software Eng.   │ Google  │ SF, CA     │
    │ Jane Smith     │ Staff Engineer      │ Google  │ SF, CA     │
    │ ...            │ ...                 │ ...     │ ...        │
    └────────────────┴─────────────────────┴─────────┴────────────┘
```

### Filter Type Reference

**CrustData Filter Operators:**

```typescript
export type FilterOperator =
  | '='     // Exact match
  | '!='    // Not equal
  | '>'     // Greater than
  | '<'     // Less than
  | '=>'    // Greater than or equal
  | '=<'    // Less than or equal
  | '(.)';  // Fuzzy match (contains, case-insensitive)
```

**Filter Node Types:**

```typescript
// Single condition
export type CrustFilterCondition = {
  column: string;
  type: FilterOperator;
  value: string | number | boolean | Array<string | number | boolean>;
};

// Logical group
export type CrustFilterGroup = {
  op: 'and' | 'or';
  conditions: CrustFilterNode[];
};

// Union type
export type CrustFilterNode = CrustFilterCondition | CrustFilterGroup;
```

**Example Filter Structures:**

```typescript
// Simple AND
{
  op: "and",
  conditions: [
    { column: "region", type: "(.)", value: "San Francisco" },
    { column: "current_employers.title", type: "(.)", value: "Engineer" }
  ]
}

// OR within AND
{
  op: "and",
  conditions: [
    {
      op: "or",
      conditions: [
        { column: "current_employers.title", type: "(.)", value: "CTO" },
        { column: "current_employers.title", type: "(.)", value: "VP Engineering" }
      ]
    },
    { column: "region", type: "(.)", value: "San Francisco" }
  ]
}

// Numeric range
{
  op: "and",
  conditions: [
    { column: "years_of_experience_raw", type: "=>", value: 5 },
    { column: "years_of_experience_raw", type: "=<", value: 10 }
  ]
}
```

### People Filter Columns

**Available columns for people search:**

| Column | Type | Operator | Example |
|--------|------|----------|---------|
| `region` | string | `(.)` | "San Francisco" |
| `current_employers.title` | string | `(.)` | "Software Engineer" |
| `current_employers.name` | string | `(.)` | "Google" |
| `industry` | string | `(.)` | "Technology" |
| `skills` | string | `(.)` | "Python" |
| `languages` | string | `(.)` | "English" |
| `years_of_experience_raw` | number | `=>`, `=<` | 5 |
| `linkedin_connections` | number | `=>`, `=<` | 500 |
| `current_employers.size_range` | string | `=` | "51-200" |

### Company Filter Columns

**Available columns for company search:**

| Column | Type | Operator | Example |
|--------|------|----------|---------|
| `hq` | string | `(.)` | "San Francisco" |
| `country` | string | `=` | "United States" |
| `industry` | string | `(.)` | "Financial Services" |
| `size_range` | string | `=` | "51-200", "201-500" |
| `year_founded` | number | `=>`, `=<` | 2015 |
| `keywords` | string | `(.)` | "AI", "Machine Learning" |

### Retry & Caching Implementation

**Exponential Backoff Retry:**

`lib/providers/crustdata/client.ts`, lines 133-161:

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on auth errors
      if (error instanceof CrustdataError) {
        if (!error.retryable || error.status === 401 || error.status === 403) {
          throw error;
        }
      }

      if (attempt === maxRetries) break;

      // Exponential backoff with jitter
      const delay = initialDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: Wait 1s-1.3s (1000ms + jitter)
- Attempt 3: Wait 2s-2.6s (2000ms + jitter)
- Attempt 4: Wait 4s-5.2s (4000ms + jitter)

**Response Caching:**

`lib/providers/crustdata/client.ts`, lines 50-82:

```typescript
class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Separate caches for people and company searches
const peopleCache = new SimpleCache<ProviderResult<Person>>(5);
const companyCache = new SimpleCache<ProviderResult<Company>>(5);
```

**Cache Key Generation:**

```typescript
function generateCacheKey(query: SearchQuery): string {
  return JSON.stringify({
    filters: query.filters,
    limit: query.limit,
    cursor: query.cursor,
  });
}
```

### Credit Management

**Credit Check Before Search:**

```typescript
// Check if enough credits available
async function checkCredits(estimatedCost: number): Promise<void> {
  const remaining = await getRemainingCredits();
  if (remaining < estimatedCost) {
    throw new CrustdataError(
      `Insufficient credits. Available: ${remaining}, Required: ~${estimatedCost}`,
      402,
      null,
      false
    );
  }
}

// Get remaining credits from API
export async function getRemainingCredits(): Promise<number> {
  const token = await getCrustToken();
  if (!token) return 0;

  try {
    const response = await fetch(
      'https://api.crustdata.com/screener/credits/remaining',
      { headers: { Authorization: `Token ${token}` } }
    );
    const json = await response.json();
    return json.credits_remaining || 0;
  } catch {
    return 0;
  }
}
```

**Credit Cost Estimation:**
- People search: ~10 credits per search (~0.2 per profile)
- Company search: ~5 credits per search (~0.05 per company)
- Profile enrichment: ~1 credit per profile

---

## Authentication & Authorization

### NextAuth Configuration

**File:** `app/(auth)/auth.ts`

**Provider:** Credentials (email/password)

**Flow:**

```
1. User submits login form
        ↓
2. POST /api/auth/callback/credentials
        ↓
3. authorize() function called
        ├─ Query user by email
        ├─ Compare password hashes (bcrypt)
        ├─ Return user object or null
        └─ Timing attack prevention (dummy hash on miss)
        ↓
4. jwt() callback
        ├─ Add user.id to token
        ├─ Add user.type ('guest' | 'regular')
        └─ Return enriched token
        ↓
5. session() callback
        ├─ Copy token.id to session.user.id
        ├─ Copy token.type to session.user.type
        └─ Return enriched session
        ↓
6. Session cookie set
        ↓
7. Subsequent requests include session
```

**Implementation:**

```typescript
export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize({ email, password }: any) {
        const users = await getUser(email);

        if (users.length === 0) {
          // Timing attack prevention: perform dummy hash even if user doesn't exist
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;
        if (!user.password) return null;

        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) return null;

        return { ...user, type: 'regular' as UserType };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.type = user.type;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.type = token.type as UserType;
      }
      return session;
    },
  },
});
```

### Middleware Protection

**File:** `middleware.ts`

**Protected Routes:**
- All routes except `/`, `/login`, `/register`, `/api/auth/*`

**Logic:**

```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

  // Block legacy guest sessions (emails like "guest-12345")
  if (token && /^guest-\d+$/.test(token.email)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow public access to home, login, register
  if (!token && ['/', '/login', '/register'].includes(pathname)) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (token && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}
```

### Entitlements & Rate Limiting

**File:** `lib/ai/entitlements.ts`

```typescript
export const entitlementsByUserType = {
  guest: {
    maxMessagesPerDay: 10,
    maxArtifactsPerDay: 5,
    maxDocumentSizeMB: 1,
    allowedArtifactKinds: ['text', 'code', 'sheet'],
  },
  regular: {
    maxMessagesPerDay: 100,
    maxArtifactsPerDay: 50,
    maxDocumentSizeMB: 10,
    allowedArtifactKinds: ['text', 'code', 'sheet', 'image', 'people', 'company', 'webset'],
  },
};
```

**Rate Limit Check:**

`app/(chat)/api/chat/route.ts`, lines 86-101:

```typescript
const session = await auth();
if (!session?.user) {
  return new ChatSDKError('unauthorized:chat').toResponse();
}

const userType: UserType = session.user.type;
const messageCount = await getMessageCountByUserId({
  id: session.user.id,
  differenceInHours: 24,
});

if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
  return new ChatSDKError('rate_limit:chat').toResponse();
}
```

### Ownership Checks

**Example from document API:**

`app/(chat)/api/document/route.ts`, lines 15-26:

```typescript
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:document').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const documents = await getDocumentsById({ id: id! });
  const [document] = documents;

  // Ownership check
  if (document.userId !== session.user.id) {
    return new ChatSDKError('forbidden:document').toResponse();
  }

  return Response.json(documents);
}
```

---

## Database Schema

### Tables & Relationships

```
User (1) ────┬──── (M) Chat
             │         │
             │         ├──── (M) Message
             │         │         └──── (M) Vote
             │         │
             │         └──── (M) Stream
             │
             └──── (M) Document
                       └──── (M) Suggestion
```

### User Table

**File:** `lib/db/schema.ts`, lines 5-10

```typescript
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }), // bcrypt hash
});
```

**Indexes:**
```sql
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
```

### Chat Table

```typescript
export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId').notNull().references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});
```

**Indexes:**
```sql
CREATE INDEX "Chat_userId_createdAt_idx" ON "Chat"("userId", "createdAt" DESC);
```

### Message Table (v2)

**Schema:**

```typescript
export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId').notNull().references(() => chat.id),
  role: varchar('role').notNull(), // 'user' | 'assistant'
  parts: json('parts').notNull(), // Message parts (text, tool calls, etc.)
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});
```

**Parts Structure:**

```typescript
// User text message
{
  type: 'text',
  text: 'Find engineers in SF'
}

// Tool invocation (in progress)
{
  type: 'tool-invocation',
  toolInvocation: {
    toolName: 'createDocument',
    toolCallId: 'call_abc123',
    state: 'call',
    args: {
      kind: 'people',
      title: 'Find engineers in SF'
    }
  }
}

// Tool result
{
  type: 'tool-invocation',
  toolInvocation: {
    toolName: 'createDocument',
    toolCallId: 'call_abc123',
    state: 'result',
    result: {
      id: 'doc-uuid-123',
      title: 'Find engineers in SF',
      kind: 'people'
    }
  }
}
```

### Document Table

**Schema:**

```typescript
export const document = pgTable('Document', {
  id: uuid('id').notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  kind: varchar('text', {
    enum: ['text', 'code', 'image', 'sheet', 'webset', 'people', 'company']
  }).notNull().default('text'),
  userId: uuid('userId').notNull().references(() => user.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.id, table.createdAt] }),
}));
```

**Key Points:**
- Composite primary key: `(id, createdAt)`
- Same `id` + different `createdAt` = version history
- Versions ordered by `createdAt` ASC
- Latest version = `MAX(createdAt)` for given `id`

**Query for all versions:**

```typescript
export async function getDocumentsById({ id }: { id: string }) {
  return await db
    .select()
    .from(document)
    .where(eq(document.id, id))
    .orderBy(asc(document.createdAt));
}
```

### Vote Table

```typescript
export const vote = pgTable('Vote_v2', {
  chatId: uuid('chatId').notNull().references(() => chat.id),
  messageId: uuid('messageId').notNull().references(() => message.id),
  isUpvoted: boolean('isUpvoted').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.messageId] }),
}));
```

### Suggestion Table

```typescript
export const suggestion = pgTable('Suggestion', {
  id: uuid('id').notNull().defaultRandom(),
  documentId: uuid('documentId').notNull(),
  documentCreatedAt: timestamp('documentCreatedAt').notNull(),
  originalText: text('originalText').notNull(),
  suggestedText: text('suggestedText').notNull(),
  description: text('description'),
  isResolved: boolean('isResolved').notNull().default(false),
  userId: uuid('userId').notNull().references(() => user.id),
  createdAt: timestamp('createdAt').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.id, table.documentId, table.documentCreatedAt] }),
}));
```

**Foreign Key:**
```sql
FOREIGN KEY ("documentId", "documentCreatedAt")
  REFERENCES "Document"("id", "createdAt")
```

### Stream Table (Resumable Streams)

```typescript
export const stream = pgTable('Stream', {
  id: uuid('id').notNull().defaultRandom(),
  chatId: uuid('chatId').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});
```

**Purpose:** Tracks resumable stream IDs for interrupted connections (15-second TTL in Redis)

---

## API Routes

### Complete API Route Map

```
/api
├── /chat
│   ├── POST    → Create/continue conversation
│   ├── GET     → Resume interrupted stream
│   └── DELETE  → Delete chat by ID
│
├── /document
│   ├── GET     → Retrieve document versions by ID
│   ├── POST    → Save document version
│   └── DELETE  → Delete document versions after timestamp
│
├── /history
│   └── GET     → Get user's chat history (paginated)
│
├── /vote
│   ├── GET     → Get votes for a chat
│   └── PATCH   → Submit vote (up/down) for message
│
├── /suggestions
│   ├── GET     → Get suggestions for document
│   ├── POST    → Create suggestion
│   ├── PATCH   → Update suggestion (resolve)
│   └── DELETE  → Delete suggestion
│
├── /files
│   └── /upload
│       └── POST → Upload file attachment
│
├── /cerch
│   ├── /people
│   │   ├── POST → People search
│   │   ├── /next
│   │   │   └── POST → Paginated people search
│   │   └── /enrich
│   │       └── /basic
│   │           └── POST → Enrich people profiles
│   │
│   └── /company
│       └── POST → Company search
│
├── /gmail
│   ├── /auth → GET → Initiate OAuth flow
│   ├── /callback → GET → Handle OAuth callback
│   └── /status → GET → Check connection status
│
└── /auth (NextAuth)
    ├── /callback
    │   └── /credentials → POST → Login
    ├── /signout → POST → Logout
    └── /session → GET → Get current session
```

### Key Route Implementations

**History Route (Pagination):**

`app/(chat)/api/history/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10');
  const startingAfter = searchParams.get('starting_after'); // Cursor-based
  const endingBefore = searchParams.get('ending_before');   // Cursor-based

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chats = await getChatsByUserId({
    id: session.user.id,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}
```

**People Search Route:**

`app/(chat)/api/cerch/people/route.ts`:

```typescript
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:cerch').toResponse();
  }

  const json = await request.json();
  const { spec, limit = 50 } = json;

  // Build query from spec
  const query = buildPeopleSearchQuery(spec, limit);

  // Execute search
  const result = await aggregatePeople(query, [crustPeopleProvider]);

  return Response.json({
    rows: result.rows,
    cursor: result.nextCursor,
    source: result.source,
  });
}
```

---

## Component Architecture

### Client Component Hierarchy

```
<Chat>
  ├── <ChatHeader>
  │   ├── <ModelSelector>
  │   ├── <VisibilitySelector>
  │   └── <ThemeToggle>
  │
  ├── <Messages>
  │   └── <Message>
  │       ├── <Markdown> (text content)
  │       ├── <Document> (tool call preview)
  │       ├── <DocumentPreview> (tool result)
  │       └── <MessageActions> (copy, regenerate)
  │
  ├── <MultimodalInput>
  │   ├── <Textarea>
  │   ├── <FileUploadButton>
  │   └── <SubmitButton>
  │
  └── <Artifact> (overlay)
      ├── <ArtifactMessages> (left panel)
      │   ├── <Message>
      │   └── <MultimodalInput>
      │
      └── <ArtifactContent> (right panel)
          ├── <ArtifactCloseButton>
          ├── <artifactDefinition.content> (dynamic)
          │   ├── <WebsetTable> (people/company/webset)
          │   ├── <CodeEditor> (code)
          │   ├── <TextEditor> (text)
          │   ├── <ImageViewer> (image)
          │   └── <SheetEditor> (sheet)
          │
          ├── <Toolbar> (current version only)
          │   ├── <ExportButton>
          │   ├── <ShareButton>
          │   └── <SaveButton>
          │
          └── <VersionFooter> (historical versions only)
              ├── <PrevButton>
              ├── Version N of M
              ├── <NextButton>
              └── <ViewLatestButton>
```

### Sidebar Component Hierarchy

```
<AppSidebar>
  ├── <SidebarHeader>
  │   ├── <Logo>
  │   └── <NewChatButton>
  │
  ├── <SidebarHistory> (infinite scroll)
  │   └── [Grouped by date]
  │       ├── Today
  │       │   ├── <SidebarItem chat={chat1} />
  │       │   └── <SidebarItem chat={chat2} />
  │       │
  │       ├── Yesterday
  │       │   └── <SidebarItem chat={chat3} />
  │       │
  │       ├── Last 7 Days
  │       └── Last 30 Days
  │
  └── <SidebarFooter>
      ├── <CreditsButton>
      ├── <IntegrationsDropdown>
      │   ├── Gmail
      │   ├── Notion
      │   └── Slack
      │
      └── <SidebarUserNav>
          ├── Profile
          ├── Settings
          └── Logout
```

### Key Hooks

**useChat (Vercel AI SDK):**

```typescript
const {
  messages,
  setMessages,
  handleSubmit,
  input,
  setInput,
  append,
  reload,
  stop,
  status,
  data,
  experimental_resume,
} = useChat({
  id: chatId,
  initialMessages,
  generateId: generateUUID,
  experimental_prepareRequestBody: (body) => ({
    id: chatId,
    message: body.messages.at(-1),
    selectedChatModel,
    selectedVisibilityType,
    apiKey,
  }),
  onFinish: () => {
    // Revalidate history after completion
    mutate(unstable_serialize(getChatHistoryPaginationKey));
  },
});
```

**useArtifact (Zustand):**

```typescript
const { artifact, setArtifact, metadata, setMetadata } = useArtifact();

// artifact: {
//   isVisible: boolean;
//   documentId: string | null;
//   content: string;
//   status: 'idle' | 'streaming' | 'complete' | 'error';
// }
```

**useSWRInfinite (Infinite Scroll):**

```typescript
const { data, size, setSize, isLoading } = useSWRInfinite(
  (pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.length) return null;

    const startingAfter = previousPageData?.[previousPageData.length - 1]?.id;
    return `/api/history?limit=10&starting_after=${startingAfter || ''}`;
  },
  fetcher,
  { revalidateFirstPage: false }
);

// Load more
const loadMore = () => setSize(size + 1);
```

---

## Current Issues & Fixes

### Issues Identified & Resolved

#### 1. **Redis Connection Error** ✅ FIXED

**Error:**
```
⨯ [Error: getaddrinfo ENOTFOUND enabled-magpie-61514.upstash.io] {
  errno: -3008,
  code: 'ENOTFOUND',
  syscall: 'getaddrinfo',
  hostname: 'enabled-magpie-61514.upstash.io'
}
```

**Root Cause:**
- REDIS_URL environment variable points to non-existent or unreachable Upstash instance
- Error handling only checked for `error.message.includes('REDIS_URL')` but DNS errors don't have that string
- Error was logged but not properly caught, causing process to crash

**Fix Applied:**

`app/(chat)/api/chat/route.ts`, lines 47-77:

```typescript
function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      // Gracefully handle all Redis connection errors
      // Common errors: REDIS_URL missing, DNS resolution (ENOTFOUND), connection refused, etc.
      const isRedisError =
        error.message?.includes('REDIS_URL') ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.syscall === 'getaddrinfo';

      if (isRedisError) {
        console.log(
          ' > Resumable streams are disabled due to Redis connection issue:',
          error.code || error.message
        );
      } else {
        console.error(' > Unexpected error creating stream context:', error);
      }

      // Ensure globalStreamContext remains null on any error
      globalStreamContext = null;
    }
  }

  return globalStreamContext;
}
```

**Result:**
- System now gracefully handles Redis connection failures
- Falls back to non-resumable streams (still fully functional)
- User experience unaffected

#### 2. **TypeScript Union Type Errors** ✅ FIXED

**Error:**
```
Type error: Property 'region' does not exist on type
'Record<string, string | number | boolean> | CrustFilterNode'.
Property 'region' does not exist on type 'CrustFilterCondition'.
```

**Root Cause:**
- `base.filters` is a union type: `Record<string, any> | CrustFilterNode`
- Direct property access (`base.filters.region`) failed because `CrustFilterNode` types don't have `.region`
- TypeScript couldn't narrow the type without explicit guards

**Fix Applied:**

`lib/providers/people-extract.ts`, lines 60-122:

```typescript
// Type guard to check if filters is a plain object (not CrustFilterNode)
const baseFilters = base.filters as Record<string, any> | undefined;

if (baseFilters && typeof baseFilters === 'object' && !('op' in baseFilters) && !('column' in baseFilters)) {
  // Now TypeScript knows this is a plain object, not a CrustFilterNode
  if (baseFilters.region && typeof baseFilters.region === 'string') {
    spec.region = baseFilters.region;
  }
  // ... other property accesses
}
```

**Type Guard Logic:**
- `baseFilters && typeof baseFilters === 'object'` → Not null/undefined, is an object
- `!('op' in baseFilters)` → Not a `CrustFilterGroup` (which has `op` property)
- `!('column' in baseFilters)` → Not a `CrustFilterCondition` (which has `column` property)
- Therefore → Must be a plain `Record<string, any>`

**Result:**
- TypeScript compilation successful
- Type-safe property access
- No runtime errors

#### 3. **Invalid OpenAI Model IDs** ✅ FIXED

**Error:**
```
Type error: Argument of type '"gpt-5"' is not assignable to parameter of type
'"gpt-3.5-turbo-instruct" | "gpt-4o" | ...'
```

**Root Cause:**
- Code used placeholder model IDs: `gpt-5`, `gpt-5-reasoning`, `gpt-image-1`
- These models don't exist in @ai-sdk/openai

**Fix Applied:**

`lib/ai/providers.ts`, lines 32-46:

```typescript
return customProvider({
  languageModels: {
    // Primary chat model - GPT-4o (most capable, fastest)
    'chat-model': openai('gpt-4o'),
    // Reasoning variant with thinking trace extraction
    'chat-model-reasoning': wrapLanguageModel({
      model: openai('gpt-4o'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    // Title generation model - faster model for simple tasks
    'title-model': openai('gpt-4o-mini'),
    // Artifact generation (text/code/sheet/webset)
    'artifact-model': openai('gpt-4o'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-3'),
  },
});
```

**Result:**
- Valid OpenAI model IDs used
- Build successful

#### 4. **Invalid Temperature Settings** ✅ FIXED

**Error:**
```
Type error: Object literal may only specify known properties, and 'temperature'
does not exist in type 'OpenAIChatSettings'.
```

**Root Cause:**
- @ai-sdk/openai doesn't accept temperature during model instantiation
- Temperature should be passed at inference time via `streamText()` options

**Fix Applied:**

Removed `{ temperature: 0.1 }` from model instantiation.

**Result:**
- Build successful
- Temperature can still be set per-request if needed

### Remaining Known Issues

#### 1. **Vercel Build Cache** ⚠️ MONITORING

**Issue:**
- Vercel sometimes builds from old commit despite new commits pushed
- Example: Built from `2fdcfd4` when latest was `86b1435`

**Workaround:**
- Empty commit to force cache refresh
- Commit message: "chore: Force rebuild - latest commit is {hash}"

**Permanent Solution Needed:**
- Investigate Vercel deployment hooks
- Consider explicit cache invalidation

#### 2. **Upstash Redis Instance** ⚠️ REQUIRES ATTENTION

**Issue:**
- REDIS_URL points to non-existent instance: `enabled-magpie-61514.upstash.io`

**Options:**
1. Create new Upstash Redis instance and update REDIS_URL
2. Remove REDIS_URL from environment (system works fine without it)
3. Use alternative Redis provider

**Impact:**
- Low: Resumable streams disabled but system fully functional
- Users won't notice any difference (15-second resume window is rarely needed)

**Recommendation:**
- Remove REDIS_URL from production environment unless resumable streams are critical

---

## Execution Plan

### Phase 1: Stabilization & Testing (Priority: HIGH)

**Goal:** Ensure current build is stable and all fixes are deployed

#### Task 1.1: Verify Vercel Deployment ✅

- [x] Confirm latest commit (`86b1435`) is deployed
- [x] Check build logs for errors
- [x] Test chat functionality in production
- [ ] Monitor error logs for 24 hours

**Assignee:** DevOps / Lead Developer
**ETA:** Immediate
**Files:** N/A
**Verification:** Vercel dashboard + production testing

#### Task 1.2: Redis Decision

- [ ] Decide: Keep resumable streams or remove Redis dependency?
- [ ] If keeping: Create new Upstash Redis instance
  - Update `REDIS_URL` in Vercel environment
  - Test resumable streams functionality
  - Monitor error logs
- [ ] If removing: Delete `REDIS_URL` from environment
  - Verify graceful degradation
  - Update documentation

**Assignee:** DevOps + Product Manager
**ETA:** 1 day
**Files:**
- `app/(chat)/api/chat/route.ts` (already handles missing Redis gracefully)
- `.env.example` (update documentation)

#### Task 1.3: Comprehensive Testing

- [ ] **Unit Tests:**
  - Test filter parsing with various queries
  - Test type guards in `people-extract.ts`
  - Test cache key generation
  - Test retry logic with exponential backoff

- [ ] **Integration Tests:**
  - End-to-end people search flow
  - End-to-end company search flow
  - Artifact creation and versioning
  - Progressive streaming behavior

- [ ] **Manual QA:**
  - Create people artifact: "Find CTOs in San Francisco"
  - Create company artifact: "Find fintech startups in NYC"
  - Test pagination (load more results)
  - Test version history navigation
  - Test progressive streaming (watch rows appear in chunks)
  - Test error handling (invalid API token, rate limits)

**Assignee:** QA Team
**ETA:** 2-3 days
**Files:**
- Create `tests/filters.test.ts`
- Create `tests/artifacts.test.ts`
- Create `tests/crustdata-integration.test.ts`

---

### Phase 2: Performance Optimization (Priority: MEDIUM)

**Goal:** Improve response times and user experience

#### Task 2.1: Database Query Optimization

**Current Issue:**
- Some queries don't use indexes effectively
- Version history queries can be slow for documents with many versions

**Actions:**
- [ ] Add composite index: `(userId, createdAt DESC)` on `Document` table
- [ ] Add index: `(chatId, createdAt DESC)` on `Message_v2` table
- [ ] Optimize `getChatsByUserId` query with pagination
- [ ] Add query result caching for frequently accessed chats

**Files:**
- `lib/db/schema.ts` (add indexes)
- `lib/db/queries.ts` (optimize queries)
- Create migration file in `lib/db/migrations/`

**Expected Impact:**
- 50% faster history loading
- 30% faster document version retrieval

**Assignee:** Backend Developer
**ETA:** 1-2 days

#### Task 2.2: Client-Side Caching Enhancement

**Current Issue:**
- SWR cache revalidates too frequently
- Artifact metadata re-fetched unnecessarily

**Actions:**
- [ ] Increase SWR cache TTL for document metadata
- [ ] Implement optimistic updates for artifact saves
- [ ] Add stale-while-revalidate for chat history
- [ ] Preload next page of history on scroll

**Files:**
- `components/chat.tsx`
- `components/sidebar-history.tsx`
- `components/artifact.tsx`

**Expected Impact:**
- 40% reduction in API calls
- Faster perceived performance

**Assignee:** Frontend Developer
**ETA:** 2-3 days

#### Task 2.3: Progressive Enhancement

**Current:**
- CSV streams in 10-row chunks
- Status updates every chunk

**Improvements:**
- [ ] Dynamic chunk size based on total rows (smaller datasets = larger chunks)
- [ ] Add estimated time remaining
- [ ] Show partial table during streaming (already implemented, verify UX)
- [ ] Add cancel button during long searches

**Files:**
- `artifacts/people/server.ts`
- `artifacts/company/server.ts`
- `artifacts/people/client.tsx`
- `artifacts/company/client.tsx`

**Expected Impact:**
- Better UX for large searches (100+ results)
- User control over long-running operations

**Assignee:** Full-stack Developer
**ETA:** 2-3 days

---

### Phase 3: Feature Enhancements (Priority: MEDIUM)

**Goal:** Add high-value features requested by users

#### Task 3.1: Advanced Filtering UI

**Current:**
- Filters are text-based only
- No visual filter builder

**New Feature:**
- [ ] Add filter card UI for people search
  - Title dropdown (autocomplete with common titles)
  - Location dropdown (autocomplete with cities)
  - Experience slider (0-20+ years)
  - Company search input
  - Skills multi-select
- [ ] Add filter card UI for company search
  - Industry dropdown
  - Size range slider
  - Location dropdown
  - Founded year range
- [ ] Save filter presets (e.g., "SF Tech CTOs", "NYC Fintech Founders")
- [ ] Filter history (recently used filters)

**Files:**
- Create `components/people-filters-card.tsx`
- Create `components/company-filters-card.tsx`
- Update `lib/ai/tools/people-filters.ts`
- Update `lib/ai/tools/company-filters.ts`

**Mockup:**

```
┌──────────────────────────────────────────────────────┐
│ People Search Filters                                │
├──────────────────────────────────────────────────────┤
│ Title:      [Senior Software Engineer     ▼]         │
│ Location:   [San Francisco               ▼]         │
│ Company:    [Google                        ]         │
│ Experience: [5 ━━━━●━━━━━━━━━━━━━━━━━ 20] years      │
│ Skills:     [Python, React, AWS           ✕]         │
│                                                      │
│ [Clear All]                        [Search]         │
└──────────────────────────────────────────────────────┘
```

**Assignee:** Frontend Developer + Designer
**ETA:** 5-7 days

#### Task 3.2: Export Enhancements

**Current:**
- CSV export only (copy to clipboard)

**New Features:**
- [ ] Export to Excel (.xlsx) with formatting
  - Headers in bold
  - Freeze first row
  - Auto-width columns
  - Hyperlinks for LinkedIn URLs
- [ ] Export to PDF with company branding
- [ ] Export to Google Sheets (direct integration)
- [ ] Scheduled exports (email weekly summary)

**Libraries:**
- `xlsx` package for Excel export
- `jspdf` + `jspdf-autotable` for PDF
- Google Sheets API for direct upload

**Files:**
- Create `lib/export/excel.ts`
- Create `lib/export/pdf.ts`
- Create `lib/export/google-sheets.ts`
- Update `components/webset-table.tsx` (add export dropdown)

**Assignee:** Backend Developer
**ETA:** 3-4 days

#### Task 3.3: Enrichment Integration

**Current:**
- Basic profile data from CrustData search

**New Feature:**
- [ ] Enrich profiles on-demand (click to enrich)
  - Full work history
  - Education background
  - Skills endorsements
  - Recent activity
- [ ] Bulk enrichment (select multiple profiles)
- [ ] Auto-enrichment for top N results (configurable)
- [ ] Show credit cost before enrichment

**API Endpoint:**
- POST `/api/cerch/people/enrich/basic`
- Input: Array of LinkedIn URLs
- Output: Array of enriched profiles

**Files:**
- `app/(chat)/api/cerch/people/enrich/basic/route.ts` (already exists, verify)
- Update `components/webset-table.tsx` (add "Enrich" button per row)
- Update `lib/providers/crustdata/client.ts` (add enrichment method)

**UI Mockup:**

```
┌────────────────────────────────────────────────────┐
│ Name            │ Title       │ Company │ Actions │
├────────────────────────────────────────────────────┤
│ John Doe        │ Sr. SWE     │ Google  │ [Enrich]│ ← Click to enrich
│ Jane Smith      │ CTO         │ Startup │ [Enrich]│
│ ...             │ ...         │ ...     │ ...     │
└────────────────────────────────────────────────────┘
```

**Assignee:** Full-stack Developer
**ETA:** 3-4 days

---

### Phase 4: Monitoring & Analytics (Priority: MEDIUM)

**Goal:** Gain insights into system usage and performance

#### Task 4.1: Analytics Dashboard

**Metrics to Track:**
- Chat volume (messages per day)
- Artifact creation by type
- CrustData API usage (searches, credits consumed)
- User retention (DAU, WAU, MAU)
- Average search latency
- Error rates by endpoint

**Tools:**
- Vercel Analytics (already integrated)
- PostHog or Mixpanel for product analytics
- Custom dashboard in Next.js admin panel

**Actions:**
- [ ] Add event tracking for key user actions
  - Chat message sent
  - Artifact created
  - Filter applied
  - Export initiated
- [ ] Create admin dashboard route (`/admin/analytics`)
- [ ] Add charts for key metrics
- [ ] Set up alerts for anomalies (error spikes, latency increases)

**Files:**
- Create `lib/analytics/track.ts`
- Create `app/(admin)/analytics/page.tsx`
- Update all artifact handlers to track events

**Assignee:** Full-stack Developer
**ETA:** 4-5 days

#### Task 4.2: Error Monitoring

**Current:**
- Basic console.error() logging
- No centralized error tracking

**New System:**
- [ ] Integrate Sentry for error tracking
  - Automatic error capture
  - Source map support
  - Breadcrumbs for debugging
- [ ] Add custom error boundaries
- [ ] Set up error alerts (Slack/email)
- [ ] Create error dashboard in admin panel

**Files:**
- Install `@sentry/nextjs`
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Update `next.config.js` with Sentry webpack plugin

**Assignee:** DevOps + Backend Developer
**ETA:** 1-2 days

---

### Phase 5: Documentation & Developer Experience (Priority: LOW)

**Goal:** Make codebase easier to understand and maintain

#### Task 5.1: API Documentation

- [ ] Generate OpenAPI/Swagger docs for all API routes
- [ ] Add JSDoc comments to all public functions
- [ ] Create API usage examples
- [ ] Document rate limits and authentication

**Tools:**
- `swagger-jsdoc` for OpenAPI generation
- `swagger-ui-express` for interactive docs

**Files:**
- Create `docs/api/openapi.yaml`
- Create `app/(admin)/api-docs/page.tsx`
- Add JSDoc to all files in `lib/providers/`, `lib/ai/tools/`, `lib/db/queries.ts`

**Assignee:** Technical Writer + Developers
**ETA:** 5-7 days

#### Task 5.2: Architecture Diagrams

- [ ] Create visual architecture diagrams
  - System overview
  - Chat flow diagram
  - Artifact lifecycle
  - CrustData integration flow
  - Authentication flow
- [ ] Add diagrams to this document
- [ ] Create interactive diagram (e.g., using Mermaid)

**Tools:**
- Draw.io or Lucidchart
- Mermaid.js for in-document diagrams

**Files:**
- Update `docs/current_structure.md` (this file)
- Create `docs/diagrams/` folder
- Generate PNG/SVG exports

**Assignee:** Technical Architect + Designer
**ETA:** 2-3 days

#### Task 5.3: Onboarding Guide

**For new developers:**
- [ ] Step-by-step setup guide
  - Clone repo
  - Install dependencies
  - Set up environment variables
  - Run migrations
  - Start dev server
- [ ] Common tasks guide
  - Adding a new artifact type
  - Adding a new API route
  - Adding a new tool
- [ ] Troubleshooting guide
- [ ] Code style guide

**Files:**
- Create `docs/ONBOARDING.md`
- Create `docs/CONTRIBUTING.md`
- Update `README.md` with quick start

**Assignee:** Senior Developer
**ETA:** 2-3 days

---

## Summary

### System Strengths

✅ **Well-Architected:**
- Clear separation of concerns (server/client, tools/handlers)
- Type-safe with TypeScript
- Progressive enhancement patterns
- Graceful error handling

✅ **Performance:**
- Progressive streaming (no waiting for full CSV)
- Response caching (5-minute TTL)
- Retry logic with exponential backoff
- Optimistic UI updates

✅ **User Experience:**
- Real-time status updates
- Version history with diff view
- Split-screen artifact view
- Smooth animations

✅ **Security:**
- Multi-layer authentication (middleware + route-level)
- Ownership checks on all data access
- Rate limiting by user type
- Password hashing with bcrypt

### Areas for Improvement

⚠️ **Testing:**
- Limited unit test coverage
- No integration tests for CrustData flow
- Manual QA needed for each deployment

⚠️ **Monitoring:**
- No centralized error tracking
- No performance monitoring
- No analytics dashboard

⚠️ **Documentation:**
- API docs incomplete
- No visual architecture diagrams
- Limited onboarding materials

⚠️ **Infrastructure:**
- Redis instance needs attention (or removal)
- Vercel build caching issues

### Next Immediate Actions

1. ✅ **Fix Redis error handling** (DONE)
2. ✅ **Fix TypeScript type errors** (DONE)
3. ⏳ **Verify Vercel deployment** (IN PROGRESS)
4. ⏳ **Decide on Redis strategy** (NEEDS DECISION)
5. ⏳ **Write tests for filter parsing** (NEEDS IMPLEMENTATION)

---

## Appendix: Quick Reference

### Environment Variables Required

```bash
# Authentication
AUTH_SECRET=<random-32-byte-string>

# Database
POSTGRES_URL=<vercel-postgres-url>

# AI Models
OPENAI_API_KEY=<openai-api-key>
XAI_API_KEY=<xai-api-key> # Optional, for X.AI models

# Storage
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>

# CrustData
CRUSTDATA_API_TOKEN=<crustdata-token>
CRUSTDATA_API_BASE=https://api.crustdata.com # Optional, defaults to this

# Redis (Optional)
REDIS_URL=<redis-url> # Can be omitted, system works without it

# Gmail Integration (Optional)
GMAIL_CLIENT_ID=<google-oauth-client-id>
GMAIL_CLIENT_SECRET=<google-oauth-client-secret>
```

### Key Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm build               # Build for production
pnpm start               # Start production server

# Database
pnpm db:migrate          # Run migrations
pnpm db:studio           # Open Drizzle Studio
pnpm db:push             # Push schema changes

# Testing
pnpm test                # Run unit tests
pnpm test:e2e            # Run E2E tests (Playwright)
pnpm lint                # Run linter
pnpm type-check          # Run TypeScript compiler
```

### Important File Paths

| Purpose | Path |
|---------|------|
| Chat API | `app/(chat)/api/chat/route.ts` |
| Auth Config | `app/(auth)/auth.ts` |
| Database Schema | `lib/db/schema.ts` |
| CrustData Client | `lib/providers/crustdata/client.ts` |
| Filter Parsing | `lib/providers/people-extract.ts` |
| People Artifact | `artifacts/people/server.ts`, `artifacts/people/client.tsx` |
| Main Chat Component | `components/chat.tsx` |
| Artifact Overlay | `components/artifact.tsx` |
| Sidebar History | `components/sidebar-history.tsx` |

---

**Document End**

*This documentation is current as of December 3, 2025. Please update as the codebase evolves.*
