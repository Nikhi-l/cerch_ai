"use client";
import { parse, unparse } from "papaparse";
import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";

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

interface WebsetTableProps {
  csv: string;
  variant?: 'people' | 'company' | 'webset';
  autoHideEmptyColumns?: boolean;
  hideImageUrlColumns?: boolean;
}

export function WebsetTable({
  csv,
  variant,
  autoHideEmptyColumns,
  hideImageUrlColumns,
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
  const [columnWidths, setColumnWidths] =
    useState<Record<string, number>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  const startResizing = (header: string) => (e: ReactMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[header] ?? 150;
    const onMouseMove = (event: MouseEvent) => {
      const newWidth = Math.max(100, startWidth + event.clientX - startX);
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
    <div className="w-full bg-white text-gray-900 border border-border rounded-lg overflow-hidden p-2 sm:p-4">
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
          <Button size="sm" className="h-8 gap-1">
            <Zap className="h-4 w-4" />
            <span>Add Enrichment</span>
          </Button>
        </div>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-white w-12 text-center px-4 py-2 font-bold border-r border-b border-border">
                #
              </TableHead>
              {headers.map((header) => (
                <TableHead
                  key={header}
                  style={{ width: columnWidths[header] ?? 150 }}
                  className="px-4 py-2 font-bold border-r border-b border-border bg-muted sticky top-0 z-10"
                >
                  <div className="flex items-center justify-between gap-2 cursor-pointer select-none" onClick={() => {
                    if (sortedColumn === header) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    else setSortedColumn(header);
                  }}>
                    <span className="text-xs font-bold">
                      {visibleColumns[header] === false ? (
                        <span className="line-through opacity-50">{header}</span>
                      ) : (
                        header
                      )}
                    </span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
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
                <TableCell className="sticky left-0 bg-white z-10 text-center text-sm text-muted-foreground px-4 py-2 border-r border-border">
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
                      style={{ width: columnWidths[header] ?? 150 }}
                      className="text-sm px-4 py-2 border-r border-border overflow-hidden whitespace-nowrap"
                    >
                      {isLogo ? (
                        content && (
                          <Avatar className="h-8 w-8">
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
                          <Avatar className="h-8 w-8 bg-gray-100">
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
                          className="text-blue-600 underline"
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
      <div className="flex justify-center p-2 sm:p-4 border-t border-border">
        <Button variant="outline" className="rounded-full px-6">
          Find more results
        </Button>
      </div>
    </div>
  );
}
