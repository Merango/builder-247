import { performance } from 'perf_hooks';

export interface TransactionValidationResult {
  isValid: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export class TransactionUniquenessService {
  private static instance: TransactionUniquenessService;
  private processedTransactions: Set<string> = new Set();
  private transactionLifetimeMs: number = 60 * 60 * 1000; // 1 hour

  private constructor() {}

  public static getInstance(): TransactionUniquenessService {
    if (!this.instance) {
      this.instance = new TransactionUniquenessService();
    }
    return this.instance;
  }

  /**
   * Validate transaction uniqueness and integrity
   * @param transactionId Unique transaction identifier
   * @returns Validation result
   */
  public validateTransaction(transactionId: string): TransactionValidationResult {
    const startTime = performance.now();

    try {
      // Validate UUID format (basic check)
      if (!this.isValidUUID(transactionId)) {
        return {
          isValid: false,
          reason: 'Invalid UUID format',
          metadata: {
            transactionId,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Check for duplicate transaction
      if (this.processedTransactions.has(transactionId)) {
        return {
          isValid: false,
          reason: 'Duplicate transaction',
          metadata: {
            transactionId,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Mark transaction as processed
      this.processedTransactions.add(transactionId);

      // Schedule transaction cleanup
      this.scheduleTransactionCleanup(transactionId);

      const processingTime = performance.now() - startTime;

      return {
        isValid: true,
        metadata: {
          transactionId,
          processingTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        isValid: false,
        reason: 'Validation error',
        metadata: {
          transactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Schedule transaction cleanup after a specified lifetime
   * @param transactionId Transaction to clean up
   */
  private scheduleTransactionCleanup(transactionId: string): void {
    setTimeout(() => {
      this.processedTransactions.delete(transactionId);
    }, this.transactionLifetimeMs);
  }

  /**
   * Basic UUID validation
   * @param uuid UUID to validate
   * @returns Boolean indicating UUID validity
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}