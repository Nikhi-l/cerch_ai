"use client";
import { parse, unparse } from "papaparse";
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Download, Filter, Maximize2, Plus, SlidersHorizontal, Zap, Eye, EyeOff, Search } from "lucide-react";
import { EnrichmentDialog } from "@/components/enrichment-dialog";
import { toast } from "sonner";

interface WebsetTableProps {
  csv: string;
  variant?: 'people' | 'company' | 'webset';
  autoHideEmptyColumns?: boolean;
  hideImageUrlColumns?: boolean;
  onLoadMore?: () => void;
}

export function WebsetTable({
  csv,
  variant,
  autoHideEmptyColumns,
  hideImageUrlColumns,
  onLoadMore,
}: WebsetTableProps) {
  const hideEmpty = autoHideEmptyColumns ?? (variant === 'people');
  const hideImageCols = hideImageUrlColumns ?? (variant === 'people');

  const { headers, rows, imageUrls } = useMemo(() => {
    const parsed = parse<string[]>(csv || "", { skipEmptyLines: true });
    const data = parsed.data as string[][];
    const rawHeaders = data.length > 0 ? data[0] : [];
    const rawRows = data.length > 1 ? data.slice(1) : [];

    const imageColRegex = /(profile_)?image|avatar|photo|picture|profile_image_url|image_url/i;

    const rawImageIdx = rawHeaders.findIndex((h) => imageColRegex.test(h));
    const imageUrls = rawRows.map((row) => (rawImageIdx >= 0 ? row[rawImageIdx] || '' : ''));

    const allowedIndex: boolean[] = rawHeaders.map((h, idx) => {
      if (hideImageCols && imageColRegex.test(h)) return false;
      if (hideEmpty) {
        const anyNonEmpty = rawRows.some((r) => (r[idx] || '').trim() !== '');
        if (!anyNonEmpty) return false;
      }
      return true;
    });

    const filteredHeaders = rawHeaders.filter((_, idx) => allowedIndex[idx]);
    const filteredRows = rawRows.map((row) => row.filter((_, idx) => allowedIndex[idx]));
    return { headers: filteredHeaders, rows: filteredRows, imageUrls };
  }, [csv, hideEmpty, hideImageCols]);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortedColumn, setSortedColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Initial widths for all columns; smaller default to fit more on screen
  const DEFAULT_COL_WIDTH = 120;
  const NAME_MULTIPLIER = 2;
  const NAME_DEFAULT_WIDTH = Math.round(DEFAULT_COL_WIDTH * NAME_MULTIPLIER);
  const MIN_COL_WIDTH = 80;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [enriching, setEnriching] = useState(false);

  // Utility: Format header label (start case) for display only
  const formatHeader = (h: string) =>
    h
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // Initialize equal widths for all visible headers on first render and when headers change
  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev } as Record<string, number>;
      let changed = false;
      const nameHeader = headers.find((h) => /(^|\b)name(\b|$)/i.test(h));
      headers.forEach((h) => {
        if (next[h] == null) {
          if (nameHeader && h === nameHeader) {
            next[h] = NAME_DEFAULT_WIDTH;
          } else {
            next[h] = DEFAULT_COL_WIDTH;
          }
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [headers]);

  const startResizing = (header: string) => (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[header] ?? DEFAULT_COL_WIDTH;
    const onMouseMove = (event: MouseEvent) => {
      const newWidth = Math.max(MIN_COL_WIDTH, startWidth + event.clientX - startX);
      setColumnWidths((w) => ({ ...w, [header]: newWidth }));
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      headers.every((header, idx) => {
        if (visibleColumns[header] === false) return true;
        const filter = filters[header];
        if (!filter) return true;
        const cell = row[idx] || "";
        const numeric = /^\d+(?:\.\d+)?$/.test(cell);
        if (numeric && /^\d+(?:\.\d+)?$/.test(filter)) {
          return Number(cell) >= Number(filter);
        }
        return cell.toLowerCase().includes(filter.toLowerCase());
      }),
    );
  }, [rows, headers, filters, visibleColumns]);

  const searchedRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return filteredRows;
    return filteredRows.filter((row) =>
      row.some((c, idx) =>
        (visibleColumns[headers[idx]] !== false ? c.toLowerCase().includes(term) : false),
      ),
    );
  }, [filteredRows, q, headers, visibleColumns]);

  const sortedRows = useMemo(() => {
    if (!sortedColumn) return searchedRows;
    const idx = headers.indexOf(sortedColumn);
    if (idx === -1) return searchedRows;
    const sorted = [...searchedRows].sort((a, b) => {
      const av = a[idx] || "";
      const bv = b[idx] || "";
      const aNum = Number.parseFloat(av);
      const bNum = Number.parseFloat(bv);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }
      return sortDirection === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
    return sorted;
  }, [searchedRows, headers, sortedColumn, sortDirection]);

  const nameIdx = useMemo(
    () => headers.findIndex((h) => /name/i.test(h)),
    [headers],
  );
  const titleIdx = useMemo(
    () => headers.findIndex((h) => /title|role/i.test(h)),
    [headers],
  );
  const companyIdx = useMemo(
    () => headers.findIndex((h) => /company/i.test(h)),
    [headers],
  );
  // Image URLs extracted from raw CSV prior to filtering out the image column
  const imageIdx = -1;

  return (
    <div className="w-full bg-white text-gray-900 dark:bg-black dark:text-white border border-border rounded-lg overflow-hidden p-2 sm:p-4">
      <div className="flex items-center justify-between gap-4 p-2 sm:p-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border pl-8 pr-2 py-1.5 text-sm"
              placeholder="Search people and companies"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2 space-y-2">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <span className="w-32 text-xs">{header}</span>
                  <input
                    className="flex-1 rounded border px-2 py-1 text-xs"
                    placeholder="Filter"
                    value={filters[header] || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, [header]: e.target.value })
                    }
                  />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Eye className="h-4 w-4" />
                <span>Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2 space-y-1">
              {headers.map((header) => {
                const visible = visibleColumns[header] !== false;
                return (
                  <DropdownMenuItem
                    key={header}
                    onSelect={(e) => {
                      e.preventDefault();
                      setVisibleColumns((v) => ({ ...v, [header]: !visible }));
                    }}
                    className="flex items-center gap-2"
                  >
                    {visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs">{header}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {headers.map((header) => (
                <DropdownMenuItem
                  key={header}
                  onSelect={() => setSortedColumn(header)}
                >
                  {header}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={() =>
                  setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
                }
              >
                Direction: {sortDirection === "asc" ? "Ascending" : "Descending"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <span>Actions</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  const filteredHeaders = headers.filter((h) => visibleColumns[h] !== false);
                  const dataRows = sortedRows.map((r) => r.filter((_, i) => visibleColumns[headers[i]] !== false));
                  const csvOut = unparse([filteredHeaders, ...dataRows]);
                  const blob = new Blob([csvOut], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'webset.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <EnrichmentDialog
            headers={headers}
            variant={variant}
            trigger={<Button size="sm" className="h-8 gap-1"><Zap className="h-4 w-4" /><span>Add Enrichment</span></Button>}
            onConfirm={async ({ mode, targetColumn, newColumnName, sourceField }) => {
              if (variant !== 'people') {
                try { toast.error('Enrichment is supported for people tables only right now'); } catch {}
                return;
              }
              try {
                setEnriching(true);
                // Parse current CSV
                const parsed = parse<string[]>(csv || '', { skipEmptyLines: true });
                const rawHeaders = parsed.data[0] as string[];
                const dataRows = parsed.data.slice(1) as string[][];

                // Ensure we have a linkedin_url column to key enrichment
                const linkedinIdx = rawHeaders.findIndex((h) => /linkedin_url/i.test(h));
                if (linkedinIdx === -1) {
                  try { toast.error('No linkedin_url column found to enrich by'); } catch {}
                  setEnriching(false);
                  return;
                }

                // Determine target column
                let targetHeader = targetColumn || '';
                let targetIdx = rawHeaders.indexOf(targetHeader);
                if (mode === 'new') {
                  targetHeader = newColumnName || sourceField;
                  if (!targetHeader) {
                    try { toast.error('Please enter a new column name'); } catch {}
                    setEnriching(false);
                    return;
                  }
                  if (rawHeaders.includes(targetHeader)) {
                    targetIdx = rawHeaders.indexOf(targetHeader);
                  } else {
                    rawHeaders.push(targetHeader);
                    targetIdx = rawHeaders.length - 1;
                    dataRows.forEach((r) => r.push(''));
                  }
                } else if (mode === 'existing') {
                  if (!targetHeader) {
                    try { toast.error('Choose a column to enrich'); } catch {}
                    setEnriching(false);
                    return;
                  }
                  targetIdx = rawHeaders.indexOf(targetHeader);
                  if (targetIdx === -1) {
                    try { toast.error('Target column not found'); } catch {}
                    setEnriching(false);
                    return;
                  }
                }

                // Identify rows missing values for target column
                const missingRows = dataRows
                  .map((r, i) => ({ row: r, i }))
                  .filter(({ row }) => !((row[targetIdx] || '').trim()));

                if (missingRows.length === 0) {
                  try { toast.info('Nothing to enrich — column already filled'); } catch {}
                  setEnriching(false);
                  return;
                }

                // Batch by 25 linkedin urls
                const urlToIndexes: Record<string, number[]> = {};
                const urls: string[] = [];
                for (const { row, i } of missingRows) {
                  const url = (row[linkedinIdx] || '').trim();
                  if (!url) continue;
                  urls.push(url);
                  if (!urlToIndexes[url]) {
                    urlToIndexes[url] = [];
                  }
                  urlToIndexes[url].push(i);
                }
                if (!urls.length) {
                  try { toast.error('No LinkedIn URLs found in missing rows'); } catch {}
                  setEnriching(false);
                  return;
                }

                const batches: string[][] = [];
                for (let i = 0; i < urls.length; i += 25) batches.push(urls.slice(i, i + 25));

                const enriched: any[] = [];
                for (const b of batches) {
                  const res = await fetch('/api/cerch/people/enrich/basic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ linkedin_urls: b }),
                  });
                  const json = await res.json();
                  if (json?.ok && Array.isArray(json.profiles)) {
                    enriched.push(...json.profiles);
                  }
                }

                // Build lookup from enriched
                const idxByUrl: Record<string, any> = {};
                for (const p of enriched) {
                  const k = (p.linkedin_url || p.linkedin_flagship_url || '').trim();
                  if (k) idxByUrl[k] = p;
                }

                // Helper to read the selected field
                const readField = (p: any): string => {
                  switch (sourceField) {
                    case 'profile_image_url':
                      return p.profile_image_url || p.profile_picture_url || '';
                    case 'description':
                      return p.description || p.headline || '';
                    case 'location':
                      return p.location || '';
                    case 'linkedin_url':
                      return p.linkedin_url || p.linkedin_flagship_url || '';
                    default:
                      return '';
                  }
                };

                // Fill the values
                let fillCount = 0;
                for (let i = 0; i < dataRows.length; i++) {
                  const url = (dataRows[i][linkedinIdx] || '').trim();
                  const p = idxByUrl[url] || idxByUrl[(url || '').replace('https://www.', 'https://')] || idxByUrl[(url || '').replace('http://', 'https://')];
                  if (!p) continue;
                  if (!((dataRows[i][targetIdx] || '').trim())) {
                    const val = readField(p);
                    if (val) {
                      dataRows[i][targetIdx] = val;
                      fillCount++;
                    }
                  }
                }

                const newCsv = unparse([rawHeaders, ...dataRows]);
                onSaveContent(newCsv, false);
                try { toast.success(`Enriched ${fillCount} cells`); } catch {}
              } catch (e) {
                try { toast.error('Enrichment failed'); } catch {}
              } finally {
                setEnriching(false);
              }
            }}
          />
        </div>
      </div>
      <div className="overflow-auto">
        <Table className="table-fixed">
          <colgroup>
            <col style={{ width: 48 }} />
            {headers.map((h) => {
              const isName = /(^|\b)name(\b|$)/i.test(h);
              const w = columnWidths[h] ?? (isName ? NAME_DEFAULT_WIDTH : DEFAULT_COL_WIDTH);
              return <col key={`col-${h}`} style={{ width: w }} />;
            })}
            <col style={{ width: 48 }} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-white dark:bg-black w-12 text-center px-4 py-2 font-bold border-r border-b border-border">
                #
              </TableHead>
              {headers.map((header) => (
                <TableHead
                  key={header}
                  style={{ width: columnWidths[header] ?? (/\bname\b/i.test(header) ? NAME_DEFAULT_WIDTH : DEFAULT_COL_WIDTH) }}
                  className="px-4 py-2 font-bold border-r border-b border-border bg-muted dark:bg-black sticky top-0 z-10"
                >
                  <div className="flex items-center justify-between gap-2 cursor-pointer select-none" onClick={() => {
                    if (sortedColumn === header) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    else setSortedColumn(header);
                  }}>
                    <span className="text-xs font-bold capitalize">
                      {visibleColumns[header] === false ? (
                        <span className="line-through opacity-50">{formatHeader(header)}</span>
                      ) : (
                        formatHeader(header)
                      )}
                    </span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      className="absolute right-0 top-0 h-full w-4 cursor-col-resize select-none"
                      onMouseDown={startResizing(header)}
                    />
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10 px-4 py-2 border-b border-border">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {sortedRows.map((row, rowIdx) => (
                <TableRow key={row.join("|") || rowIdx} className="border-border">
                <TableCell className="sticky left-0 bg-white dark:bg-black z-10 text-center text-sm text-muted-foreground px-4 py-2 border-r border-border">
                  {rowIdx + 1}
                </TableCell>
                {row.map((cell, cellIdx) => {
                  const header = headers[cellIdx] || "";
                  if (visibleColumns[header] === false) return null;
                  const isValidator = header
                    .toLowerCase()
                    .includes("direct competitor");
                  const isUrl = header.toLowerCase().includes("url");
                  const isLogo = header.toLowerCase().match(/image|avatar|logo/);
                  const isName = cellIdx === nameIdx;
                  const content = cell || "";
                  return (
                    <TableCell
                      key={`${headers[cellIdx] ?? cellIdx}-${content}`}
                      style={{ width: columnWidths[header] ?? (/\bname\b/i.test(header) ? NAME_DEFAULT_WIDTH : DEFAULT_COL_WIDTH) }}
                      className="text-sm px-4 py-2 border-r border-border overflow-hidden whitespace-nowrap"
                    >
                      {isLogo ? (
                        content && (
                          <Avatar className="h-8 w-8 border-2 border-violet-800">
                            <AvatarImage
                              src={content}
                              alt={row[nameIdx] ?? ""}
                              onError={(e) => {
                                // Hide broken image to reveal fallback initial
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <AvatarFallback>
                              {(row[nameIdx]?.[0] ?? '').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )
                      ) : isName ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8 bg-gray-100 dark:bg-gray-800 border-2 border-violet-800">
                            {imageUrls[rowIdx] ? (
                              <AvatarImage
                                src={imageUrls[rowIdx]}
                                alt={row[nameIdx] ?? ''}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <AvatarFallback>
                              {(row[nameIdx]?.[0] ?? '').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{content}</div>
                            {(titleIdx >= 0 || companyIdx >= 0) && (
                              <div className="text-xs text-muted-foreground truncate">
                                {[titleIdx >= 0 ? row[titleIdx] : null, companyIdx >= 0 ? row[companyIdx] : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : isValidator ? (
                        content.toLowerCase() === "true" ||
                        content.toLowerCase() === "match" ||
                        content === "1" ? (
                          <Badge
                            className="h-6 px-3 rounded bg-green-500 text-white text-xs font-semibold"
                            aria-label="Validation status: match"
                          >
                            MATCH
                          </Badge>
                        ) : (
                          content && (
                            <Badge
                              variant="secondary"
                              className="h-6 px-3 rounded text-xs font-semibold"
                              aria-label="Validation status: mismatch"
                            >
                              Mismatch
                            </Badge>
                          )
                        )
                      ) : isUrl ? (
                        <a
                          href={content}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={content}
                          className="text-blue-600 underline truncate block w-full"
                        >
                          {content}
                        </a>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block w-full">
                              {content}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{content}</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="px-4 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      // Try to open the most relevant profile URL if present
                      const urlIdx = headers.findIndex((h) => /linkedin|website|company_url|url/i.test(h));
                      const link = urlIdx >= 0 ? row[urlIdx] : '';
                      if (link) window.open(link, '_blank');
                    }}
                    title="Open profile"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {onLoadMore && (
        <div className="flex justify-center p-2 sm:p-4 border-t border-border">
          <Button variant="outline" className="rounded-full px-6" onClick={onLoadMore}>
            Find more results
          </Button>
        </div>
      )}
    </div>
  );
}
