import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
// import { s3 } from "./s3.js";
import { pool } from "../db/db.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StoredFile {
  private constructor(
    public readonly id: string,
    public readonly bucket: string,
    public readonly key: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly createdAt: Date
  ) {}

  static create(props: {
    bucket: string;
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
  }): StoredFile {
    return new StoredFile(
      crypto.randomUUID(),
      props.bucket,
      props.key,
      props.originalName,
      props.mimeType,
      props.size,
      new Date()
    );
  }

  // getUrl(): string {
  //   return `https://${this.bucket}.s3.amazonaws.com/${this.key}`;
  // }

  static async save(file: StoredFile): Promise<void> {
    await pool.query(
      `
      INSERT INTO StoredFiles
        (file_id, bucket, key, original_name, mime_type, size, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        file.id,
        file.bucket,
        file.key,
        file.originalName,
        file.mimeType,
        file.size,
        file.createdAt
      ]
    );
  }
}

export class S3StorageService {
  constructor(private s3: S3Client, private bucket: string) {}

  async upload(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: expiresInSeconds
    });
  }
}

export class FileService {
  constructor(
    private storage: S3StorageService
  ) {}

  async getDownloadUrl(file: StoredFile): Promise<string> {
    return this.storage.getSignedDownloadUrl(file.key);
  }

  async uploadAndSave(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<StoredFile> {
    const key = `uploads/${crypto.randomUUID()}-${input.originalName}`;

    await this.storage.upload(key, input.buffer, input.mimeType);

    const file = StoredFile.create({
      bucket: this.storage["bucket"],
      key,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size
    });

    await StoredFile.save(file);

    return file;
  }
}