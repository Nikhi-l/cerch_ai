"use client";
import { parse } from "papaparse";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, Code, Filter, Maximize2, Plus, SlidersHorizontal, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      headers.every((header, idx) => {
        const filter = filters[header];
        if (!filter) return true;
        const cell = row[idx] || '';
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
      const av = a[idx] || '';
      const bv = b[idx] || '';
      const aNum = parseFloat(av);
      const bNum = parseFloat(bv);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      return sortDirection === 'asc'
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
    return sorted;
  }, [filteredRows, headers, sortedColumn, sortDirection]);

  return (
    <div className="w-full bg-artifact-background text-foreground min-h-screen">
      <div className="flex items-center justify-between p-4 border-b border-artifact-border">
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 bg-artifact-border border-artifact-border text-gray-300 hover:bg-artifact-border/80 hover:text-white"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-artifact-border border-artifact-border p-2 space-y-2">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <span className="w-32 text-xs">{header}</span>
                  <input
                    className="flex-1 rounded bg-artifact-background border border-artifact-border px-2 py-1 text-xs"
                    placeholder="Filter"
                    value={filters[header] || ''}
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
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 bg-artifact-border border-artifact-border text-gray-300 hover:bg-artifact-border/80 hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-artifact-border border-artifact-border">
              {headers.map((header) => (
                <DropdownMenuItem
                  key={header}
                  onSelect={() => setSortedColumn(header)}
                  className="cursor-pointer hover:bg-artifact-border/80 focus:bg-artifact-border/80"
                >
                  {header}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={() =>
                  setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                }
                className="cursor-pointer hover:bg-artifact-border/80 focus:bg-artifact-border/80"
              >
                Direction: {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 bg-artifact-border border-artifact-border text-gray-300 hover:bg-artifact-border/80 hover:text-white"
          >
            <Code className="h-4 w-4" />
            <span>Get Code</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 bg-artifact-border border-artifact-border text-gray-300 hover:bg-artifact-border/80 hover:text-white"
              >
                <span>Actions</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-artifact-border border-artifact-border text-gray-200">
              <DropdownMenuItem className="hover:bg-artifact-border/80 focus:bg-artifact-border/80">Export</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-artifact-border/80 focus:bg-artifact-border/80">Share</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-artifact-border/80 focus:bg-artifact-border/80">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8 gap-1 bg-artifact-heading hover:bg-artifact-heading/80 text-white">
            <Zap className="h-4 w-4" />
            <span>Add Enrichment</span>
          </Button>
        </div>
      </div>
      <div className="overflow-auto">
        <Table className="border-collapse">
          <TableHeader>
          <TableRow className="border-b border-artifact-border">
              <TableHead className="w-12 text-center text-artifact-heading font-normal">#</TableHead>
              {headers.map((header, idx) => (
                <TableHead key={idx} className="min-w-[150px] text-artifact-heading font-normal">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{header}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-artifact-border/80"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, rowIdx) => (
              <TableRow key={rowIdx} className="border-b border-artifact-border hover:bg-artifact-border/50">
                <TableCell className="text-center text-sm text-artifact-heading">{rowIdx + 1}</TableCell>
                {row.map((cell, cellIdx) => {
                  const header = headers[cellIdx] || '';
                  const isValidator = header.toLowerCase().includes('direct competitor');
                  const isUrl = header.toLowerCase().includes('url');
                  const content = cell || '';
                  return (
                    <TableCell key={cellIdx} className="text-gray-300">
                      {isValidator ? (
                        content.toLowerCase() === 'true' || content.toLowerCase() === 'match' || content === '1' ? (
                          <Badge
                            className="h-6 px-3 rounded-[4px] bg-[#2ECC71] text-white text-[12px] font-semibold flex items-center justify-center"
                            aria-label="Validation status: match"
                          >
                            MATCH
                          </Badge>
                        ) : (
                          content && (
                            <Badge
                              variant="secondary"
                              className="h-6 px-3 rounded-[4px] text-[12px] font-semibold flex items-center justify-center"
                              aria-label="Validation status: mismatch"
                            >
                              Mismatch
                            </Badge>
                          )
                        )
                      ) : isUrl ? (
                        <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                          {content}
                        </a>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-1 block max-w-[200px]">{content}</span>
                          </TooltipTrigger>
                          <TooltipContent>{content}</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell>
                  {rowIdx === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-artifact-border/80"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-center p-4 border-t border-artifact-border">
        <Button variant="outline" className="rounded-full px-6 bg-artifact-border border-artifact-border hover:bg-artifact-border/80">
          <span className="text-artifact-heading">Find more results</span>
        </Button>
      </div>
    </div>
  );
}
