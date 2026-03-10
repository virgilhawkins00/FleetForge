import { Location } from './location.vo';

describe('Location Value Object', () => {
  describe('constructor', () => {
    it('should create valid location', () => {
      const location = new Location(-23.5505, -46.6333, new Date());
      expect(location.latitude).toBe(-23.5505);
      expect(location.longitude).toBe(-46.6333);
    });

    it('should throw error for invalid latitude', () => {
      expect(() => new Location(91, 0, new Date())).toThrow('Invalid latitude');
      expect(() => new Location(-91, 0, new Date())).toThrow('Invalid latitude');
    });

    it('should throw error for invalid longitude', () => {
      expect(() => new Location(0, 181, new Date())).toThrow('Invalid longitude');
      expect(() => new Location(0, -181, new Date())).toThrow('Invalid longitude');
    });

    it('should throw error for invalid altitude', () => {
      expect(() => new Location(0, 0, new Date(), -600)).toThrow('Invalid altitude');
    });

    it('should throw error for invalid accuracy', () => {
      expect(() => new Location(0, 0, new Date(), 0, -1)).toThrow('Invalid accuracy');
    });

    it('should throw error for invalid heading', () => {
      expect(() => new Location(0, 0, new Date(), 0, 0, 361)).toThrow('Invalid heading');
      expect(() => new Location(0, 0, new Date(), 0, 0, -1)).toThrow('Invalid heading');
    });

    it('should throw error for invalid speed', () => {
      expect(() => new Location(0, 0, new Date(), 0, 0, 0, -1)).toThrow('Invalid speed');
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance between two locations', () => {
      const loc1 = new Location(-23.5505, -46.6333, new Date()); // São Paulo
      const loc2 = new Location(-22.9068, -43.1729, new Date()); // Rio de Janeiro

      const distance = loc1.distanceTo(loc2);
      expect(distance).toBeGreaterThan(350000); // ~357km
      expect(distance).toBeLessThan(400000);
    });

    it('should return 0 for same location', () => {
      const loc1 = new Location(0, 0, new Date());
      const loc2 = new Location(0, 0, new Date());

      expect(loc1.distanceTo(loc2)).toBe(0);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true when within radius', () => {
      const center = new Location(0, 0, new Date());
      const nearby = new Location(0.001, 0.001, new Date());

      expect(nearby.isWithinRadius(center, 200)).toBe(true);
    });

    it('should return false when outside radius', () => {
      const center = new Location(0, 0, new Date());
      const far = new Location(1, 1, new Date());

      expect(far.isWithinRadius(center, 1000)).toBe(false);
    });
  });

  describe('toGeoJSON', () => {
    it('should convert to GeoJSON Point', () => {
      const location = new Location(-23.5505, -46.6333, new Date(), 10);
      const geoJson = location.toGeoJSON();

      expect(geoJson.type).toBe('Point');
      expect(geoJson.coordinates).toEqual([-46.6333, -23.5505, 10]);
    });

    it('should use 0 for missing altitude', () => {
      const location = new Location(-23.5505, -46.6333, new Date());
      const geoJson = location.toGeoJSON();

      expect(geoJson.coordinates[2]).toBe(0);
    });
  });

  describe('fromGeoJSON', () => {
    it('should create location from GeoJSON', () => {
      const geoJson = { coordinates: [-46.6333, -23.5505, 10] };
      const location = Location.fromGeoJSON(geoJson);

      expect(location.latitude).toBe(-23.5505);
      expect(location.longitude).toBe(-46.6333);
      expect(location.altitude).toBe(10);
    });
  });

  describe('equals', () => {
    it('should return true for equal locations', () => {
      const loc1 = new Location(-23.5505, -46.6333, new Date(), 10);
      const loc2 = new Location(-23.5505, -46.6333, new Date(), 10);

      expect(loc1.equals(loc2)).toBe(true);
    });

    it('should return false for different locations', () => {
      const loc1 = new Location(-23.5505, -46.6333, new Date());
      const loc2 = new Location(-22.9068, -43.1729, new Date());

      expect(loc1.equals(loc2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const location = new Location(-23.5505, -46.6333, new Date(), 10, 5, 90, 50);
      const json = location.toJSON();

      expect(json.latitude).toBe(-23.5505);
      expect(json.longitude).toBe(-46.6333);
      expect(json.altitude).toBe(10);
      expect(json.accuracy).toBe(5);
      expect(json.heading).toBe(90);
      expect(json.speed).toBe(50);
    });
  });
});

