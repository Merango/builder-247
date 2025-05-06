import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Signature Validation Middleware Configuration
 */
export interface SignatureValidationConfig {
  secretKey: string;
  signatureHeader?: string;
  timestampHeader?: string;
  maxAge?: number;
  logger?: (message: string, level?: 'info' | 'error') => void;
}

/**
 * Signature Validation Middleware
 * Ensures request integrity and authenticity
 */
export function createSignatureValidationMiddleware({
  secretKey,
  signatureHeader = 'x-signature',
  timestampHeader = 'x-timestamp',
  maxAge = 5 * 60 * 1000, // 5 minutes
  logger = console.log
}: SignatureValidationConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract required headers
      const signature = req.headers[signatureHeader] as string;
      const timestampStr = req.headers[timestampHeader] as string;

      // Validate header presence
      if (!signature || !timestampStr) {
        logger('Missing signature or timestamp', 'error');
        return res.status(401).json({ 
          error: 'Missing signature or timestamp',
          details: {
            signaturePresent: !!signature,
            timestampPresent: !!timestampStr
          }
        });
      }

      // Parse timestamp
      const timestamp = parseInt(timestampStr, 10);
      const currentTime = Date.now();

      // Validate timestamp
      if (isNaN(timestamp) || Math.abs(currentTime - timestamp) > maxAge) {
        logger('Invalid or expired timestamp', 'error');
        return res.status(401).json({ 
          error: 'Invalid or expired timestamp',
          details: {
            currentTime,
            requestTimestamp: timestamp,
            timeDifference: Math.abs(currentTime - timestamp)
          }
        });
      }

      // Prepare payload for signature verification
      const payload = JSON.stringify(req.body) + timestamp.toString();

      // Compute HMAC signature
      const computedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

      // Constant-time signature comparison
      const isValidSignature = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );

      if (!isValidSignature) {
        logger('Invalid signature', 'error');
        return res.status(401).json({ 
          error: 'Invalid signature',
          details: {
            receivedSignature: signature,
            computedSignature
          }
        });
      }

      // Log successful validation
      logger('Signature validated successfully', 'info');
      
      // Proceed to next middleware
      next();
    } catch (error) {
      logger(`Signature validation error: ${error}`, 'error');
      res.status(500).json({ 
        error: 'Internal server error during signature validation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// Default export for easier importing
export default function signatureValidationMiddleware(config: SignatureValidationConfig) {
  return createSignatureValidationMiddleware(config);
}