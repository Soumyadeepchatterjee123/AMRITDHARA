import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, CancelTokenSource } from 'axios';

// Types for API responses and requests
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StationData {
  id: string;
  name: string;
  code: string;
  type: string;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Unknown';
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    state: string;
    district: string;
    block: string;
    village?: string;
  };
  depthDetails: {
    totalDepth: number;
    waterLevel: number;
    lastMeasured: string;
  };
  installationDate: string;
  lastUpdated: string;
  lastMaintenance?: string;
  operator?: string;
  contactInfo?: string;
  notes?: string;
  tags?: string[];
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  waterLevel: number;
  rainfall?: number;
  temperature?: number;
  status?: string;
}

export interface NearbyStation {
  id: string;
  name: string;
  code: string;
  distance: number;
  status: string;
  location: {
    latitude: number;
    longitude: number;
  };
  currentWaterLevel: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'guest';
  firstName?: string;
  lastName?: string;
  organization?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  dashboardLayout?: any;
  dataRefreshInterval: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface StationSearchParams {
  query?: string;
  state?: string;
  district?: string;
  block?: string;
  status?: string;
  type?: string;
  waterLevelMin?: number;
  waterLevelMax?: number;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AnalyticsParams {
  stations?: string[];
  metrics?: string[];
  startDate?: string;
  endDate?: string;
  interval?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  includeRainfall?: boolean;
  includeTemperature?: boolean;
}

export interface ReportParams {
  type: 'station' | 'regional' | 'comparative' | 'trend';
  stations?: string[];
  region?: {
    state?: string;
    district?: string;
    block?: string;
  };
  startDate?: string;
  endDate?: string;
  metrics?: string[];
  format?: 'csv' | 'json' | 'pdf';
}

// Create a class for the API client
class ApiClient {
  private instance: AxiosInstance;
  private cancelTokenSources: Map<string, CancelTokenSource>;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    // Create axios instance with default config
    this.instance = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize cancel token sources map
    this.cancelTokenSources = new Map();

    // Add request interceptor for authentication
    this.instance.interceptors.request.use(
      (config) => {
        // Add authorization header if token exists
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling and token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        // Handle token expiration
        if (error.response?.status === 401 && originalRequest && !originalRequest.headers['X-Retry']) {
          // Set retry flag to prevent infinite loop
          if (originalRequest.headers) {
            originalRequest.headers['X-Retry'] = 'true';
          }
          
          try {
            // Try to refresh the token
            const newToken = await this.refreshToken();
            
            // Update the authorization header
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            
            // Retry the original request
            return this.instance(originalRequest);
          } catch (refreshError) {
            // If refresh fails, logout the user
            this.logout();
            return Promise.reject(refreshError);
          }
        }
        
        // Handle network errors with retry logic
        if (error.message === 'Network Error' && originalRequest && !originalRequest.headers['X-Network-Retry']) {
          const retryCount = originalRequest.headers['X-Network-Retry-Count'] || 0;
          
          if (retryCount < 3) {
            return new Promise((resolve) => {
              setTimeout(async () => {
                if (originalRequest.headers) {
                  originalRequest.headers['X-Network-Retry'] = 'true';
                  originalRequest.headers['X-Network-Retry-Count'] = retryCount + 1;
                }
                resolve(this.instance(originalRequest));
              }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
            });
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await this.instance.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
      
      if (response.data.success) {
        const { token, refreshToken, user } = response.data.data;
        
        // Store tokens in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        return user;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw this.handleError(error, 'Login failed');
    }
  }

  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('refresh_token');
      if (token) {
        // Invalidate the token on the server
        await this.instance.post('/auth/logout', { refreshToken: token });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of server response
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  async refreshToken(): Promise<string> {
    // If a refresh is already in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Create a new refresh promise
    this.refreshPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post<ApiResponse<{ token: string }>>(
          `${this.instance.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );
        
        if (response.data.success) {
          const newToken = response.data.data.token;
          localStorage.setItem('auth_token', newToken);
          resolve(newToken);
        } else {
          throw new Error(response.data.message || 'Token refresh failed');
        }
      } catch (error) {
        // Clear tokens on refresh failure
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        reject(error);
      } finally {
        this.refreshPromise = null;
      }
    });
    
    return this.refreshPromise;
  }

  // Station CRUD operations
  async fetchStations(params?: StationSearchParams): Promise<PaginatedResponse<StationData>> {
    try {
      const response = await this.instance.get<ApiResponse<PaginatedResponse<StationData>>>('/stations', {
        params,
        cancelToken: this.getCancelToken('fetchStations'),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch stations');
    }
  }

  async fetchStationDetails(stationId: string): Promise<StationData> {
    try {
      const response = await this.instance.get<ApiResponse<StationData>>(`/stations/${stationId}`, {
        cancelToken: this.getCancelToken(`fetchStationDetails-${stationId}`),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch station details');
    }
  }

  async createStation(stationData: Partial<StationData>): Promise<StationData> {
    try {
      const response = await this.instance.post<ApiResponse<StationData>>('/stations', stationData);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create station');
    }
  }

  async updateStation(stationId: string, stationData: Partial<StationData>): Promise<StationData> {
    try {
      const response = await this.instance.put<ApiResponse<StationData>>(`/stations/${stationId}`, stationData);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update station');
    }
  }

  async deleteStation(stationId: string): Promise<boolean> {
    try {
      const response = await this.instance.delete<ApiResponse<boolean>>(`/stations/${stationId}`);
      return response.data.success;
    } catch (error) {
      throw this.handleError(error, 'Failed to delete station');
    }
  }

  // Time series data operations
  async fetchStationTimeSeries(
    stationId: string, 
    timeRange: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all' = '1m',
    includeRainfall: boolean = true,
    includeTemperature: boolean = false
  ): Promise<TimeSeriesDataPoint[]> {
    try {
      const response = await this.instance.get<ApiResponse<TimeSeriesDataPoint[]>>(
        `/stations/${stationId}/timeseries`,
        {
          params: { timeRange, includeRainfall, includeTemperature },
          cancelToken: this.getCancelToken(`fetchTimeSeries-${stationId}-${timeRange}`),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch time series data');
    }
  }

  async fetchCustomTimeSeries(
    stationId: string,
    startDate: string,
    endDate: string,
    metrics: string[] = ['waterLevel'],
    interval?: 'hour' | 'day' | 'week' | 'month'
  ): Promise<TimeSeriesDataPoint[]> {
    try {
      const response = await this.instance.get<ApiResponse<TimeSeriesDataPoint[]>>(
        `/stations/${stationId}/timeseries/custom`,
        {
          params: { startDate, endDate, metrics: metrics.join(','), interval },
          cancelToken: this.getCancelToken(`fetchCustomTimeSeries-${stationId}`),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch custom time series data');
    }
  }

  // Nearby stations
  async fetchNearbyStations(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 10
  ): Promise<NearbyStation[]> {
    try {
      const response = await this.instance.get<ApiResponse<NearbyStation[]>>('/stations/nearby', {
        params: { latitude, longitude, radius, limit },
        cancelToken: this.getCancelToken(`fetchNearbyStations-${latitude}-${longitude}-${radius}`),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch nearby stations');
    }
  }

  // Advanced search operations
  async searchStationsAdvanced(params: StationSearchParams): Promise<PaginatedResponse<StationData>> {
    try {
      const response = await this.instance.post<ApiResponse<PaginatedResponse<StationData>>>(
        '/stations/search',
        params,
        {
          cancelToken: this.getCancelToken('searchStationsAdvanced'),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to search stations');
    }
  }

  async getStationsByRegion(
    state?: string,
    district?: string,
    block?: string
  ): Promise<StationData[]> {
    try {
      const response = await this.instance.get<ApiResponse<StationData[]>>('/stations/region', {
        params: { state, district, block },
        cancelToken: this.getCancelToken(`getStationsByRegion-${state}-${district}-${block}`),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch stations by region');
    }
  }

  // Batch operations
  async getBatchStationDetails(stationIds: string[]): Promise<Record<string, StationData>> {
    try {
      const response = await this.instance.post<ApiResponse<Record<string, StationData>>>(
        '/stations/batch',
        { stationIds },
        {
          cancelToken: this.getCancelToken('getBatchStationDetails'),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch batch station details');
    }
  }

  async getBatchTimeSeries(
    stationIds: string[],
    timeRange: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' = '1m'
  ): Promise<Record<string, TimeSeriesDataPoint[]>> {
    try {
      const response = await this.instance.post<ApiResponse<Record<string, TimeSeriesDataPoint[]>>>(
        '/stations/batch/timeseries',
        { stationIds, timeRange },
        {
          cancelToken: this.getCancelToken(`getBatchTimeSeries-${timeRange}`),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch batch time series data');
    }
  }

  // Analytics operations
  async getAnalyticsData(params: AnalyticsParams): Promise<any> {
    try {
      const response = await this.instance.post<ApiResponse<any>>(
        '/analytics',
        params,
        {
          cancelToken: this.getCancelToken('getAnalyticsData'),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch analytics data');
    }
  }

  // Reports operations
  async getReportsData(params: ReportParams): Promise<any> {
    try {
      const response = await this.instance.post<ApiResponse<any>>(
        '/reports',
        params,
        {
          cancelToken: this.getCancelToken('getReportsData'),
          responseType: params.format === 'pdf' ? 'blob' : 'json',
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to generate report');
    }
  }

  // User preferences management
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const response = await this.instance.get<ApiResponse<UserPreferences>>('/user/preferences');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user preferences');
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await this.instance.put<ApiResponse<UserPreferences>>('/user/preferences', preferences);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update user preferences');
    }
  }

  // User profile management
  async getUserProfile(): Promise<User> {
    try {
      const response = await this.instance.get<ApiResponse<User>>('/user/profile');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user profile');
    }
  }

  async updateUserProfile(profileData: Partial<User>): Promise<User> {
    try {
      const response = await this.instance.put<ApiResponse<User>>('/user/profile', profileData);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update user profile');
    }
  }

  // File upload
  async uploadFile(file: File, type: 'profile' | 'station' | 'report', relatedId?: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (relatedId) {
        formData.append('relatedId', relatedId);
      }

      const response = await this.instance.post<ApiResponse<{ url: string }>>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data.url;
    } catch (error) {
      throw this.handleError(error, 'Failed to upload file');
    }
  }

  // Utility methods for request cancellation
  private getCancelToken(key: string): any {
    // Cancel previous request with the same key
    this.cancelRequest(key);
    
    // Create new cancel token
    const source = axios.CancelToken.source();
    this.cancelTokenSources.set(key, source);
    return source.token;
  }

  cancelRequest(key: string): void {
    const source = this.cancelTokenSources.get(key);
    if (source) {
      source.cancel(`Request ${key} cancelled`);
      this.cancelTokenSources.delete(key);
    }
  }

  cancelAllRequests(): void {
    this.cancelTokenSources.forEach((source, key) => {
      source.cancel(`Request ${key} cancelled due to cleanup`);
    });
    this.cancelTokenSources.clear();
  }

  // Error handling
  private handleError(error: any, defaultMessage: string): Error {
    // Don't throw errors for cancelled requests
    if (axios.isCancel(error)) {
      console.log('Request cancelled:', error.message);
      return new Error('Request cancelled');
    }

    // Handle axios errors
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      const serverMessage = error.response.data?.message || defaultMessage;
      console.error('API error:', serverMessage, error.response);
      return new Error(serverMessage);
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network error:', error.request);
      return new Error('Network error. Please check your connection.');
    } else {
      // Error in setting up the request
      console.error('Request error:', error.message);
      return new Error(defaultMessage);
    }
  }
}

// Create and export a singleton instance
const api = new ApiClient();
export default api;
