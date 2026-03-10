/**
 * Delta Update Engine
 * Implements binary diff/patch algorithm for efficient firmware updates
 */

import { createHash } from 'crypto';
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync } from 'zlib';
import { IDeltaPatch, IDeltaGenerationOptions, IDeltaApplicationResult } from '../types';

export class DeltaUpdateEngine {
  /**
   * Generate delta patch between two firmware versions
   */
  async generateDelta(
    sourceBuffer: Buffer,
    targetBuffer: Buffer,
    options?: IDeltaGenerationOptions,
  ): Promise<IDeltaPatch> {
    const opts: Required<IDeltaGenerationOptions> = {
      compressionLevel: options?.compressionLevel ?? 6,
      compressionAlgorithm: options?.compressionAlgorithm ?? 'gzip',
      blockSize: options?.blockSize ?? 4096,
      checksumAlgorithm: options?.checksumAlgorithm ?? 'sha256',
    };

    // Generate binary diff
    const diff = this.binaryDiff(sourceBuffer, targetBuffer, opts.blockSize);

    // Compress the diff
    const compressed = this.compress(diff, opts.compressionAlgorithm, opts.compressionLevel);

    // Calculate checksum
    const checksum = this.calculateChecksum(compressed, opts.checksumAlgorithm);

    return {
      sourceVersion: this.calculateChecksum(sourceBuffer, 'sha256'),
      targetVersion: this.calculateChecksum(targetBuffer, 'sha256'),
      patchData: compressed,
      patchSize: compressed.length,
      compressionAlgorithm: opts.compressionAlgorithm,
      checksum,
    };
  }

  /**
   * Apply delta patch to source firmware
   */
  async applyDelta(sourceBuffer: Buffer, patch: IDeltaPatch): Promise<IDeltaApplicationResult> {
    try {
      // Verify source version
      const sourceChecksum = this.calculateChecksum(sourceBuffer, 'sha256');
      if (sourceChecksum !== patch.sourceVersion) {
        return {
          success: false,
          outputSize: 0,
          checksum: '',
          error: 'Source version mismatch',
          appliedAt: new Date(),
        };
      }

      // Verify patch integrity
      const patchChecksum = this.calculateChecksum(patch.patchData, 'sha256');
      if (patchChecksum !== patch.checksum) {
        return {
          success: false,
          outputSize: 0,
          checksum: '',
          error: 'Patch checksum mismatch',
          appliedAt: new Date(),
        };
      }

      // Decompress patch
      const decompressed = this.decompress(patch.patchData, patch.compressionAlgorithm);

      // Apply binary patch
      const result = this.binaryPatch(sourceBuffer, decompressed);

      // Verify result
      const resultChecksum = this.calculateChecksum(result, 'sha256');
      if (resultChecksum !== patch.targetVersion) {
        return {
          success: false,
          outputSize: 0,
          checksum: resultChecksum,
          error: 'Target version mismatch after patching',
          appliedAt: new Date(),
        };
      }

      return {
        success: true,
        outputSize: result.length,
        checksum: resultChecksum,
        appliedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        outputSize: 0,
        checksum: '',
        error: (error as Error).message,
        appliedAt: new Date(),
      };
    }
  }

  /**
   * Calculate space savings from delta update
   */
  calculateSavings(
    fullSize: number,
    deltaSize: number,
  ): {
    savedBytes: number;
    savedPercentage: number;
  } {
    const savedBytes = fullSize - deltaSize;
    const savedPercentage = (savedBytes / fullSize) * 100;

    return {
      savedBytes,
      savedPercentage: Math.round(savedPercentage * 100) / 100,
    };
  }

  /**
   * Simple binary diff algorithm (simplified bsdiff-like approach)
   */
  private binaryDiff(source: Buffer, target: Buffer, blockSize: number): Buffer {
    const operations: Array<{
      type: 'copy' | 'insert';
      offset?: number;
      length: number;
      data?: Buffer;
    }> = [];

    let targetPos = 0;
    while (targetPos < target.length) {
      const remainingTarget = target.length - targetPos;
      const currentBlockSize = Math.min(blockSize, remainingTarget);
      const targetBlock = target.subarray(targetPos, targetPos + currentBlockSize);

      // Try to find matching block in source
      const matchPos = this.findMatch(source, targetBlock);

      if (matchPos !== -1) {
        // Found match - emit copy operation
        operations.push({
          type: 'copy',
          offset: matchPos,
          length: currentBlockSize,
        });
      } else {
        // No match - emit insert operation
        operations.push({
          type: 'insert',
          length: currentBlockSize,
          data: targetBlock,
        });
      }

      targetPos += currentBlockSize;
    }

    // Serialize operations to buffer
    return this.serializeOperations(operations);
  }

  /**
   * Apply binary patch
   */
  private binaryPatch(source: Buffer, patchData: Buffer): Buffer {
    const operations = this.deserializeOperations(patchData);
    const chunks: Buffer[] = [];

    for (const op of operations) {
      if (op.type === 'copy') {
        chunks.push(source.subarray(op.offset!, op.offset! + op.length));
      } else {
        // Handle Buffer serialization - JSON.parse converts Buffer to {type: 'Buffer', data: []}
        const data = op.data;
        if (Buffer.isBuffer(data)) {
          chunks.push(data);
        } else if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
          chunks.push(Buffer.from(data.data));
        } else if (Array.isArray(data)) {
          chunks.push(Buffer.from(data));
        } else {
          chunks.push(Buffer.from(data));
        }
      }
    }

    return Buffer.concat(chunks);
  }

  /**
   * Find matching block in source
   */
  private findMatch(source: Buffer, block: Buffer): number {
    for (let i = 0; i <= source.length - block.length; i++) {
      if (source.subarray(i, i + block.length).equals(block)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Serialize patch operations
   */
  private serializeOperations(operations: any[]): Buffer {
    return Buffer.from(JSON.stringify(operations));
  }

  /**
   * Deserialize patch operations
   */
  private deserializeOperations(data: Buffer): any[] {
    return JSON.parse(data.toString());
  }

  /**
   * Compress data
   */
  private compress(data: Buffer, algorithm: 'gzip' | 'brotli', level: number): Buffer {
    if (algorithm === 'gzip') {
      return gzipSync(data, { level });
    } else {
      return brotliCompressSync(data);
    }
  }

  /**
   * Decompress data
   */
  private decompress(data: Buffer, algorithm: 'gzip' | 'brotli' | 'none'): Buffer {
    if (algorithm === 'gzip') {
      return gunzipSync(data);
    } else if (algorithm === 'brotli') {
      return brotliDecompressSync(data);
    }
    return data;
  }

  /**
   * Calculate checksum
   */
  private calculateChecksum(data: Buffer, algorithm: string): string {
    return createHash(algorithm).update(data).digest('hex');
  }
}
