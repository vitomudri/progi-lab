import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { pool } from "../db/db.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

//s3 client based on env variables
const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY
  },
  forcePathStyle: true
});

//represents file whose instance gets saved in the db
export class StoredFile {
  private constructor(
    public readonly id: string,
    public readonly bucket: string,
    public readonly key: string,
    public readonly originalName: string,
    public readonly mimeType: string, //format type/subtype (eg. text/plain)
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

//initialize first
export class S3StorageService {
  constructor(private bucket: string, private client : S3Client = s3) {}

  async upload(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
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

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds
    });
  }

  getBucket(): string {
    return this.bucket;
  }
}

//initialize after S3StorageService
export class FileService {
  constructor(
    private storage: S3StorageService
  ) {}

  //URL to a file in a bucket
  async getDownloadUrl(file: StoredFile): Promise<string> {
    return this.storage.getSignedDownloadUrl(file.key);
  }

  //takes in a buffer for a file, creates new StoredFile, saves it in the db, uploads to s3 bucket
  async uploadAndSave(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<StoredFile> {
    const key = `${crypto.randomUUID()}-${input.originalName}`;

    await this.storage.upload(key, input.buffer, input.mimeType);

    const file = StoredFile.create({
      bucket: this.storage.getBucket(),
      key,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size
    });

    try {
      await StoredFile.save(file);
    } catch (error) {
      // Attempt to clean up the orphaned S3 object
      await this.storage.delete(key);
      // Re-throw the original error to the caller
      throw error;
    }

    return file;
  }
}