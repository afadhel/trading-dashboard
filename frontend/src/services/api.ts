import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { 
  CurrentState, 
  TradingSignal, 
  PerformanceMetric, 
  Symbol, 
  TimeframeConfig,
  ApiResponse,
  WebSocketMessage 
} from '../types';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-digitalocean-function-url';
const WS_URL = process.env.REACT_APP_WS_URL || 'wss://your-websocket-url';

// Axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access detected');
    }
    return Promise.reject(error);
  }
);

// API Service Class
export class ApiService {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  // ==== REST API METHODS ====

  /**
   * Get current states for all symbols
   */
  async getCurrentStates(): Promise<CurrentState[]> {
    try {
      const response = await apiClient.get<ApiResponse<CurrentState[]>>('/current-states');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching current states:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get signal history for a specific symbol
   */
  async getSignalHistory(symbol: string, limit: number = 50): Promise<TradingSignal[]> {
    try {
      const response = await apiClient.get<ApiResponse<TradingSignal[]>>(
        `/history/${symbol}?limit=${limit}`
      );
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(symbol?: string, days: number = 7): Promise<PerformanceMetric[]> {
    try {
      const params = new URLSearchParams();
      if (symbol) params.append('symbol', symbol);
      params.append('days', days.toString());

      const response = await apiClient.get<ApiResponse<PerformanceMetric[]>>(
        `/performance?${params.toString()}`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get all active symbols
   */
  async getSymbols(): Promise<Symbol[]> {
    try {
      const response = await apiClient.get<ApiResponse<Symbol[]>>('/symbols');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching symbols:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get timeframes configuration
   */
  async getTimeframesConfig(): Promise<TimeframeConfig[]> {
    try {
      const response = await apiClient.get<ApiResponse<TimeframeConfig[]>>('/timeframes');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching timeframes config:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw this.handleApiError(error);
    }
  }

  // ==== WEBSOCKET METHODS ====

  /**
   * Initialize WebSocket connection
   */
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(WS_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected successfully');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.notifyHandlers('disconnect', { reason });
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        });

        this.socket.on('message', (message: WebSocketMessage) => {
          this.handleWebSocketMessage(message);
        });

        this.socket.on('signal_update', (data) => {
          this.notifyHandlers('signal_update', data);
        });

        this.socket.on('initial_data', (data) => {
          this.notifyHandlers('initial_data', data);
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.notifyHandlers('error', error);
        });

      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Subscribe to symbol updates
   */
  subscribeToSymbol(symbol: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_symbol', { symbol });
      console.log(`Subscribed to ${symbol} updates`);
    }
  }

  /**
   * Unsubscribe from symbol updates
   */
  unsubscribeFromSymbol(symbol: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_symbol', { symbol });
      console.log(`Unsubscribed from ${symbol} updates`);
    }
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Get WebSocket connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ==== PRIVATE METHODS ====

  private handleWebSocketMessage(message: WebSocketMessage): void {
    console.log('WebSocket message received:', message);
    this.notifyHandlers(message.type, message.data);
  }

  private notifyHandlers(type: string, data: any): void {
    const handler = this.messageHandlers.get(type);
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in message handler for ${type}:`, error);
      }
    }
  }

  private handleApiError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const message = error.response.data?.message || error.response.statusText;
        return new Error(`API Error (${error.response.status}): ${message}`);
      } else if (error.request) {
        // Network error
        return new Error('Network error: Unable to reach server');
      }
    }
    
    return error instanceof Error ? error : new Error('Unknown API error');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export helper functions
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(price);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}; 