import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/api-guard';
import { cacheStats, warmCacheStep, pauseCacheWarm } from '@/lib/tv-cache-library';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req: Request){const denied=guardRequest(req);if(denied)return denied;return NextResponse.json(await cacheStats(),{headers:{'Cache-Control':'private, no-store'}});}
export async function POST(req: Request){
 const denied=guardRequest(req);if(denied)return denied;
 if(req.headers.get('origin') && new URL(req.headers.get('origin')!).host!==new URL(req.url).host)return NextResponse.json({error:'Invalid origin'},{status:403});
 try {const body=await req.json();if(body.action==='pause'){pauseCacheWarm(true);return NextResponse.json({paused:true});}if(body.action==='resume'){pauseCacheWarm(false);return NextResponse.json({paused:false});}if(body.action!=='step'&&body.action!=='posters')return NextResponse.json({error:'Invalid action'},{status:400});return NextResponse.json(await warmCacheStep(body.action==='posters'));}
 catch{return NextResponse.json({error:'缓存任务暂时未完成，已有数据仍可用'},{status:502});}
}
