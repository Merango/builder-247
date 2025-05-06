import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateTransactionId } from '../../src/middleware/transaction-id-validation';
import { TransactionUniquenessService } from '../../src/services/transaction/transaction-uniqueness.service';

describe('Transaction ID Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let transactionUniquenessService: TransactionUniquenessService;

  beforeEach(() => {
    transactionUniquenessService = TransactionUniquenessService.getInstance();
    
    mockRequest = {
      headers: {},
      query: {},
      body: {},
      path: '/test-path',
      method: 'POST'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
  });

  // Successful validation scenarios
  describe('Successful Validation', () => {
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
  });

  // Error scenarios
  describe('Error Handling', () => {
    it('should reject request with missing transaction ID', () => {
      validateTransactionId(
        mockRequest as Request, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction Validation Failed',
          message: 'Transaction ID is required'
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
          error: 'Transaction Validation Failed',
          message: 'Transaction ID must be a string'
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
          error: 'Transaction Validation Failed',
          message: 'Transaction ID must be a valid UUID v4'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject duplicate transactions', () => {
      const duplicateTransactionId = uuidv4();
      mockRequest.headers = { 'x-transaction-id': duplicateTransactionId };

      // Mock duplicate transaction
      jest.spyOn(transactionUniquenessService, 'checkTransactionUniqueness')
        .mockReturnValue({
          isUnique: false,
          metadata: { 
            reason: 'Transaction already processed',
            timestamp: new Date().toISOString()
          }
        });

      validateTransactionId(
        mockRequest as Request, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction Conflict',
          message: 'Transaction has already been processed'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Performance test
  describe('Performance', () => {
    it('should process transaction ID validation under 100ms', () => {
      const validTransactionId = uuidv4();
      mockRequest.headers = { 'x-transaction-id': validTransactionId };

      const startTime = Date.now();
      validateTransactionId(
        mockRequest as Request, 
        mockResponse as Response, 
        mockNext
      );
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(100);
    });
  });
});