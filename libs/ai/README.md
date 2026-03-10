# @fleetforge/ai

AI and Machine Learning services for FleetForge IoT platform with anomaly detection, predictive maintenance, and behavior analysis.

## Features

### 🔍 Anomaly Detection
- **Isolation Forest Algorithm**: Unsupervised anomaly detection
- **Real-time Detection**: Process telemetry data in real-time
- **Severity Classification**: Automatic severity assessment (LOW, MEDIUM, HIGH, CRITICAL)
- **Batch Processing**: Efficient multi-device anomaly detection

### 🔧 Predictive Maintenance
- **Failure Prediction**: Predict device failures before they occur
- **Remaining Useful Life**: Calculate RUL based on historical data
- **Health Status**: Monitor device health (HEALTHY, WARNING, DEGRADED, CRITICAL, FAILED)
- **Maintenance Recommendations**: Automated maintenance scheduling

### 📊 Behavior Analysis
- **Pattern Recognition**: Identify normal and anomalous behavior patterns
- **Risk Scoring**: Calculate risk scores based on behavior
- **Baseline Learning**: Adaptive baseline for each device
- **Temporal Analysis**: Time-based pattern detection

## Installation

```bash
npm install @fleetforge/ai
```

## Usage

### Anomaly Detection

```typescript
import { AnomalyDetector, ITrainingData, ITelemetryData } from '@fleetforge/ai';

// Create detector
const detector = new AnomalyDetector({
  numTrees: 100,
  sampleSize: 256,
  contamination: 0.1, // Expected 10% anomalies
});

// Train with historical data
const trainingData: ITrainingData = {
  features: [
    [25, 60, 1013], // temperature, humidity, pressure
    [26, 62, 1012],
    // ... more samples
  ],
  timestamps: [new Date(), new Date()],
  deviceIds: ['device-1', 'device-1'],
};

await detector.train(trainingData);

// Detect anomalies in real-time
const telemetry: ITelemetryData = {
  deviceId: 'device-1',
  timestamp: new Date(),
  metrics: {
    temperature: 85, // Anomalous value
    humidity: 60,
    pressure: 1013,
  },
};

const result = await detector.detect(telemetry);

if (result.isAnomaly) {
  console.log(`Anomaly detected! Score: ${result.score}`);
  console.log(`Severity: ${result.anomalies[0].severity}`);
  console.log(`Description: ${result.anomalies[0].description}`);
}
```

### Predictive Maintenance

```typescript
import { PredictiveMaintenanceEngine, ITrainingData } from '@fleetforge/ai';

// Create engine
const engine = new PredictiveMaintenanceEngine();

// Train with historical data
const historicalData: ITrainingData = {
  features: [
    [25, 60, 1013, 85], // temp, humidity, pressure, battery
    [26, 62, 1012, 84],
    // ... more samples
  ],
  timestamps: [new Date(), new Date()],
  deviceIds: ['device-1', 'device-1'],
};

await engine.train(historicalData);

// Predict maintenance needs
const prediction = await engine.predict('device-1', {
  temperature: 28,
  humidity: 65,
  pressure: 1010,
  battery: 75,
});

console.log(`Health Status: ${prediction.healthStatus}`);
console.log(`Predicted Failure: ${prediction.predictedFailureDate}`);
console.log(`Remaining Useful Life: ${prediction.remainingUsefulLife} hours`);
console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);

// Recommendations
prediction.recommendations.forEach((rec) => {
  console.log(`- ${rec}`);
});

// Critical metrics
prediction.criticalMetrics.forEach((metric) => {
  console.log(`${metric.metric}: ${metric.currentValue} (threshold: ${metric.threshold})`);
  console.log(`  Trend: ${metric.trend}`);
});
```

### Behavior Analysis

```typescript
import { BehaviorAnalyzer, ITelemetryData } from '@fleetforge/ai';

// Create analyzer
const analyzer = new BehaviorAnalyzer();

// Collect telemetry data
const telemetry: ITelemetryData[] = [
  {
    deviceId: 'device-1',
    timestamp: new Date(),
    metrics: { speed: 60, acceleration: 2.5, braking: 0 },
  },
  // ... more samples
];

// Analyze behavior patterns
const analysis = await analyzer.analyzePattern('device-1', telemetry);

console.log(`Risk Score: ${(analysis.riskScore * 100).toFixed(1)}%`);
console.log(`Normal Patterns: ${analysis.normalBehavior.length}`);
console.log(`Anomalous Patterns: ${analysis.anomalousBehavior.length}`);

// Update baseline for adaptive learning
await analyzer.updateBaseline('device-1', telemetry);

// Get specific patterns
const anomalousPatterns = await analyzer.detectAnomalousPatterns('device-1');
const normalPatterns = await analyzer.getNormalPatterns('device-1');
```

### Batch Processing

```typescript
// Batch anomaly detection
const telemetryBatch: ITelemetryData[] = [
  { deviceId: 'device-1', timestamp: new Date(), metrics: { temp: 25 } },
  { deviceId: 'device-2', timestamp: new Date(), metrics: { temp: 85 } },
  { deviceId: 'device-3', timestamp: new Date(), metrics: { temp: 26 } },
];

const results = await detector.detectBatch(telemetryBatch);
const anomalies = results.filter((r) => r.isAnomaly);

console.log(`Found ${anomalies.length} anomalies out of ${results.length} devices`);

// Batch predictive maintenance
const devices = [
  { deviceId: 'device-1', metrics: { temp: 25, battery: 85 } },
  { deviceId: 'device-2', metrics: { temp: 28, battery: 70 } },
];

const predictions = await engine.predictBatch(devices);
const critical = predictions.filter((p) => p.healthStatus === 'CRITICAL');

console.log(`${critical.length} devices need immediate attention`);
```

## Algorithms

### Isolation Forest

The Isolation Forest algorithm is an unsupervised anomaly detection method that works by:

1. **Random Partitioning**: Builds an ensemble of isolation trees by randomly selecting features and split values
2. **Path Length**: Anomalies have shorter average path lengths in the trees
3. **Anomaly Score**: Normalized score between 0 and 1 (higher = more anomalous)

**Advantages:**
- No labeled data required
- Fast training and prediction
- Effective for high-dimensional data
- Low memory footprint

## Model Metrics

```typescript
// Get model performance metrics
const metrics = detector.getModelMetrics();

console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
console.log(`Precision: ${(metrics.precision * 100).toFixed(1)}%`);
console.log(`Recall: ${(metrics.recall * 100).toFixed(1)}%`);
console.log(`F1 Score: ${(metrics.f1Score * 100).toFixed(1)}%`);

// Get feature importance
const importance = detector.getFeatureImportance();
importance.forEach((feat) => {
  console.log(`${feat.feature}: ${(feat.importance * 100).toFixed(1)}%`);
});
```

## Testing

```bash
# Run tests
nx test ai

# Run tests with coverage
nx test ai --coverage
```

## License

MIT

