import { NextRequest, NextResponse } from 'next/server';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

export async function PUT(request: NextRequest, { params }: any) {
  const { sessionId } = params as { sessionId: string };
  try {
    const form = await request.formData();
    const idxStr = form.get('index') as string | null;
    const chunk = form.get('chunk') as File | null;
    if (!chunk || !idxStr) return NextResponse.json({ error: 'Missing chunk or index' }, { status: 400 });
    const index = Number(idxStr);
    if (Number.isNaN(index)) return NextResponse.json({ error: 'Invalid index' }, { status: 400 });

    const dir = join(tmpdir(), `upload-session-${sessionId}`);
    await fs.mkdir(dir, { recursive: true });
    const chunkPath = join(dir, `chunk-${index}`);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await fs.writeFile(chunkPath, buffer);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('upload chunk error', err);
    return NextResponse.json({ error: 'Failed to upload chunk' }, { status: 500 });
  }
}
