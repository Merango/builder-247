import crypto from 'crypto';
import { signatureValidationMiddleware } from '../../src/middleware/signature-validation';
import { Request, Response, NextFunction } from 'express';

describe('Signature Validation Middleware', () => {
  const secretKey = 'test-secret-key';
  const mockNextFunction = jest.fn();
  const mockLogger = jest.fn();

  const createMockRequest = (body: any, signature?: string, timestamp?: number) => {
    const req = {
      body,
      headers: {
        'x-signature': signature,
        'x-timestamp': timestamp ? timestamp.toString() : undefined
      }
    } as unknown as Request;

    return req;
  };

  const createMockResponse = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    return res;
  };

  const generateSignature = (body: any, timestamp: number, secretKey: string) => {
    const payload = JSON.stringify(body) + timestamp;
    return crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
  };

  beforeEach(() => {
    mockNextFunction.mockClear();
    mockLogger.mockClear();
  });

  it('should allow request with valid signature', () => {
    const body = { data: 'test' };
    const timestamp = Date.now();
    const signature = generateSignature(body, timestamp, secretKey);

    const req = createMockRequest(body, signature, timestamp);
    const res = createMockResponse();
    const middleware = signatureValidationMiddleware(secretKey, { logger: mockLogger });

    middleware(req, res, mockNextFunction);

    expect(mockNextFunction).toHaveBeenCalled();
    expect(mockLogger).toHaveBeenCalledWith('Signature validated successfully', 'info');
  });

  it('should reject request with missing signature', () => {
    const body = { data: 'test' };
    const req = createMockRequest(body);
    const res = createMockResponse();
    const middleware = signatureValidationMiddleware(secretKey, { logger: mockLogger });

    middleware(req, res, mockNextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature or timestamp' });
    expect(mockNextFunction).not.toHaveBeenCalled();
    expect(mockLogger).toHaveBeenCalledWith('Missing signature or timestamp', 'error');
  });

  it('should reject request with invalid signature', () => {
    const body = { data: 'test' };
    const timestamp = Date.now();
    const invalidSignature = 'invalid-signature';

    const req = createMockRequest(body, invalidSignature, timestamp);
    const res = createMockResponse();
    const middleware = signatureValidationMiddleware(secretKey, { logger: mockLogger });

    middleware(req, res, mockNextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    expect(mockNextFunction).not.toHaveBeenCalled();
    expect(mockLogger).toHaveBeenCalledWith('Invalid signature', 'error');
  });

  it('should reject request with expired timestamp', () => {
    const body = { data: 'test' };
    const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
    const signature = generateSignature(body, oldTimestamp, secretKey);

    const req = createMockRequest(body, signature, oldTimestamp);
    const res = createMockResponse();
    const middleware = signatureValidationMiddleware(secretKey, { logger: mockLogger });

    middleware(req, res, mockNextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired timestamp' });
    expect(mockNextFunction).not.toHaveBeenCalled();
    expect(mockLogger).toHaveBeenCalledWith('Invalid or expired timestamp', 'error');
  });

  it('should handle cases with custom headers', () => {
    const body = { data: 'test' };
    const timestamp = Date.now();
    const signature = generateSignature(body, timestamp, secretKey);

    const req = createMockRequest(body, signature, timestamp);
    const res = createMockResponse();
    const middleware = signatureValidationMiddleware(secretKey, {
      signatureHeader: 'custom-signature',
      timestampHeader: 'custom-timestamp',
      logger: mockLogger
    });

    // Modify headers to match custom names
    req.headers = {
      'custom-signature': signature,
      'custom-timestamp': timestamp.toString()
    };

    middleware(req, res, mockNextFunction);

    expect(mockNextFunction).toHaveBeenCalled();
    expect(mockLogger).toHaveBeenCalledWith('Signature validated successfully', 'info');
  });
});