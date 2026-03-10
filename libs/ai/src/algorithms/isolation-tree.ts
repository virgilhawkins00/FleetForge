/**
 * Isolation Tree Implementation
 * Part of Isolation Forest algorithm for anomaly detection
 */

import { IIsolationTree, IIsolationTreeNode } from '../types';

export class IsolationTree implements IIsolationTree {
  root: IIsolationTreeNode;
  maxDepth: number;

  constructor(data: number[][], maxDepth: number) {
    this.maxDepth = maxDepth;
    this.root = this.build(data, 0);
  }

  /**
   * Build isolation tree recursively
   */
  build(data: number[][], currentDepth: number): IIsolationTreeNode {
    const numSamples = data.length;

    // Base cases: create leaf node
    if (currentDepth >= this.maxDepth || numSamples <= 1) {
      return {
        isLeaf: true,
        size: numSamples,
      };
    }

    // Select random feature and split value
    const numFeatures = data[0].length;
    const splitFeature = Math.floor(Math.random() * numFeatures);

    // Get min and max values for the selected feature
    const featureValues = data.map((sample) => sample[splitFeature]);
    const minValue = Math.min(...featureValues);
    const maxValue = Math.max(...featureValues);

    // If all values are the same, create leaf
    if (minValue === maxValue) {
      return {
        isLeaf: true,
        size: numSamples,
      };
    }

    // Random split value between min and max
    const splitValue = minValue + Math.random() * (maxValue - minValue);

    // Split data
    const leftData = data.filter((sample) => sample[splitFeature] < splitValue);
    const rightData = data.filter((sample) => sample[splitFeature] >= splitValue);

    // Create internal node
    return {
      isLeaf: false,
      splitFeature,
      splitValue,
      left: this.build(leftData, currentDepth + 1),
      right: this.build(rightData, currentDepth + 1),
    };
  }

  /**
   * Calculate path length for a sample
   */
  pathLength(sample: number[]): number {
    return this.pathLengthRecursive(sample, this.root, 0);
  }

  /**
   * Recursive path length calculation
   */
  private pathLengthRecursive(
    sample: number[],
    node: IIsolationTreeNode,
    currentDepth: number,
  ): number {
    if (node.isLeaf) {
      // Add average path length for the remaining samples
      return currentDepth + this.averagePathLength(node.size || 1);
    }

    if (sample[node.splitFeature!] < node.splitValue!) {
      return this.pathLengthRecursive(sample, node.left!, currentDepth + 1);
    } else {
      return this.pathLengthRecursive(sample, node.right!, currentDepth + 1);
    }
  }

  /**
   * Calculate average path length for unsuccessful search in BST
   * Used for normalization
   */
  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;

    // Harmonic number approximation
    const eulerGamma = 0.5772156649;
    return 2 * (Math.log(n - 1) + eulerGamma) - (2 * (n - 1)) / n;
  }
}
