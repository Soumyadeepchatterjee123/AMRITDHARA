import { format as dateFnsFormat, parseISO, isValid } from 'date-fns';
import { Theme } from '@mui/material/styles';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CSVColumn {
  key: string;
  header: string;
}

export type StatusType = 'Active' | 'Inactive' | 'Maintenance' | 'Unknown' | 'Safe' | 'Moderate' | 'Critical';

export interface DataPoint {
  [key: string]: any;
}

// ============================================================================
// Date Formatting Functions
// ============================================================================

/**
 * Format a date string or Date object to a specified format
 * @param date Date to format
 * @param formatStr Format string (default: 'dd MMM yyyy')
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr = 'dd MMM yyyy'
): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }
    
    return dateFnsFormat(dateObj, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a date for API requests (ISO format)
 * @param date Date to format
 * @returns ISO formatted date string
 */
export const formatDateForAPI = (date: Date | null): string => {
  if (!date || !isValid(date)) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param date Date to calculate relative time from
 * @returns Relative time string
 */
export const getRelativeTimeString = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid Date';
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
};

// ============================================================================
// Number Formatting Functions
// ============================================================================

/**
 * Format a number with specified precision and add units
 * @param value Number to format
 * @param precision Number of decimal places
 * @param unit Optional unit to append
 * @returns Formatted number string with unit
 */
export const formatNumber = (
  value: number | null | undefined,
  precision = 2,
  unit = ''
): string => {
  if (value === null || value === undefined) return 'N/A';
  
  const formattedValue = Number.isInteger(value) && precision === 0
    ? value.toString()
    : value.toFixed(precision);
  
  return unit ? `${formattedValue} ${unit}` : formattedValue;
};

/**
 * Format a number as a percentage
 * @param value Number to format as percentage
 * @param precision Number of decimal places
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number | null | undefined,
  precision = 1
): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(precision)}%`;
};

/**
 * Format groundwater level with appropriate units
 * @param value Groundwater level value
 * @param unit Unit to use (default: 'm')
 * @returns Formatted groundwater level
 */
export const formatGroundwaterLevel = (
  value: number | null | undefined,
  unit = 'm'
): string => {
  return formatNumber(value, 2, unit);
};

/**
 * Format a large number with appropriate suffix (K, M, B)
 * @param value Number to format
 * @returns Formatted number with suffix
 */
export const formatLargeNumber = (value: number): string => {
  if (value === null || value === undefined) return 'N/A';
  
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  
  return value.toString();
};

// ============================================================================
// Status Color Mapping
// ============================================================================

/**
 * Get color for a status value
 * @param status Status string
 * @param theme MUI theme object (optional)
 * @returns Color string for the status
 */
export const getStatusColor = (status: StatusType | string, theme?: Theme): string => {
  if (!status) return '#9e9e9e'; // Default gray
  
  const statusLower = status.toLowerCase();
  
  // If theme is provided, use theme colors
  if (theme) {
    if (statusLower.includes('safe') || statusLower.includes('active')) {
      return theme.palette.success.main;
    }
    
    if (statusLower.includes('moderate') || statusLower.includes('maintenance')) {
      return theme.palette.warning.main;
    }
    
    if (statusLower.includes('critical') || statusLower.includes('inactive')) {
      return theme.palette.error.main;
    }
    
    return theme.palette.grey[500]; // Default for unknown
  }
  
  // Fallback colors if no theme is provided
  if (statusLower.includes('safe') || statusLower.includes('active')) {
    return '#4caf50'; // Green
  }
  
  if (statusLower.includes('moderate') || statusLower.includes('maintenance')) {
    return '#ff9800'; // Orange
  }
  
  if (statusLower.includes('critical') || statusLower.includes('inactive')) {
    return '#f44336'; // Red
  }
  
  return '#9e9e9e'; // Default gray
};

/**
 * Get background color for a status with reduced opacity
 * @param status Status string
 * @param opacity Opacity value (0-1)
 * @param theme MUI theme object (optional)
 * @returns Background color string with opacity
 */
export const getStatusBackgroundColor = (
  status: StatusType | string,
  opacity = 0.1,
  theme?: Theme
): string => {
  const color = getStatusColor(status, theme);
  
  // Extract RGB components
  let r, g, b;
  
  if (color.startsWith('#')) {
    // Hex color
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    // RGB color
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    } else {
      r = 0;
      g = 0;
      b = 0;
    }
  } else {
    // Fallback
    r = 0;
    g = 0;
    b = 0;
  }
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// ============================================================================
// Data Transformation Utilities
// ============================================================================

