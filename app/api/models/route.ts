import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Cache the model list for an hour to avoid hammering OpenRouter on every open.
let cached: { data: unknown; at: number } | null = null;
const TTL = 60 * 60 * 1000;

export async function GET() {
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter models request failed (${res.status})` },
        { status: res.status },
      );
    }
    const json = await res.json();
    cached = { data: json, at: Date.now() };
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch models: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
