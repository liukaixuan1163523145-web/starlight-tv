import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/api-guard';
import { getMDBFeed } from '@/lib/mdblist';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  const guarded = guardRequest(req); if (guarded) return guarded;
  const params = new URL(req.url).searchParams;
  const type = params.get('type') === 'show' ? 'show' : 'movie';
  try { return NextResponse.json(await getMDBFeed(type), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'MDBList 暂时不可用' }, { status: 502 }); }
}
