import { NextResponse } from 'next/server';

const events: any[] = [];

export async function POST(request: Request) {
  const body = await request.json();
  events.push({ ...body, ts: Date.now() });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(events.slice(-100));
}

