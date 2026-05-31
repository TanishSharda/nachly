// @ts-nocheck
import { vi, describe, it, expect } from 'vitest';

// Mock child_process.execFile before importing the helper
vi.mock('child_process', () => {
  return {
    execFile: (cmd: string, args: string[], cb: (err: any, stdout?: string) => void) => {
      // default mock; individual tests will override
      cb(null, '12.3');
    },
  };
});

import { getVideoDuration } from '../src/lib/media/ffprobe';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('getVideoDuration', () => {
  it('parses duration from ffprobe stdout', async () => {
    const buf = Buffer.from('dummy');
    const duration = await getVideoDuration(buf, 'test.mp4');
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThan(0);
  });

  it('returns null when ffprobe errors', async () => {
    // replace the mock to simulate an error
    const child = await import('child_process');
    (child.execFile as any) = (cmd: string, args: string[], cb: (err: any, stdout?: string) => void) => {
      cb(new Error('ffprobe not found'));
    };
    const buf = Buffer.from('dummy');
    const duration = await getVideoDuration(buf, 'test.mp4');
    expect(duration).toBeNull();
  });
});
