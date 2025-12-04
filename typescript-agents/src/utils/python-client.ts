/**
 * Python Service Client - HTTP client for Python microservices
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Request/response validation
 * - Error handling
 * - Timeout management
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AgentError, AgentErrorType } from '../types';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Python service client configuration
 */
interface PythonServiceConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

/**
 * Python Service Client class
 */
export class PythonServiceClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;

  constructor(config: PythonServiceConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      }
    });

    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config.retryConfig
    };

    console.log(`✅ Python service client initialized: ${config.baseURL}`);
  }

  /**
   * Make a request with retry logic
   */
  private async requestWithRetry<T>(
    config: AxiosRequestConfig,
    attempt: number = 1
  ): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // Check if we should retry
      if (attempt < this.retryConfig.maxRetries && this.shouldRetry(axiosError)) {
        const delay = this.calculateDelay(attempt);
        console.log(`⚠️  Request failed, retrying in ${delay}ms (attempt ${attempt}/${this.retryConfig.maxRetries})...`);
        
        await this.sleep(delay);
        return this.requestWithRetry<T>(config, attempt + 1);
      }

      // No more retries, throw error
      throw this.handleError(axiosError);
    }
  }

  /**
   * Determine if error should trigger a retry
   */
  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on 5xx server errors
    if (error.response.status >= 500) {
      return true;
    }

    // Retry on 429 (rate limit)
    if (error.response.status === 429) {
      return true;
    }

    // Don't retry on 4xx client errors (except 429)
    return false;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * 
                  Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle axios errors
   */
  private handleError(error: AxiosError): AgentError {
    if (!error.response) {
      return new AgentError(
        AgentErrorType.API_ERROR,
        `Network error: ${error.message}`,
        error
      );
    }

    const status = error.response.status;
    const data = error.response.data as any;

    let message = `HTTP ${status}`;
    if (data?.error) {
      message += `: ${data.error}`;
    }
    if (data?.details) {
      message += ` - ${data.details}`;
    }

    return new AgentError(
      AgentErrorType.API_ERROR,
      message,
      error
    );
  }

  /**
   * Technical analysis endpoint
   */
  async analyzeTechnical(data: {
    grant_id: number;
    project_name: string;
    description: string;
    tech_stack?: string[];
    architecture?: string;
    timeline?: string;
    team_experience?: string;
    github_repos?: string[];
  }): Promise<any> {
    console.log(`📡 Calling Python service: /analyze/technical`);
    return this.requestWithRetry({
      method: 'POST',
      url: '/analyze/technical',
      data
    });
  }

  /**
   * Impact analysis endpoint
   */
  async analyzeImpact(data: {
    grant_id: number;
    project_name: string;
    description: string;
    target_users?: string;
    ecosystem_gap?: string;
    dao_alignment?: string;
    potential_reach?: string;
  }): Promise<any> {
    console.log(`📡 Calling Python service: /analyze/impact`);
    return this.requestWithRetry({
      method: 'POST',
      url: '/analyze/impact',
      data
    });
  }

  /**
   * Due diligence endpoint
   */
  async analyzeDueDiligence(data: {
    grant_id: number;
    team_members?: Array<{
      name: string;
      github?: string;
      wallet?: string;
    }>;
    previous_projects?: Array<{
      name: string;
      url: string;
      status: string;
    }>;
    references?: string[];
  }): Promise<any> {
    console.log(`📡 Calling Python service: /analyze/due-diligence`);
    return this.requestWithRetry({
      method: 'POST',
      url: '/analyze/due-diligence',
      data
    });
  }

  /**
   * Budget analysis endpoint
   */
  async analyzeBudget(data: {
    grant_id: number;
    requested_amount: number;
    budget_breakdown?: Record<string, number>;
    timeline?: string;
    comparable_projects?: string[];
  }): Promise<any> {
    console.log(`📡 Calling Python service: /analyze/budget`);
    return this.requestWithRetry({
      method: 'POST',
      url: '/analyze/budget',
      data
    });
  }

  /**
   * Community sentiment endpoint
   */
  async analyzeCommunity(data: {
    grant_id: number;
    poll_id?: string;
    poll_duration_hours?: number;
  }): Promise<any> {
    console.log(`📡 Calling Python service: /analyze/community`);
    return this.requestWithRetry({
      method: 'POST',
      url: '/analyze/community',
      data
    });
  }

  /**
   * Generate milestones endpoint
   */
  async generateMilestones(data: {
    grant_id: number;
    total_amount: number;
    timeline?: string;
    deliverables?: string[];
  }): Promise<any> {
    console.log(`📡 Calling Python service: /generate-milestones`);
    return this.requestWithRetry({
      method: 'POST',
      url: '/generate-milestones',
      data
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get base URL
   */
  getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }
}