/**
 * Group array items by a key
 * @param array Array to group
 * @param key Key to group by
 * @returns Object with groups
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Sort array by a key
 * @param array Array to sort
 * @param key Key to sort by
 * @param direction Sort direction ('asc' or 'desc')
 * @returns Sorted array
 */
export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Filter array by a search term across multiple keys
 * @param array Array to filter
 * @param searchTerm Search term
 * @param keys Keys to search in
 * @returns Filtered array
 */
export const filterBySearchTerm = <T>(
  array: T[],
  searchTerm: string,
  keys: (keyof T)[]
): T[] => {
  if (!searchTerm) return array;
  
  const term = searchTerm.toLowerCase();
  
  return array.filter(item => {
    return keys.some(key => {
      const value = item[key];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(term);
    });
  });
};

/**
 * Calculate statistics for an array of numbers
 * @param values Array of numbers
 * @returns Object with statistics
 */
export const calculateStats = (values: number[]) => {
  if (!values.length) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      sum: 0,
      count: 0,
      median: 0,
    };
  }
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  
  return {
    min: sortedValues[0],
    max: sortedValues[sortedValues.length - 1],
    avg: sum / values.length,
    sum,
    count: values.length,
    median: sortedValues[Math.floor(sortedValues.length / 2)],
  };
};

/**
 * Convert array to key-value object
 * @param array Array to convert
 * @param keyField Field to use as key
 * @param valueField Field to use as value (optional)
 * @returns Key-value object
 */
export const arrayToObject = <T, K extends keyof T, V extends keyof T>(
  array: T[],
  keyField: K,
  valueField?: V
): Record<string, V extends undefined ? T : T[V]> => {
  return array.reduce((result, item) => {
    const key = String(item[keyField]);
    const value = valueField ? item[valueField] : item;
    result[key] = value as any;
    return result;
  }, {} as Record<string, any>);
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate email address
 * @param email Email to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object with validation result and message
 */
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is strong' };
};

/**
 * Validate a URL
 * @param url URL to validate
 * @returns Boolean indicating if URL is valid
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate if a value is a number within a range
 * @param value Value to validate
 * @param min Minimum value (optional)
 * @param max Maximum value (optional)
 * @returns Boolean indicating if value is valid
 */
export const isValidNumber = (
  value: any,
  min?: number,
  max?: number
): boolean => {
  const num = Number(value);
  
  if (isNaN(num)) {
    return false;
  }
  
  if (min !== undefined && num < min) {
    return false;
  }
  
  if (max !== undefined && num > max) {
    return false;
  }
  
  return true;
};

// ============================================================================
// CSV Export Helpers
// ============================================================================

/**
 * Export data to CSV file
 * @param data Array of data objects
 * @param columns Array of column definitions
 * @param filename Filename for the CSV
 */
export const exportToCSV = <T extends DataPoint>(
  data: T[],
  columns: CSVColumn[],
  filename: string
): void => {
  // Create header row
  const headerRow = columns.map(column => `"${column.header}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(item => {
    return columns
      .map(column => {
        const value = item[column.key];
        // Handle special cases like dates and numbers
        if (value instanceof Date) {
          return `"${formatDate(value)}"`;
        } else if (typeof value === 'string') {
          // Escape quotes in strings
          return `"${value.replace(/"/g, '""')}"`;
        } else {
          return `"${value}"`;
        }
      })
      .join(',');
  });
  
  // Combine header and data rows
  const csvContent = [headerRow, ...dataRows].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Convert data to CSV string
 * @param data Array of data objects
 * @param columns Array of column definitions
 * @returns CSV string
 */
export const dataToCSV = <T extends DataPoint>(
  data: T[],
  columns: CSVColumn[]
): string => {
  // Create header row
  const headerRow = columns.map(column => `"${column.header}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(item => {
    return columns
      .map(column => {
        const value = item[column.key];
        // Handle special cases like dates and numbers
        if (value instanceof Date) {
          return `"${formatDate(value)}"`;
        } else if (typeof value === 'string') {
          // Escape quotes in strings
          return `"${value.replace(/"/g, '""')}"`;
        } else {
          return `"${value}"`;
        }
      })
      .join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
};

