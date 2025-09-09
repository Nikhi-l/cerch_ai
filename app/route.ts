import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

const html = readFileSync(join(process.cwd(), 'landing.html'), 'utf8');

export async function GET() {
  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
