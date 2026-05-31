Server-side upload validation and recommendations

Server-side duration check
- The project contains an optional server-side video duration check using `ffprobe`.
- The helper is located at `src/lib/media/ffprobe.ts` and exposes `getVideoDuration(buffer, fileHint)` which returns the video duration in seconds or `null` if the duration could not be determined.
- The upload route `src/app/api/choreographer/upload/route.ts` uses this helper to reject videos longer than `maxDuration` (300 seconds) if `ffprobe` is available in the runtime environment.

How to enable ffprobe in production
- Install `ffmpeg` / `ffprobe` on your server (apt, yum, brew, or use a lightweight static binary). Ensure `ffprobe` is on `PATH` so the node process can execute it.
- Example (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install -y ffmpeg
```

Local development
- If you don't have ffprobe locally, the helper falls back to a `null` duration and the upload route will accept the file. To enable strict validation locally install `ffmpeg`.

Testing
- Unit tests for `getVideoDuration` are present in `tests/ffprobe.test.ts` and mock `child_process.execFile` to avoid requiring an actual `ffprobe` binary in CI.

Production considerations
- Running `ffprobe` requires writing the uploaded file to disk temporarily. Ensure your runtime allows writing to a temporary directory and that disk usage is monitored.
- For large files or high upload rates, consider validating duration asynchronously (e.g., accept upload, enqueue a job to validate/transcode, and mark status in DB) or use a worker/transcoder service.

Resumable/chunked uploads
- For files >50MB consider a resumable/chunked upload flow with per-chunk signed URLs and server-side assembly. This is not implemented in-code but is recommended in `INFRASTRUCTURE.md`.
