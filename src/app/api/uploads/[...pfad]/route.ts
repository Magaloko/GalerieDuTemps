import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join, extname, normalize, sep } from "path";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif":  "image/gif",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mov":  "video/quicktime",
  ".pdf":  "application/pdf",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ pfad: string[] }> }
) {
  const { pfad } = await ctx.params;
  if (!pfad || pfad.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
  const relPath   = pfad.join("/");
  const absPath   = normalize(join(uploadDir, relPath));

  // Path-Traversal-Schutz: Ziel muss unter uploadDir liegen
  const normalizedRoot = normalize(uploadDir + sep);
  if (!absPath.startsWith(normalizedRoot) && absPath !== normalize(uploadDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const info = await stat(absPath);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });

    const buffer = await readFile(absPath);
    const ext    = extname(absPath).toLowerCase();
    const type   = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":   type,
        "Content-Length": String(info.size),
        "Cache-Control":  "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
