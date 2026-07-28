import { NextRequest } from 'next/server';
import { getSystemPrompt } from '@/lib/system-prompt';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const body = await req.json();
  const { messages, model } = body as {
    messages: { role: string; content: string }[];
    model: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          'OPENROUTER_API_KEY is not set. Add it to your environment variables to enable AI generation.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const systemPrompt = getSystemPrompt();
  const payload = {
    model: model || 'anthropic/claude-3.5-sonnet',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: 8000,
  };

  let upstream: Response;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://boltedit.vercel.app',
        'X-Title': 'BoltEdit',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Failed to reach OpenRouter: ${(err as Error).message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({
        error: `OpenRouter request failed (${upstream.status})`,
        detail: text,
      }),
      { status: upstream.status, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Pipe the SSE stream through, extracting just the content deltas.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let sseBuffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // ignore malformed keep-alive lines
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
