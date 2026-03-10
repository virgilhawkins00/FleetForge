/**
 * Location Value Object
 * Immutable representation of geographic coordinates
 */

export interface ILocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export class Location implements ILocation {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly timestamp: Date = new Date(),
    public readonly altitude?: number,
    public readonly accuracy?: number,
    public readonly heading?: number,
    public readonly speed?: number,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error(`Invalid latitude: ${this.latitude}. Must be between -90 and 90`);
    }

    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error(`Invalid longitude: ${this.longitude}. Must be between -180 and 180`);
    }

    if (this.altitude !== undefined && this.altitude < -500) {
      throw new Error(`Invalid altitude: ${this.altitude}. Must be greater than -500`);
    }

    if (this.accuracy !== undefined && this.accuracy < 0) {
      throw new Error(`Invalid accuracy: ${this.accuracy}. Must be non-negative`);
    }

    if (this.heading !== undefined && (this.heading < 0 || this.heading > 360)) {
      throw new Error(`Invalid heading: ${this.heading}. Must be between 0 and 360`);
    }

    if (this.speed !== undefined && this.speed < 0) {
      throw new Error(`Invalid speed: ${this.speed}. Must be non-negative`);
    }
  }

  /**
   * Calculate distance to another location using Haversine formula
   * @returns Distance in meters
   */
  distanceTo(other: ILocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (this.latitude * Math.PI) / 180;
    const φ2 = (other.latitude * Math.PI) / 180;
    const Δφ = ((other.latitude - this.latitude) * Math.PI) / 180;
    const Δλ = ((other.longitude - this.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if location is within a radius of another location
   */
  isWithinRadius(center: ILocation, radiusMeters: number): boolean {
    return this.distanceTo(center) <= radiusMeters;
  }

  /**
   * Convert to GeoJSON Point
   */
  toGeoJSON(): { type: string; coordinates: number[] } {
    return {
      type: 'Point',
      coordinates: [this.longitude, this.latitude, this.altitude || 0],
    };
  }

  /**
   * Create from GeoJSON Point
   */
  static fromGeoJSON(geoJson: { coordinates: number[] }): Location {
    const [longitude, latitude, altitude] = geoJson.coordinates;
    return new Location(latitude, longitude, new Date(), altitude);
  }

  /**
   * Value object equality
   */
  equals(other: ILocation): boolean {
    return (
      this.latitude === other.latitude &&
      this.longitude === other.longitude &&
      this.altitude === other.altitude
    );
  }

  toJSON(): ILocation {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      altitude: this.altitude,
      accuracy: this.accuracy,
      heading: this.heading,
      speed: this.speed,
      timestamp: this.timestamp,
    };
  }
}

