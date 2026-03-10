/**
 * Delta Update Engine Tests
 */

import { DeltaUpdateEngine } from './delta-update.engine';

describe('DeltaUpdateEngine', () => {
  let engine: DeltaUpdateEngine;

  beforeEach(() => {
    engine = new DeltaUpdateEngine();
  });

  describe('generateDelta', () => {
    it('should generate delta patch between two versions', async () => {
      const source = Buffer.from('Hello World v1.0');
      const target = Buffer.from('Hello World v2.0');

      const patch = await engine.generateDelta(source, target);

      expect(patch).toHaveProperty('sourceVersion');
      expect(patch).toHaveProperty('targetVersion');
      expect(patch).toHaveProperty('patchData');
      expect(patch).toHaveProperty('patchSize');
      expect(patch).toHaveProperty('compressionAlgorithm');
      expect(patch).toHaveProperty('checksum');
      expect(patch.patchSize).toBeGreaterThan(0);
    });

    it('should use gzip compression by default', async () => {
      const source = Buffer.from('A'.repeat(1000));
      const target = Buffer.from('B'.repeat(1000));

      const patch = await engine.generateDelta(source, target);

      expect(patch.compressionAlgorithm).toBe('gzip');
    });

    it('should support brotli compression', async () => {
      const source = Buffer.from('A'.repeat(1000));
      const target = Buffer.from('B'.repeat(1000));

      const patch = await engine.generateDelta(source, target, {
        compressionAlgorithm: 'brotli',
      });

      expect(patch.compressionAlgorithm).toBe('brotli');
    });

    it('should generate smaller patch for similar data', async () => {
      const source = Buffer.from('A'.repeat(1000) + 'B'.repeat(100));
      const target = Buffer.from('A'.repeat(1000) + 'C'.repeat(100));

      const patch = await engine.generateDelta(source, target);

      // Patch should be smaller than full target
      expect(patch.patchSize).toBeLessThan(target.length);
    });
  });

  describe('applyDelta', () => {
    it('should apply delta patch successfully', async () => {
      const source = Buffer.from('Hello World v1.0');
      const target = Buffer.from('Hello World v2.0');

      const patch = await engine.generateDelta(source, target);
      const result = await engine.applyDelta(source, patch);

      expect(result.success).toBe(true);
      expect(result.checksum).toBe(patch.targetVersion);
      expect(result.outputSize).toBe(target.length);
    });

    it('should fail with wrong source version', async () => {
      const source = Buffer.from('Hello World v1.0');
      const target = Buffer.from('Hello World v2.0');
      const wrongSource = Buffer.from('Wrong version');

      const patch = await engine.generateDelta(source, target);
      const result = await engine.applyDelta(wrongSource, patch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source version mismatch');
    });

    it('should fail with corrupted patch', async () => {
      const source = Buffer.from('Hello World v1.0');
      const target = Buffer.from('Hello World v2.0');

      const patch = await engine.generateDelta(source, target);

      // Corrupt the patch
      patch.checksum = 'corrupted-checksum';

      const result = await engine.applyDelta(source, patch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Patch checksum mismatch');
    });

    it('should handle large files', async () => {
      const source = Buffer.from('A'.repeat(10000));
      const target = Buffer.from('A'.repeat(9000) + 'B'.repeat(1000));

      const patch = await engine.generateDelta(source, target);
      const result = await engine.applyDelta(source, patch);

      expect(result.success).toBe(true);
      expect(result.outputSize).toBe(target.length);
    });

    it('should fail with target version mismatch', async () => {
      const source = Buffer.from('Hello World v1.0');
      const target = Buffer.from('Hello World v2.0');

      const patch = await engine.generateDelta(source, target);

      // Corrupt target version to cause mismatch after patching
      patch.targetVersion = 'wrong-version-hash';

      const result = await engine.applyDelta(source, patch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('mismatch');
    });

    it('should fail with source version mismatch', async () => {
      const source = Buffer.from('Hello World v1.0');
      const target = Buffer.from('Hello World v2.0');

      const patch = await engine.generateDelta(source, target);

      // Apply patch with wrong source
      const wrongSource = Buffer.from('Different content');
      const result = await engine.applyDelta(wrongSource, patch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source version mismatch');
    });
  });

  describe('calculateSavings', () => {
    it('should calculate bandwidth savings', () => {
      const fullSize = 1000000; // 1MB
      const deltaSize = 100000; // 100KB

      const savings = engine.calculateSavings(fullSize, deltaSize);

      expect(savings.savedBytes).toBe(900000);
      expect(savings.savedPercentage).toBe(90);
    });

    it('should handle zero savings', () => {
      const fullSize = 1000;
      const deltaSize = 1000;

      const savings = engine.calculateSavings(fullSize, deltaSize);

      expect(savings.savedBytes).toBe(0);
      expect(savings.savedPercentage).toBe(0);
    });

    it('should handle negative savings (delta larger than full)', () => {
      const fullSize = 1000;
      const deltaSize = 1500;

      const savings = engine.calculateSavings(fullSize, deltaSize);

      expect(savings.savedBytes).toBe(-500);
      expect(savings.savedPercentage).toBe(-50);
    });
  });

  describe('end-to-end delta update', () => {
    it('should perform complete delta update cycle', async () => {
      // Simulate firmware versions
      const v1 = Buffer.from('Firmware v1.0 - ' + 'A'.repeat(5000));
      const v2 = Buffer.from('Firmware v2.0 - ' + 'A'.repeat(4900) + 'B'.repeat(100));

      // Generate delta
      const patch = await engine.generateDelta(v1, v2);

      // Verify patch is smaller than full update
      expect(patch.patchSize).toBeLessThan(v2.length);

      // Apply delta
      const result = await engine.applyDelta(v1, patch);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.outputSize).toBe(v2.length);

      // Calculate savings
      const savings = engine.calculateSavings(v2.length, patch.patchSize);
      expect(savings.savedPercentage).toBeGreaterThan(0);
    });

    it('should support brotli compression in e2e', async () => {
      const v1 = Buffer.from('Short data v1');
      const v2 = Buffer.from('Short data v2');

      const patch = await engine.generateDelta(v1, v2, {
        compressionAlgorithm: 'brotli',
      });

      expect(patch.compressionAlgorithm).toBe('brotli');

      const result = await engine.applyDelta(v1, patch);
      expect(result.success).toBe(true);
    });

    it('should handle empty source', async () => {
      const v1 = Buffer.from('');
      const v2 = Buffer.from('New content');

      const patch = await engine.generateDelta(v1, v2);
      const result = await engine.applyDelta(v1, patch);

      expect(result.success).toBe(true);
    });

    it('should handle identical content', async () => {
      const v1 = Buffer.from('Identical content');
      const v2 = Buffer.from('Identical content');

      const patch = await engine.generateDelta(v1, v2);

      // Patch should be generated even for identical content
      expect(patch).toBeDefined();
      expect(patch.patchSize).toBeGreaterThan(0);
    });
  });
});
