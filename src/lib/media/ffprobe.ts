import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFile } from 'child_process';

export async function getVideoDuration(buffer: Buffer, fileHint = 'upload-temp'): Promise<number | null> {
  const tmpDir = tmpdir();
  const tmpPath = join(tmpDir, `${Date.now()}-${fileHint}`);
  try {
    await fs.writeFile(tmpPath, buffer);
  } catch (e) {
    return null;
  }

  return new Promise<number | null>((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', tmpPath],
      async (err, stdout) => {
        try {
          await fs.unlink(tmpPath).catch(() => {});
        } catch {}
        if (err) return resolve(null);
        const val = parseFloat(String(stdout).trim());
        if (Number.isFinite(val)) return resolve(val);
        return resolve(null);
      }
    );
  });
}

export default getVideoDuration;
