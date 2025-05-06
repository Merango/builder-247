export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(metadata && { metadata })
    };
    
    // In production, replace with proper logging framework
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'](
      JSON.stringify(logEntry, null, 2)
    );
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.formatMessage('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.formatMessage('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.formatMessage('error', message, metadata);
  }
}