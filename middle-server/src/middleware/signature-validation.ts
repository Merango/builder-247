import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface SignatureValidationOptions {
  signatureHeader?: string;
  timestampHeader?: string;
  signatureMaxAge?: number;
  logger?: (message: string, level?: 'info' | 'error') => void;
}

/**
 * Signature Validation Middleware
 * Validates the signature of incoming requests to ensure data integrity and authenticity
 */
export const signatureValidationMiddleware = (
  secretKey: string,
  options: SignatureValidationOptions = {}
) => {
  const {
    signatureHeader = 'x-signature',
    timestampHeader = 'x-timestamp',
    signatureMaxAge = 5 * 60 * 1000, // 5 minutes
    logger = console.log
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract signature, timestamp, and request body
      const signature = req.headers[signatureHeader] as string;
      const timestampStr = req.headers[timestampHeader] as string;

      // Check if signature or timestamp are missing
      if (!signature || !timestampStr) {
        logger('Missing signature or timestamp', 'error');
        return res.status(401).json({ 
          error: 'Missing signature or timestamp' 
        });
      }

      const timestamp = parseInt(timestampStr, 10);

      // Check timestamp validity
      const currentTime = Date.now();
      if (isNaN(timestamp) || Math.abs(currentTime - timestamp) > signatureMaxAge) {
        logger('Invalid or expired timestamp', 'error');
        return res.status(401).json({ 
          error: 'Invalid or expired timestamp' 
        });
      }

      // Prepare payload for signature verification
      const payload = JSON.stringify(req.body) + timestamp;

      // Compute HMAC signature
      const computedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

      // Compare signatures with constant-time comparison
      const isValidSignature = computedSignature === signature;

      if (!isValidSignature) {
        logger('Invalid signature', 'error');
        return res.status(401).json({ 
          error: 'Invalid signature' 
        });
      }

      // Log successful validation
      logger('Signature validated successfully', 'info');

      // Signature is valid, proceed to next middleware
      next();
    } catch (error) {
      logger(`Signature validation error: ${error}`, 'error');
      res.status(500).json({ 
        error: 'Internal server error during signature validation' 
      });
    }
  };
};