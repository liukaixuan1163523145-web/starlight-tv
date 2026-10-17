import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/api-guard';
import { getPoster } from '@/lib/poster-cache';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  const guarded = guardRequest(req); if (guarded) return guarded;
  try {
    const data = await getPoster(new URL(req.url).searchParams.get('url') || '');
    return new NextResponse(new Uint8Array(Buffer.from(data.body, 'base64')), { headers: { 'Content-Type': data.type, 'Cache-Control': 'private, max-age=604800', 'X-TV-Cache': data.cached ? 'HIT' : 'MISS', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new NextResponse('海报暂时不可用', { status: 502 }); }
}
