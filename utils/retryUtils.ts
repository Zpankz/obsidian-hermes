export interface RetryOptions {
  maxRetries: number;
  delay: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { maxRetries: 2, delay: 1000 }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxRetries) {
        // Max retries reached, bail out
        throw new Error('could not recover!');
      }
      
      // Log retry attempt
      if (options.onRetry) {
        options.onRetry(attempt + 1, lastError);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
  }
  
  throw lastError!;
}

export class RetryCounter {
  private attempts = 0;
  
  constructor(private maxRetries: number = 2) {}
  
  get retryCount(): number {
    return this.attempts;
  }
  
  get canRetry(): boolean {
    return this.attempts < this.maxRetries;
  }
  
  increment(): void {
    this.attempts++;
  }
  
  reset(): void {
    this.attempts = 0;
  }
  
  get shouldBail(): boolean {
    return this.attempts >= this.maxRetries;
  }
}
