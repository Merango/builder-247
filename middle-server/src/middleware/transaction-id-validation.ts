import { Request, Response, NextFunction } from 'express';
import { v4 as uuidValidate } from 'uuid';

/**
 * Middleware to validate transaction ID
 * 
 * Checks for the presence and validity of a transaction ID in the request
 * - Looks for transaction ID in headers, query params, or request body
 * - Validates that the transaction ID is a valid UUID v4
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next middleware function
 */
export const validateTransactionId = (req: Request, res: Response, next: NextFunction) => {
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
    return res.status(400).json({
      error: 'Transaction ID is required',
      message: 'A valid transaction ID must be provided in headers, query params, or request body'
    });
  }

  // Validate transaction ID is a string
  if (typeof transactionId !== 'string') {
    return res.status(400).json({
      error: 'Invalid Transaction ID',
      message: 'Transaction ID must be a string'
    });
  }

  // Validate transaction ID is a valid UUID v4
  if (!uuidValidate(transactionId)) {
    return res.status(400).json({
      error: 'Invalid Transaction ID',
      message: 'Transaction ID must be a valid UUID v4'
    });
  }

  // Attach the validated transaction ID to the request for downstream use
  req.transactionId = transactionId;

  // Proceed to next middleware
  next();
};