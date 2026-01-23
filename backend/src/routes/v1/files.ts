import { Router } from "express";
import multer from "multer";
import { require_auth } from "../../middleware/auth.js";
import { env } from "../../env.js";
import { FileService, S3StorageService } from "../../models/File.js";
import { pool } from "../../db/db.js";

const router = Router();

// Multer: čita multipart/form-data u memoriju (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB (prilagodi)
  }
});

// Inicijalizacija file servisa
const storage = new S3StorageService(env.S3_BUCKET_NAME);
const fileService = new FileService(storage);

/**
 * POST /api/v1/files
 * Upload file -> S3 + StoredFiles, vrati file_id
 *
 * Form-data:
 * - file: <binary>
 */
router.post("/", require_auth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing file (field name must be 'file')" });
  }

  try {
    const stored = await fileService.uploadAndSave({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // frontend treba spremiti stored.id
    return res.status(201).json({
      file_id: stored.id,
      original_name: stored.originalName,
      mime_type: stored.mimeType,
      size: stored.size
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to upload file" });
  }
});

/**
 * GET /api/v1/files/:id/url
 * Vrati signed URL za download (preko file_id)
 */
router.get("/:id/url", require_auth, async (req, res) => {
  const fileId = req.params.id;

  try {
    const r = await pool.query(
      `SELECT file_id, bucket, key, original_name, mime_type, size, created_at
       FROM storedfiles
       WHERE file_id = $1`,
      [fileId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const row = r.rows[0];

    // Napomena: vaš StoredFile constructor je private, pa ovdje možemo "ručno"
    // složiti minimalni objekt koji getDownloadUrl treba (key je najbitniji).
    const fakeStoredFile: any = {
      id: row.file_id,
      bucket: row.bucket,
      key: row.key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.size),
      createdAt: new Date(row.created_at)
    };

    const url = await fileService.getDownloadUrl(fakeStoredFile);
    return res.json({ url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create download url" });
  }
});

export default router;
