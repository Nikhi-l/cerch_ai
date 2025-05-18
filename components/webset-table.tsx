"use client";
import { parse } from "papaparse";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, Code, Filter, Maximize2, Plus, SlidersHorizontal, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useMemo } from "react";

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

  return (
    <div className="w-full bg-[#1e1a2e] text-gray-200 min-h-screen">
      <div className="flex items-center justify-between p-4 border-b border-[#2d2640]">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 bg-[#2d2640] border-[#3d3654] text-gray-300 hover:bg-[#3d3654] hover:text-white"
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 bg-[#2d2640] border-[#3d3654] text-gray-300 hover:bg-[#3d3654] hover:text-white"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Sort</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 bg-[#2d2640] border-[#3d3654] text-gray-300 hover:bg-[#3d3654] hover:text-white"
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
                className="h-8 gap-1 bg-[#2d2640] border-[#3d3654] text-gray-300 hover:bg-[#3d3654] hover:text-white"
              >
                <span>Actions</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#2d2640] border-[#3d3654] text-gray-200">
              <DropdownMenuItem className="hover:bg-[#3d3654] focus:bg-[#3d3654]">Export</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#3d3654] focus:bg-[#3d3654]">Share</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#3d3654] focus:bg-[#3d3654]">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8 gap-1 bg-[#8a57db] hover:bg-[#9a67eb] text-white">
            <Zap className="h-4 w-4" />
            <span>Add Enrichment</span>
          </Button>
        </div>
      </div>
      <div className="overflow-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="border-b border-[#2d2640]">
              <TableHead className="w-12 text-center text-gray-400 font-normal">#</TableHead>
              {headers.map((header, idx) => (
                <TableHead key={idx} className="min-w-[150px] text-gray-400 font-normal">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{header}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#3d3654]"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={rowIdx} className="border-b border-[#2d2640] hover:bg-[#2d2640]">
                <TableCell className="text-center text-sm text-gray-400">{rowIdx + 1}</TableCell>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx} className="text-gray-300">
                    {cell}
                  </TableCell>
                ))}
                <TableCell>
                  {rowIdx === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#3d3654]"
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
      <div className="flex justify-center p-4 border-t border-[#2d2640]">
        <Button variant="outline" className="rounded-full px-6 bg-[#2d2640] border-[#3d3654] hover:bg-[#3d3654]">
          <span className="text-[#a57eeb]">Find more results</span>
        </Button>
      </div>
    </div>
  );
}
