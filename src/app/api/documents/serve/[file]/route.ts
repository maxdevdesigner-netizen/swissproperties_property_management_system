import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { inlineContentType, isSafeFileName } from "@/lib/files";

// Keep this folder outside the app directory: the live site has lost pictures, most likely in a redeploy.
// It's set at runtime, so the turbopackIgnore comments stop the build from bundling the project into the route.
const UPLOADS_DIR = path.resolve(/* turbopackIgnore: true */ process.env.UPLOADS_DIR ?? "uploads");

const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

export async function GET(_: Request, ctx: RouteContext<"/api/documents/serve/[file]">) {
  if (!(await getCurrentUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { file } = await ctx.params;
  if (!isSafeFileName(file)) return notFound();

  let fullPath: string;
  try {
    // Resolve symlinks so a link inside the folder can't point somewhere else on the server.
    const [root, real] = await Promise.all([
      realpath(/* turbopackIgnore: true */ UPLOADS_DIR),
      realpath(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ UPLOADS_DIR, file)),
    ]);
    if (!real.startsWith(root + path.sep) || !(await stat(real)).isFile()) return notFound();
    fullPath = real;
  } catch {
    return notFound();
  }

  const type = inlineContentType(file);
  const { size } = await stat(fullPath);
  return new Response(Readable.toWeb(createReadStream(fullPath)) as ReadableStream, {
    headers: {
      "Content-Type": type ?? "application/octet-stream",
      "Content-Length": String(size),
      "Content-Disposition": `${type ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
