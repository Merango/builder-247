import { Request, Response, NextFunction } from 'express';
import { v4 as uuidValidate } from 'uuid';
import { TransactionUniquenessService } from '../services/transaction/transaction-uniqueness.service';
import { Logger } from '../utils/logger';

const logger = new Logger('TransactionIdValidationMiddleware');

/**
 * Middleware for transaction ID validation
 * @param req Express request object
 * @param res Express response object
 * @param next Express next middleware function
 */
export const validateTransactionId = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const transactionUniquenessService = TransactionUniquenessService.getInstance();

  // Possible locations for transaction ID
  const transactionIdSources = [
    req.headers['x-transaction-id'],   // Header
    req.query.transactionId,           // Query parameter
    req.body?.transactionId            // Request body
  ];

  // Find the first non-null transaction ID
  const transactionId = transactionIdSources.find(id => id !== undefined && id !== null);

  // Check if transaction ID is missing
  if (!transactionId) {
    logger.warn('Transaction ID is missing', { 
      path: req.path,
      method: req.method 
    });
    return res.status(400).json({
      error: 'Transaction Validation Failed',
      message: 'Transaction ID is required',
      details: {
        supportedLocations: ['x-transaction-id header', 'transactionId query param', 'transactionId in body']
      }
    });
  }

  // Validate transaction ID is a string
  if (typeof transactionId !== 'string') {
    logger.warn('Invalid transaction ID type', { 
      path: req.path,
      method: req.method,
      receivedType: typeof transactionId
    });
    return res.status(400).json({
      error: 'Transaction Validation Failed',
      message: 'Transaction ID must be a string'
    });
  }

  // Validate transaction ID is a valid UUID v4
  if (!uuidValidate(transactionId)) {
    logger.warn('Invalid transaction ID format', { 
      path: req.path,
      method: req.method,
      transactionId 
    });
    return res.status(400).json({
      error: 'Transaction Validation Failed',
      message: 'Transaction ID must be a valid UUID v4'
    });
  }

  // Check transaction uniqueness
  const uniquenessResult = transactionUniquenessService.checkTransactionUniqueness(transactionId);
  
  if (!uniquenessResult.isUnique) {
    logger.warn('Duplicate transaction detected', { 
      transactionId,
      metadata: uniquenessResult.metadata 
    });
    return res.status(409).json({
      error: 'Transaction Conflict',
      message: 'Transaction has already been processed',
      details: uniquenessResult.metadata
    });
  }

  // Attach the validated transaction ID to the request
  req.transactionId = transactionId;

  // Log performance
  const processingTime = Date.now() - startTime;
  logger.info('Transaction ID validated successfully', { 
    transactionId, 
    processingTime 
  });

  // Proceed to next middleware
  next();
};