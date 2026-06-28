import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Saves a base64 string to a temporary file on disk.
 * Supports standard base64 strings and Data URLs (e.g. data:image/png;base64,...).
 */
export async function saveBase64File(
  base64Str: string,
  customExtension?: string
): Promise<{ fileName: string; fileSize: number }> {
  let mimeType = "";
  let extension = customExtension || "";
  let base64Data = base64Str;

  // 1. Detect if it's a Data URL and parse it
  if (base64Str.startsWith("data:")) {
    const matches = base64Str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];

      if (!extension) {
        // Map common MIME types to extensions
        if (mimeType === "image/jpeg" || mimeType === "image/jpg") extension = "jpg";
        else if (mimeType === "image/png") extension = "png";
        else if (mimeType === "image/gif") extension = "gif";
        else if (mimeType === "image/webp") extension = "webp";
        else if (mimeType === "video/mp4") extension = "mp4";
        else if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") extension = "mp3";
        else if (mimeType === "audio/m4a") extension = "m4a";
        else if (mimeType === "application/pdf") extension = "pdf";
        else {
          const parts = mimeType.split("/");
          extension = parts[1] || "bin";
        }
      }
    }
  }

  // 2. Ensure temporary directory exists
  const tempDir = path.join(process.cwd(), "temp_uploads");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 3. Generate random unique file name
  const fileId = crypto.randomUUID();
  const fileName = extension ? `${fileId}.${extension}` : fileId;
  const filePath = path.join(tempDir, fileName);

  // 4. Convert base64 data to binary buffer and write to disk
  const buffer = Buffer.from(base64Data, "base64");
  fs.writeFileSync(filePath, buffer);

  // 5. Trigger background cleanup asynchronously
  cleanUpTempDir().catch((err) =>
    console.error("[Temp Cleanup] Background error during directory size sweep:", err)
  );

  return { fileName, fileSize: buffer.length };
}

/**
 * Sweeps the temporary directory and deletes the oldest files
 * if the total directory size exceeds the limit defined in environment variables.
 */
export async function cleanUpTempDir(): Promise<void> {
  const tempDir = path.join(process.cwd(), "temp_uploads");
  if (!fs.existsSync(tempDir)) return;

  const maxDirSizeMb = parseInt(process.env.MAX_TEMP_DIR_SIZE_MB || "500", 10);
  const maxDirSizeBytes = maxDirSizeMb * 1024 * 1024;

  try {
    const files = fs.readdirSync(tempDir);
    let totalSizeBytes = 0;
    
    const fileStats = files.map((file) => {
      const filePath = path.join(tempDir, file);
      const stat = fs.statSync(filePath);
      totalSizeBytes += stat.size;
      return { file, filePath, mtime: stat.mtimeMs, size: stat.size };
    });

    // If total size exceeds max size limit, start pruning oldest files
    if (totalSizeBytes > maxDirSizeBytes) {
      console.log(
        `[Temp Cleanup] Directory size (${(totalSizeBytes / 1024 / 1024).toFixed(
          2
        )} MB) exceeds limit (${maxDirSizeMb} MB). Initiating pruning...`
      );

      // Sort files by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime - b.mtime);

      let bytesDeleted = 0;
      const targetSize = maxDirSizeBytes * 0.8; // Prune until we hit 80% of maximum size
      let currentSize = totalSizeBytes;

      for (const stat of fileStats) {
        if (currentSize <= targetSize) break;
        try {
          fs.unlinkSync(stat.filePath);
          currentSize -= stat.size;
          bytesDeleted += stat.size;
          console.log(`[Temp Cleanup] Pruned oldest file: ${stat.file} (${(stat.size / 1024).toFixed(1)} KB)`);
        } catch (unlinkErr) {
          console.error(`[Temp Cleanup] Failed to delete file ${stat.filePath}:`, unlinkErr);
        }
      }

      console.log(
        `[Temp Cleanup] Cleanup completed. Pruned total ${(bytesDeleted / 1024 / 1024).toFixed(
          2
        )} MB. Current size: ${(currentSize / 1024 / 1024).toFixed(2)} MB`
      );
    }
  } catch (err) {
    console.error("[Temp Cleanup] Critical error during directory cleanup sweep:", err);
  }
}
