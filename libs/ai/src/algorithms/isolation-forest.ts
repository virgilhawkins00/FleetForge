/**
 * Isolation Forest Algorithm
 * Unsupervised anomaly detection using ensemble of isolation trees
 */

import { IsolationTree } from './isolation-tree';
import { IIsolationForestConfig } from '../types';

export class IsolationForest {
  private trees: IsolationTree[] = [];
  private config: IIsolationForestConfig;
  private trained = false;

  constructor(config: Partial<IIsolationForestConfig> = {}) {
    this.config = {
      numTrees: config.numTrees || 100,
      sampleSize: config.sampleSize || 256,
      maxDepth: config.maxDepth || Math.ceil(Math.log2(config.sampleSize || 256)),
      contamination: config.contamination || 0.1,
      randomSeed: config.randomSeed,
    };
  }

  /**
   * Train the isolation forest
   */
  train(data: number[][]): void {
    if (data.length === 0) {
      throw new Error('Training data cannot be empty');
    }

    this.trees = [];
    const numSamples = data.length;
    const sampleSize = Math.min(this.config.sampleSize, numSamples);

    // Build ensemble of isolation trees
    for (let i = 0; i < this.config.numTrees; i++) {
      // Random sampling
      const sample = this.randomSample(data, sampleSize);

      // Build tree
      const tree = new IsolationTree(sample, this.config.maxDepth!);

      this.trees.push(tree);
    }

    this.trained = true;
  }

  /**
   * Calculate anomaly score for a sample
   * Returns score between 0 and 1 (higher = more anomalous)
   */
  score(sample: number[]): number {
    if (!this.trained) {
      throw new Error('Model must be trained before scoring');
    }

    // Calculate average path length across all trees
    const avgPathLength =
      this.trees.reduce((sum, tree) => {
        return sum + tree.pathLength(sample);
      }, 0) / this.trees.length;

    // Normalize using average path length of unsuccessful search in BST
    const c = this.averagePathLength(this.config.sampleSize);

    // Anomaly score: s(x, n) = 2^(-E(h(x))/c(n))
    const anomalyScore = Math.pow(2, -avgPathLength / c);

    return anomalyScore;
  }

  /**
   * Predict if sample is anomaly
   */
  predict(sample: number[]): boolean {
    const score = this.score(sample);
    // Threshold based on contamination parameter
    const threshold = 0.5 + this.config.contamination / 2;
    return score >= threshold;
  }

  /**
   * Score multiple samples
   */
  scoreBatch(samples: number[][]): number[] {
    return samples.map((sample) => this.score(sample));
  }

  /**
   * Predict multiple samples
   */
  predictBatch(samples: number[][]): boolean[] {
    return samples.map((sample) => this.predict(sample));
  }

  /**
   * Get anomaly threshold
   */
  getThreshold(): number {
    return 0.5 + this.config.contamination / 2;
  }

  /**
   * Random sampling without replacement
   */
  private randomSample(data: number[][], size: number): number[][] {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }

  /**
   * Calculate average path length for unsuccessful search in BST
   */
  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;

    const eulerGamma = 0.5772156649;
    return 2 * (Math.log(n - 1) + eulerGamma) - (2 * (n - 1)) / n;
  }

  /**
   * Get model configuration
   */
  getConfig(): IIsolationForestConfig {
    return { ...this.config };
  }

  /**
   * Check if model is trained
   */
  isTrained(): boolean {
    return this.trained;
  }

  /**
   * Get number of trees
   */
  getNumTrees(): number {
    return this.trees.length;
  }
}
