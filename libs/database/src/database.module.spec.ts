/**
 * Database Module Tests
 */

import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  describe('forRoot', () => {
    it('should create dynamic module with forRoot', () => {
      const dynamicModule = DatabaseModule.forRoot({
        uri: 'mongodb://localhost:27017/test',
      });

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(DatabaseModule);
      expect(dynamicModule.imports).toBeDefined();
      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.exports).toBeDefined();
    });

    it('should accept additional options', () => {
      const dynamicModule = DatabaseModule.forRoot({
        uri: 'mongodb://localhost:27017/test',
        options: {
          retryWrites: true,
        },
      });

      expect(dynamicModule).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should create dynamic module with forRootAsync', () => {
      const dynamicModule = DatabaseModule.forRootAsync({
        useFactory: () => ({
          uri: 'mongodb://localhost:27017/test',
        }),
      });

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(DatabaseModule);
    });

    it('should support inject option', () => {
      const dynamicModule = DatabaseModule.forRootAsync({
        imports: [],
        useFactory: () => ({
          uri: 'mongodb://localhost:27017/test',
        }),
        inject: [],
      });

      expect(dynamicModule).toBeDefined();
    });
  });

  describe('forFeature', () => {
    it('should create dynamic module with forFeature', () => {
      const dynamicModule = DatabaseModule.forFeature();

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(DatabaseModule);
      expect(dynamicModule.imports).toBeDefined();
      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.exports).toBeDefined();
    });
  });
});
