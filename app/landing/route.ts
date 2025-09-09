import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'landing.html');
    const html = await readFile(filePath, 'utf8');
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    const msg = '<!doctype html><html><body><h1>Landing page not found</h1></body></html>';
    return new NextResponse(msg, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

