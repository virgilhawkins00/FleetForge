/**
 * Isolation Forest Tests
 */

import { IsolationForest } from './isolation-forest';

describe('IsolationForest', () => {
  let forest: IsolationForest;

  beforeEach(() => {
    forest = new IsolationForest({
      numTrees: 10,
      sampleSize: 50,
      contamination: 0.1,
    });
  });

  describe('train', () => {
    it('should train successfully with valid data', () => {
      const data = generateNormalData(100, 3);
      expect(() => forest.train(data)).not.toThrow();
      expect(forest.isTrained()).toBe(true);
    });

    it('should throw error with empty data', () => {
      expect(() => forest.train([])).toThrow('Training data cannot be empty');
    });

    it('should create correct number of trees', () => {
      const data = generateNormalData(100, 3);
      forest.train(data);
      expect(forest.getNumTrees()).toBe(10);
    });
  });

  describe('score', () => {
    beforeEach(() => {
      const data = generateNormalData(100, 3);
      forest.train(data);
    });

    it('should return score between 0 and 1', () => {
      const sample = [0, 0, 0];
      const score = forest.score(sample);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should give higher scores to anomalies', () => {
      const normalSample = [0, 0, 0];
      const anomalySample = [100, 100, 100];

      const normalScore = forest.score(normalSample);
      const anomalyScore = forest.score(anomalySample);

      expect(anomalyScore).toBeGreaterThan(normalScore);
    });

    it('should throw error if not trained', () => {
      const untrained = new IsolationForest();
      expect(() => untrained.score([0, 0, 0])).toThrow('Model must be trained before scoring');
    });
  });

  describe('predict', () => {
    beforeEach(() => {
      const data = generateNormalData(100, 3);
      forest.train(data);
    });

    it('should predict normal samples as non-anomalies', () => {
      const normalSample = [0, 0, 0];
      const isAnomaly = forest.predict(normalSample);
      expect(isAnomaly).toBe(false);
    });

    it('should predict anomalous samples as anomalies', () => {
      const anomalySample = [100, 100, 100];
      const isAnomaly = forest.predict(anomalySample);
      expect(isAnomaly).toBe(true);
    });
  });

  describe('scoreBatch', () => {
    beforeEach(() => {
      const data = generateNormalData(100, 3);
      forest.train(data);
    });

    it('should score multiple samples', () => {
      const samples = [
        [0, 0, 0],
        [1, 1, 1],
        [100, 100, 100],
      ];

      const scores = forest.scoreBatch(samples);
      expect(scores.length).toBe(3);
      expect(scores.every((s) => s >= 0 && s <= 1)).toBe(true);
    });
  });

  describe('predictBatch', () => {
    beforeEach(() => {
      const data = generateNormalData(100, 3);
      forest.train(data);
    });

    it('should predict multiple samples', () => {
      const samples = [
        [0, 0, 0],
        [1, 1, 1],
        [100, 100, 100],
      ];

      const predictions = forest.predictBatch(samples);
      expect(predictions.length).toBe(3);
      expect(predictions.every((p) => typeof p === 'boolean')).toBe(true);
    });
  });

  describe('getThreshold', () => {
    it('should return threshold based on contamination', () => {
      const threshold = forest.getThreshold();
      expect(threshold).toBe(0.5 + 0.1 / 2); // 0.55
    });
  });

  describe('getConfig', () => {
    it('should return configuration', () => {
      const config = forest.getConfig();
      expect(config.numTrees).toBe(10);
      expect(config.sampleSize).toBe(50);
      expect(config.contamination).toBe(0.1);
    });
  });

  describe('edge cases', () => {
    it('should handle very small dataset', () => {
      const smallForest = new IsolationForest({
        numTrees: 5,
        sampleSize: 2,
        maxDepth: 3,
        contamination: 0.1,
      });

      // Train with only 2 samples
      const data = [
        [1, 2],
        [3, 4],
      ];
      smallForest.train(data);

      const score = smallForest.score([2, 3]);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle single sample in leaf', () => {
      const tinyForest = new IsolationForest({
        numTrees: 3,
        sampleSize: 1,
        maxDepth: 2,
        contamination: 0.1,
      });

      const data = [[1]];
      tinyForest.train(data);

      const score = tinyForest.score([1]);
      expect(score).toBeDefined();
    });
  });
});

// Helper function to generate normal data
function generateNormalData(numSamples: number, numFeatures: number): number[][] {
  const data: number[][] = [];

  for (let i = 0; i < numSamples; i++) {
    const sample: number[] = [];
    for (let j = 0; j < numFeatures; j++) {
      // Generate random normal data (mean=0, std=1)
      sample.push(randomNormal(0, 1));
    }
    data.push(sample);
  }

  return data;
}

// Box-Muller transform for normal distribution
function randomNormal(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * std + mean;
}
