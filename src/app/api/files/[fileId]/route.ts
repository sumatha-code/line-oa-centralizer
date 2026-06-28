import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const fileId = params.fileId;

  try {
    // 1. Sanitize file name to prevent directory traversal attacks
    const cleanFileId = path.basename(fileId);
    const filePath = path.join(process.cwd(), "temp_uploads", cleanFileId);

    // 2. Check if file exists
    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    // 3. Read file content
    const fileBuffer = fs.readFileSync(filePath);

    // 4. Determine Content-Type based on file extension
    const ext = path.extname(cleanFileId).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".webp":
        contentType = "image/webp";
        break;
      case ".mp4":
        contentType = "video/mp4";
        break;
      case ".mp3":
      case ".mpeg":
        contentType = "audio/mpeg";
        break;
      case ".m4a":
        contentType = "audio/mp4";
        break;
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".txt":
        contentType = "text/plain";
        break;
      default:
        contentType = "application/octet-stream";
    }

    // 5. Respond with file data and HTTP headers (cachable for 1 hour)
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error(`[File Server] Error serving file ${fileId}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
