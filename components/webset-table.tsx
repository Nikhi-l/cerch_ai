'use client';
import { parse } from 'papaparse';
import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  ChevronDown,
  Code,
  Filter,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';

interface WebsetTableProps {
  csv: string;
  onDelete: () => void;
}

export function WebsetTable({ csv, onDelete }: WebsetTableProps) {
  const { headers, rows } = useMemo(() => {
    const parsed = parse<string[]>(csv || '', { skipEmptyLines: true });
    const data = parsed.data as string[][];
    const headers = data.length > 0 ? data[0] : [];
    const rows = data.length > 1 ? data.slice(1) : [];
    return { headers, rows };
  }, [csv]);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortedColumn, setSortedColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [verification, setVerification] = useState<
    Record<number, 'match' | 'miss'>
  >({});

  const handleExport = async () => {
    if (!window.confirm('Export table as CSV?')) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    try {
      if ('showSaveFilePicker' in window) {
        // @ts-ignore: File System Access API
        const handle = await window.showSaveFilePicker({
          suggestedName: 'webset.csv',
          types: [
            { description: 'CSV Files', accept: { 'text/csv': ['.csv'] } },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'webset.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed', error);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else {
        window.prompt('Share this link', shareUrl);
      }
    } catch {
      window.prompt('Share this link', shareUrl);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this webset data?')) {
      onDelete();
    }
  };

  const startResizing = (header: string) => (e: ReactMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[header] ?? 150;
    const onMouseMove = (event: MouseEvent) => {
      const newWidth = Math.max(100, startWidth + event.clientX - startX);
      setColumnWidths((w) => ({ ...w, [header]: newWidth }));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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
      const aNum = Number.parseFloat(av);
      const bNum = Number.parseFloat(bv);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      return sortDirection === 'asc'
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
    return sorted;
  }, [filteredRows, headers, sortedColumn, sortDirection]);

  const nameIdx = useMemo(
    () => headers.findIndex((h) => h.toLowerCase().includes('name')),
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
                  setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                }
              >
                Direction:{' '}
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Code className="h-4 w-4" />
                <span>Get Code</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-[600px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Integration Code</AlertDialogTitle>
              </AlertDialogHeader>
              <pre className="mt-4 bg-muted p-4 rounded-md text-sm overflow-x-auto">
                {`import os
import requests

api_key = os.getenv('CRUSTDATA_API_KEY')
headers = {
    "x-api-key": api_key,
    "content-type": "application/json",
}

payload = {
    "search": {
        "query": "software engineer in SF",
        "criteria": [
            "Currently employed or self-identifies as a software engineer",
            "located in san francisco, ca",
        ],
        "count": 25,
    },
    "enrichments": [
        # "email",            # Business email enrichment
        # "realtime",         # Real-time enrichment
        # "basic_profile",    # Basic profile enrichment
        # "linkedin_posts",   # Recent LinkedIn posts
        # "company",          # Company enrichment
    ],
}

response = requests.post(
    "https://api.crustdata.com/websets",
    json=payload,
    headers=headers,
)
webset = response.json()`}
              </pre>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              <DropdownMenuItem onSelect={handleExport}>
                Export
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleShare}>Share</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <Zap className="h-4 w-4" />
                <span>Add Enrichment</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Email Enrichment</DropdownMenuItem>
              <DropdownMenuItem>Real-time Enrichment</DropdownMenuItem>
              <DropdownMenuItem>Basic Profile Enrichment</DropdownMenuItem>
              <DropdownMenuItem>LinkedIn Posts Enrichment</DropdownMenuItem>
              <DropdownMenuItem>Company Enrichment</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center px-4 py-2 font-bold border-r border-b border-border">
                #
              </TableHead>
              {headers.map((header) => (
                <TableHead
                  key={header}
                  style={{ width: columnWidths[header] ?? 150 }}
                  className="relative px-4 py-2 font-bold border-r border-b border-border bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{header}</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
                      onMouseDown={startResizing(header)}
                    />
                  </div>
                </TableHead>
              ))}
              <TableHead className="px-4 py-2 border-b border-border">
                Verify
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, rowIdx) => (
              <TableRow key={row.join('|') || rowIdx} className="border-border">
                <TableCell className="text-center text-sm text-muted-foreground px-4 py-2 border-r border-border">
                  {rowIdx + 1}
                </TableCell>
                {row.map((cell, cellIdx) => {
                  const header = headers[cellIdx] || '';
                  const isValidator = header
                    .toLowerCase()
                    .includes('direct competitor');
                  const isUrl = header.toLowerCase().includes('url');
                  const isLogo = header
                    .toLowerCase()
                    .match(/image|avatar|logo/);
                  const isName = cellIdx === nameIdx;
                  const content = cell || '';
                  return (
                    <TableCell
                      key={`${headers[cellIdx] ?? cellIdx}-${content}`}
                      style={{ width: columnWidths[header] ?? 150 }}
                      className="text-sm px-4 py-2 border-r border-border overflow-hidden"
                    >
                      {isLogo ? (
                        content && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={content}
                              alt={row[nameIdx] ?? ''}
                            />
                            <AvatarFallback>
                              {row[nameIdx]?.[0] ?? ''}
                            </AvatarFallback>
                          </Avatar>
                        )
                      ) : isName ? (
                        <span className="font-medium">{content}</span>
                      ) : isValidator ? (
                        content.toLowerCase() === 'true' ||
                        content.toLowerCase() === 'match' ||
                        content === '1' ? (
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
                <TableCell className="px-4 py-2 text-center">
                  <Button
                    className={
                      verification[rowIdx] === 'match'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : verification[rowIdx] === 'miss'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }
                    onClick={() =>
                      setVerification((v) => ({
                        ...v,
                        [rowIdx]: Math.random() > 0.5 ? 'match' : 'miss',
                      }))
                    }
                  >
                    {verification[rowIdx] === 'match'
                      ? 'Match'
                      : verification[rowIdx] === 'miss'
                      ? 'Miss'
                      : 'Verify'}
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
