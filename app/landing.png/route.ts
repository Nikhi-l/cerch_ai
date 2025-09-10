import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function GET() {
  try {
    const filePath = fileURLToPath(new URL('../../landing.png', import.meta.url));
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e) {
    return new NextResponse('Not found', { status: 404 });
  }
}

