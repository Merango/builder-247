import { performance } from 'perf_hooks';
import { Logger } from '../utils/logger';

interface TransactionCheckResult {
  isUnique: boolean;
  metadata?: Record<string, any>;
}

export class TransactionUniquenessService {
  private static instance: TransactionUniquenessService;
  private transactionCache = new Set<string>();
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('TransactionUniquenessService');
  }

  public static getInstance(): TransactionUniquenessService {
    if (!this.instance) {
      this.instance = new TransactionUniquenessService();
    }
    return this.instance;
  }

  /**
   * Check if a transaction is unique
   * @param transactionId Unique transaction identifier
   * @returns TransactionCheckResult
   */
  public checkTransactionUniqueness(transactionId: string): TransactionCheckResult {
    const startTime = performance.now();

    try {
      // Check if transaction already exists
      if (this.transactionCache.has(transactionId)) {
        this.logger.warn(`Duplicate transaction detected: ${transactionId}`, {
          transactionId,
          timestamp: new Date().toISOString()
        });

        return {
          isUnique: false,
          metadata: {
            reason: 'Transaction already processed',
            timestamp: new Date().toISOString()
          }
        };
      }

      // Add transaction to cache
      this.transactionCache.add(transactionId);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Log successful unique transaction
      this.logger.info(`Unique transaction validated: ${transactionId}`, {
        transactionId,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        isUnique: true,
        metadata: {
          processingTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Transaction uniqueness check failed', { 
        transactionId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        isUnique: false,
        metadata: {
          reason: 'Validation service error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Clear old transactions periodically to prevent memory growth
  public clearOldTransactions(maxAgeMinutes: number = 60): void {
    // Implement cache cleanup logic here
    // This is a placeholder for more sophisticated cache management
    this.transactionCache.clear();
  }
}