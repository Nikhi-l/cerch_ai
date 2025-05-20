"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WebsetTable } from "./webset-table";
import { LoaderIcon } from "./icons";
import { useArtifact } from "@/hooks/use-artifact";
import { generateUUID } from "@/lib/utils";

export interface WebsetSearchMetadata {
  step: "setup" | "preview" | "searching" | "results";
  query: string;
  entityType: "People" | "Companies";
  criteria: string[];
  enrichments: string[];
  resultCount: number;
  progress: number;
}

function generateCsv(count: number, enrichments: string[]) {
  const headers = ["Name", "URL", ...enrichments];
  const rows = Array.from({ length: count }, (_, i) => {
    return [
      `Item ${i + 1}`,
      `https://example.com/${i + 1}`,
      ...enrichments.map((e) => `${e.toLowerCase()}-${i + 1}`),
    ];
  });
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function WebsetSearch() {
  const { setArtifact } = useArtifact();
  const [step, setStep] = useState<WebsetSearchMetadata["step"]>("setup");
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<"People" | "Companies">(
    "People",
  );
  const [enrichments, setEnrichments] = useState<string[]>([]);
  const [resultCount, setResultCount] = useState(25);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [csv, setCsv] = useState<string>("");

  const startPreview = () => {
    if (!query) return;
    setCriteria([query]);
    setStep("preview");
  };

  const startSearch = () => {
    setStep("searching");
    setProgress(0);
  };

  useEffect(() => {
    if (step === "searching") {
      const id = setInterval(() => {
        setProgress((p) => {
          const next = Math.min(100, p + 20);
          if (next >= 100) {
            const newCsv = generateCsv(resultCount, enrichments);
            setCsv(newCsv);
            const id = generateUUID();
            setArtifact({
              documentId: id,
              kind: "webset",
              title: query,
              content: newCsv,
              isVisible: true,
              status: "idle",
              boundingBox: { top: 0, left: 0, width: 0, height: 0 },
            });
            setStep("results");
          }
          return next;
        });
      }, 500);
      return () => clearInterval(id);
    }
  }, [step, enrichments, resultCount, query, setArtifact]);

  const addEnrichment = () => {
    const newField = `Enrichment ${enrichments.length + 1}`;
    const newEnrichments = [...enrichments, newField];
    setEnrichments(newEnrichments);
    const newCsv = generateCsv(resultCount, newEnrichments);
    setCsv(newCsv);
    setArtifact((a) => ({ ...a, content: newCsv }));
  };

  if (step === "setup") {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Find your perfect list</h2>
        <div className="flex gap-2">
          <Button
            variant={entityType === "People" ? "default" : "outline"}
            onClick={() => setEntityType("People")}
          >
            People
          </Button>
          <Button
            variant={entityType === "Companies" ? "default" : "outline"}
            onClick={() => setEntityType("Companies")}
          >
            Companies
          </Button>
        </div>
        <Input
          placeholder="Describe what you're looking for..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={startPreview}>Preview search</Button>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => setStep("setup")}>Back</Button>
        <h2 className="text-xl font-bold">Preview search</h2>
        <div className="text-sm text-muted-foreground">{query}</div>
        <div>
          <h3 className="font-semibold">Search criteria</h3>
          {criteria.map((c, i) => (
            <div key={i} className="text-sm">
              {c}
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold">Enrichments</h3>
          {['Email', 'Years of Experience'].map((e) => (
            <label key={e} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enrichments.includes(e)}
                onChange={(ev) => {
                  if (ev.target.checked) setEnrichments([...enrichments, e]);
                  else setEnrichments(enrichments.filter((x) => x !== e));
                }}
              />
              {e}
            </label>
          ))}
        </div>
        <div>
          <h3 className="font-semibold">Result count</h3>
          {[25, 100].map((n) => (
            <Button
              key={n}
              variant={resultCount === n ? "default" : "outline"}
              onClick={() => setResultCount(n)}
            >
              {n}
            </Button>
          ))}
          <Input
            type="number"
            value={resultCount}
            onChange={(e) => setResultCount(Number(e.target.value))}
          />
        </div>
        <Button onClick={startSearch}>Start search</Button>
      </div>
    );
  }

  if (step === "searching") {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Searching...</h2>
        <div className="flex items-center gap-2">
          <LoaderIcon />
          <div className="w-full bg-muted rounded h-2 overflow-hidden">
            <div
              className="bg-[#8a57db] h-2"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return <WebsetTable csv={csv} onAddEnrichment={addEnrichment} />;
}