// ============================================================================
// Color Contrast Utilities
// ============================================================================

/**
 * Calculate contrast ratio between two colors
 * @param color1 First color (hex)
 * @param color2 Second color (hex)
 * @returns Contrast ratio
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (hexColor: string): number => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;
    
    // Calculate relative luminance
    const rgb = [r, g, b].map(c => {
      if (c <= 0.03928) {
        return c / 12.92;
      }
      return Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  // Calculate contrast ratio
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return parseFloat(ratio.toFixed(2));
};

/**
 * Determine if text color should be light or dark based on background
 * @param backgroundColor Background color (hex)
 * @returns Text color ('white' or 'black')
 */
export const getTextColorForBackground = (backgroundColor: string): string => {
  // Convert hex to RGB
  const r = parseInt(backgroundColor.slice(1, 3), 16);
  const g = parseInt(backgroundColor.slice(3, 5), 16);
  const b = parseInt(backgroundColor.slice(5, 7), 16);
  
  // Calculate perceived brightness (YIQ formula)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  
  return yiq >= 128 ? 'black' : 'white';
};

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Generate ARIA label for a chart
 * @param title Chart title
 * @param description Chart description
 * @param dataPoints Number of data points
 * @returns ARIA label string
 */
export const generateChartAriaLabel = (
  title: string,
  description: string,
  dataPoints: number
): string => {
  return `${title}. ${description}. Chart with ${dataPoints} data points.`;
};

/**
 * Generate ARIA label for a status indicator
 * @param status Status value
 * @param entityName Name of the entity (e.g., 'station')
 * @returns ARIA label string
 */
export const generateStatusAriaLabel = (
  status: string,
  entityName: string = 'item'
): string => {
  return `${entityName} status: ${status}`;
};

/**
 * Create a keyboard accessible click handler
 * @param onClick Click handler function
 * @returns Event handler for both click and keyboard events
 */
export const createAccessibleClickHandler = (
  onClick: () => void
): { onClick: () => void; onKeyDown: (e: React.KeyboardEvent) => void } => {
  return {
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };
};

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Parse error message from various error types
 * @param error Error object
 * @param fallbackMessage Fallback message if error can't be parsed
 * @returns Error message string
 */
export const parseErrorMessage = (
  error: any,
  fallbackMessage = 'An unexpected error occurred'
): string => {
  if (!error) return fallbackMessage;
  
  // Handle Axios errors
  if (error.response) {
    // Server responded with error
    const data = error.response.data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    return `Server error: ${error.response.status}`;
  }
  
  if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your network connection.';
  }
  
  // Handle regular Error objects
  if (error.message) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  return fallbackMessage;
};

/**
 * Log error with context information
 * @param error Error object
 * @param context Additional context information
 */
export const logError = (error: any, context: Record<string, any> = {}): void => {
  console.error('Error:', {
    message: parseErrorMessage(error),
    originalError: error,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // Here you could add integration with error tracking services
  // like Sentry, LogRocket, etc.
};

/**
 * Create a safe function that catches errors
 * @param fn Function to make safe
 * @param fallbackValue Fallback value to return if function throws
 * @returns Safe function that never throws
 */
export const createSafeFunction = <T, R>(
  fn: (...args: T[]) => R,
  fallbackValue: R
): ((...args: T[]) => R) => {
  return (...args: T[]): R => {
    try {
      return fn(...args);
    } catch (error) {
      logError(error, { functionName: fn.name, arguments: args });
      return fallbackValue;
    }
  };
};

// ============================================================================
// Text Formatting Functions
// ============================================================================

/**
 * Truncate text to a specified length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @param suffix Suffix to add to truncated text
 * @returns Truncated text
 */
export const truncateText = (
  text: string,
  maxLength: number,
  suffix = '...'
): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Convert text to title case
 * @param text Text to convert
 * @returns Title case text
 */
export const toTitleCase = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Convert camelCase to sentence case
 * @param text Text to convert
 * @returns Sentence case text
 */
export const camelToSentenceCase = (text: string): string => {
  if (!text) return '';
  const result = text.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/**
 * Generate initials from a name
 * @param name Full name
 * @param maxLength Maximum length of initials
 * @returns Initials string
 */
export const getInitials = (name: string, maxLength = 2): string => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .filter(char => char.match(/[A-Z]/))
    .slice(0, maxLength)
    .join('');
};
