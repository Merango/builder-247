import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateTransactionId } from '../../src/middleware/transaction-id-validation';

describe('Transaction ID Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should pass middleware with valid transaction ID in header', () => {
    const validTransactionId = uuidv4();
    mockRequest.headers = { 'x-transaction-id': validTransactionId };

    validateTransactionId(
      mockRequest as Request, 
      mockResponse as Response, 
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.transactionId).toBe(validTransactionId);
  });

  it('should pass middleware with valid transaction ID in query params', () => {
    const validTransactionId = uuidv4();
    mockRequest.query = { transactionId: validTransactionId };

    validateTransactionId(
      mockRequest as Request, 
      mockResponse as Response, 
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.transactionId).toBe(validTransactionId);
  });

  it('should pass middleware with valid transaction ID in body', () => {
    const validTransactionId = uuidv4();
    mockRequest.body = { transactionId: validTransactionId };

    validateTransactionId(
      mockRequest as Request, 
      mockResponse as Response, 
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.transactionId).toBe(validTransactionId);
  });

  it('should reject request with missing transaction ID', () => {
    validateTransactionId(
      mockRequest as Request, 
      mockResponse as Response, 
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Transaction ID is required'
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with non-string transaction ID', () => {
    mockRequest.headers = { 'x-transaction-id': 123 as any };

    validateTransactionId(
      mockRequest as Request, 
      mockResponse as Response, 
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid Transaction ID'
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with invalid UUID transaction ID', () => {
    mockRequest.headers = { 'x-transaction-id': 'not-a-valid-uuid' };

    validateTransactionId(
      mockRequest as Request, 
      mockResponse as Response, 
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid Transaction ID'
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});