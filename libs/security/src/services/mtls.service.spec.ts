/**
 * mTLS Service Unit Tests
 */

import { MtlsService } from './mtls.service';

// Real self-signed test certificate (valid until 2027)
const VALID_CERT = `-----BEGIN CERTIFICATE-----
MIIC0DCCAbgCCQC8I2v/nxGPCzANBgkqhkiG9w0BAQsFADAqMRMwEQYDVQQDDApk
ZXZpY2UtMTIzMRMwEQYDVQQKDApGbGVldEZvcmdlMB4XDTI2MDMxMjEzMzQyN1oX
DTI3MDMxMjEzMzQyN1owKjETMBEGA1UEAwwKZGV2aWNlLTEyMzETMBEGA1UECgwK
RmxlZXRGb3JnZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJcvrkg6
8olQ8zvTsuhyvZSJ8/nJCdtIxlfzLpJPsuzdOANbNJ6TC5LbZvx6J7WyKxK//b2K
uFH6SWQygNyuDohnxMaDS4HhJ+HaLs4ybQaGNA37wIMQwbze2eMPVMU0vi8zuUAq
WSiyQo9UP9kEVP/nmwecz+NKhZ4fTq1S/dVp0Nd88LjAwM2gYNKIX6T0ilyJLW+7
U2XFSn3KcSw499lGYeAUVnWUuml2NwgigzhUx9BEyNLwGxAZJ3IRNs2df2+xIWiv
FCRyhdL+KCG+GPYgAlboQDCyKGC2/lyQCKvpJKZYTugqqhVG+W5gAhSgYHGhXC93
vPQMNDRwVcPIzM0CAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAE5kTUdioZu9U0kVJ
NGtjuI621BCjVNxe4BTZMs5bpusk9x8OCo7an+FmJ86lk+2P0hQiJTrUuVUL+lTH
8mCpLzIk9jjEpwk1gjjiJslo4vnOre53TBzG4nrUbg2QN2zOAIlJbJ7Tg7RyIzJ/
5ACyTSdN9JIoseelQ7jQ4F1h53VMAg4v+u+P4qyABK0NPQSivp4N/zcLNUNpRIMu
DqOMTBvA5pHcO9z7TPuOl0jzmtgERC89vHl04IrQtaRMCtoJXaCBeBwDSw1rfrud
BM/gCLQwCzrHOyD5feItING67SZkIQ1frQA0WUKdoHHFjGHrkG8WpPTPNuHqVatv
qjJ6fQ==
-----END CERTIFICATE-----`;

describe('MtlsService', () => {
  let service: MtlsService;

  beforeEach(() => {
    service = new MtlsService();
  });

  describe('validateCertificate', () => {
    it('should validate a valid certificate', () => {
      const result = service.validateCertificate(VALID_CERT);

      expect(result.isValid).toBe(true);
      expect(result.certificate).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid certificate format', () => {
      const result = service.validateCertificate('not-a-certificate');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid certificate format');
    });

    it('should reject a revoked certificate', () => {
      const fingerprint = service.generateFingerprint(VALID_CERT);
      service.revokeCertificate(fingerprint);

      const result = service.validateCertificate(VALID_CERT);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Certificate has been revoked');
    });

    it('should detect certificate expiring within 30 days', () => {
      // Test warning for certificate expiring soon by mocking Date
      // Certificate expires on 2027-03-12, so set current time to 20 days before
      const certValidTo = new Date('2027-03-12T13:34:27.000Z');
      const twentyDaysBeforeExpiry = new Date(certValidTo.getTime() - 20 * 24 * 60 * 60 * 1000);

      jest.useFakeTimers();
      jest.setSystemTime(twentyDaysBeforeExpiry);

      const result = service.validateCertificate(VALID_CERT);

      jest.useRealTimers();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Certificate will expire within 30 days');
    });
  });

  describe('extractDeviceId', () => {
    it('should extract device ID from certificate CN', () => {
      const deviceId = service.extractDeviceId(VALID_CERT);

      // Our test cert has CN=device-123
      expect(deviceId).toBe('device-123');
    });

    it('should return null for invalid certificate', () => {
      const deviceId = service.extractDeviceId('invalid');

      expect(deviceId).toBeNull();
    });
  });

  describe('addTrustedCA', () => {
    it('should add a valid CA certificate', () => {
      expect(() => {
        service.addTrustedCA(VALID_CERT, 'test-ca');
      }).not.toThrow();
    });

    it('should throw for invalid CA certificate', () => {
      expect(() => {
        service.addTrustedCA('invalid', 'test-ca');
      }).toThrow('Invalid CA certificate');
    });
  });

  describe('revokeCertificate', () => {
    it('should mark certificate as revoked', () => {
      const fingerprint = 'abc123';

      service.revokeCertificate(fingerprint);

      expect(service.isRevoked(fingerprint)).toBe(true);
    });

    it('should return false for non-revoked certificate', () => {
      expect(service.isRevoked('unknown-fingerprint')).toBe(false);
    });
  });

  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint', () => {
      const fp1 = service.generateFingerprint(VALID_CERT);
      const fp2 = service.generateFingerprint(VALID_CERT);

      expect(fp1).toBe(fp2);
      expect(fp1).toMatch(/^[a-f0-9]+$/);
    });
  });
});
