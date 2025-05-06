import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Signature Validation Middleware
 * Validates the signature of incoming requests to ensure data integrity and authenticity
 */
export const signatureValidationMiddleware = (
  secretKey: string,
  signatureHeader: string = 'x-signature',
  timestampHeader: string = 'x-timestamp',
  signatureMaxAge: number = 5 * 60 * 1000 // 5 minutes
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract signature, timestamp, and request body
      const signature = req.headers[signatureHeader] as string;
      const timestampStr = req.headers[timestampHeader] as string;

      // Check if signature or timestamp are missing
      if (!signature || !timestampStr) {
        return res.status(401).json({ 
          error: 'Missing signature or timestamp' 
        });
      }

      const timestamp = parseInt(timestampStr, 10);

      // Check timestamp validity
      const currentTime = Date.now();
      if (isNaN(timestamp) || Math.abs(currentTime - timestamp) > signatureMaxAge) {
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

      // Compare signatures
      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      )) {
        return res.status(401).json({ 
          error: 'Invalid signature' 
        });
      }

      // Signature is valid, proceed to next middleware
      next();
    } catch (error) {
      console.error('Signature validation error:', error);
      res.status(500).json({ 
        error: 'Internal server error during signature validation' 
      });
    }
  };
};