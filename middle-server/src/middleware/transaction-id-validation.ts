import { Request, Response, NextFunction } from 'express';
import { TransactionUniquenessService, TransactionValidationResult } from '../services/transaction/transaction-uniqueness.service';

/**
 * Validate transaction ID middleware
 * @param req Express request object
 * @param res Express response object
 * @param next Express next middleware function
 */
export const validateTransactionId = (req: Request, res: Response, next: NextFunction) => {
  const transactionUniquenessService = TransactionUniquenessService.getInstance();

  // Find transaction ID from different sources
  const transactionId = req.headers['x-transaction-id'] 
    || req.query.transactionId 
    || req.body?.transactionId;

  // Validate transaction ID presence
  if (!transactionId) {
    return res.status(400).json({
      error: 'Transaction Validation Failed',
      message: 'Transaction ID is required',
      details: {
        supportedLocations: [
          'x-transaction-id header', 
          'transactionId query param', 
          'transactionId in body'
        ]
      }
    });
  }

  // Ensure transaction ID is a string
  if (typeof transactionId !== 'string') {
    return res.status(400).json({
      error: 'Transaction Validation Failed',
      message: 'Transaction ID must be a string',
      details: {
        receivedType: typeof transactionId
      }
    });
  }

  // Validate transaction
  const validationResult: TransactionValidationResult = 
    transactionUniquenessService.validateTransaction(transactionId);

  // Handle validation result
  if (!validationResult.isValid) {
    const statusCode = validationResult.reason === 'Duplicate transaction' ? 409 : 400;
    
    return res.status(statusCode).json({
      error: 'Transaction Validation Failed',
      message: validationResult.reason || 'Invalid transaction',
      details: validationResult.metadata
    });
  }

  // Attach validated transaction ID to request
  req.transactionId = transactionId;

  // Proceed to next middleware
  next();
};