"use client";
import { parse } from "papaparse";
import { useMemo, useState } from "react";

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
import {
  ChevronDown,
  Code,
  Filter,
  Maximize2,
  Plus,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

interface WebsetTableProps {
  csv: string;
}

export function WebsetTable({ csv }: WebsetTableProps) {
  const { headers, rows } = useMemo(() => {
    const parsed = parse<string[]>(csv || "", { skipEmptyLines: true });
    const data = parsed.data as string[][];
    const headers = data.length > 0 ? data[0] : [];
    const rows = data.length > 1 ? data.slice(1) : [];
    return { headers, rows };
  }, [csv]);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortedColumn, setSortedColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      headers.every((header, idx) => {
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
  }, [rows, headers, filters]);

  const sortedRows = useMemo(() => {
    if (!sortedColumn) return filteredRows;
    const idx = headers.indexOf(sortedColumn);
    if (idx === -1) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
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
  }, [filteredRows, headers, sortedColumn, sortDirection]);

  const nameIdx = useMemo(
    () => headers.findIndex((h) => h.toLowerCase().includes("name")),
    [headers],
  );

  return (
    <div className="w-full bg-white text-gray-900 border border-border rounded-lg overflow-hidden p-2 sm:p-4">
      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-border gap-4">
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Code className="h-4 w-4" />
            <span>Get Code</span>
          </Button>
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
              <DropdownMenuItem>Export</DropdownMenuItem>
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
              <TableHead className="w-12 px-4 py-2 bg-blue-100 border-r border-border" />
              {headers.map((header, idx) => (
                <TableHead
                  key={header}
                  className="min-w-[150px] px-4 py-2 font-bold bg-blue-100 text-blue-700 border-r border-border"
                >
                  {idx + 1}
                </TableHead>
              ))}
              <TableHead className="w-10 px-4 py-2 bg-blue-100" />
            </TableRow>
            <TableRow>
              <TableHead className="w-12 text-center px-4 py-2 font-bold bg-blue-50 text-blue-700 border-r border-border">
                #
              </TableHead>
              {headers.map((header, idx) => (
                <TableHead
                  key={header}
                  className="min-w-[150px] px-4 py-2 font-bold bg-blue-50 text-blue-700 border-r border-border"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">
                      {idx + 1}. {header}
                    </span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10 px-4 py-2 bg-blue-50">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, rowIdx) => (
              <TableRow key={row.join("|") || rowIdx} className="border-border">
                <TableCell className="text-center text-sm text-muted-foreground px-4 py-2 border-r border-border">
                  {rowIdx + 1}
                </TableCell>
                {row.map((cell, cellIdx) => {
                  const header = headers[cellIdx] || "";
                  const isValidator = header
                    .toLowerCase()
                    .includes("direct competitor");
                  const isUrl = header.toLowerCase().includes("url");
                  const isLogo = header.toLowerCase().match(/image|avatar|logo/);
                  const isTags = header.toLowerCase().includes("tag");
                  const isName = cellIdx === nameIdx;
                  const content = cell || "";
                  return (
                    <TableCell
                      key={`${headers[cellIdx] ?? cellIdx}-${content}`}
                      className="text-sm px-4 py-2 border-r border-border"
                    >
                      {isLogo ? (
                        content && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={content} alt={row[nameIdx] ?? ""} />
                            <AvatarFallback>{row[nameIdx]?.[0] ?? ""}</AvatarFallback>
                          </Avatar>
                        )
                      ) : isName ? (
                        <span className="font-medium">{content}</span>
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
                      ) : isTags ? (
                        <div className="flex flex-wrap gap-1">
                          {content.split(",").map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-yellow-100 text-yellow-800"
                            >
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
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
                            <span className="line-clamp-1 block max-w-[200px]">
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
                  {rowIdx === 0 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  )}
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
