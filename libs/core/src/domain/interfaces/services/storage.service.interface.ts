/**
 * Storage Service Interface (Port)
 * Defines contract for file storage operations
 */

export interface IStorageFile {
  /** Original filename */
  originalName: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** File buffer or stream */
  buffer: Buffer;
}

export interface IStoredFile {
  /** Unique file key/path in storage */
  key: string;
  /** Public URL to access the file */
  url: string;
  /** File size in bytes */
  size: number;
  /** SHA-256 checksum of the file */
  checksum: string;
  /** Checksum algorithm used */
  checksumAlgorithm: string;
  /** Storage bucket/container name */
  bucket: string;
  /** Content type */
  contentType: string;
  /** Upload timestamp */
  uploadedAt: Date;
}

export interface IStorageUploadOptions {
  /** Custom key/path for the file */
  key?: string;
  /** Content type override */
  contentType?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Whether file should be publicly accessible */
  isPublic?: boolean;
}

export interface IStorageService {
  /**
   * Upload a file to storage
   */
  upload(file: IStorageFile, options?: IStorageUploadOptions): Promise<IStoredFile>;

  /**
   * Download a file from storage
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getMetadata(key: string): Promise<IStoredFile | null>;

  /**
   * Generate a signed URL for temporary access
   */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * Calculate checksum for a buffer
   */
  calculateChecksum(buffer: Buffer, algorithm?: string): string;
}

