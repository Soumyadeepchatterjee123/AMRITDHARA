import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  ButtonGroup,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  useTheme,
  useMediaQuery,
  Skeleton,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as ResetIcon,
  FileDownload as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
  Filler,
  ScatterController,
  LineController,
  BarController,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import { formatDate, formatNumber } from '../utils/helpers';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale,
  Filler,
  zoomPlugin,
  annotationPlugin,
  ScatterController,
  LineController,
  BarController
);

// Define interfaces for component props and data structure
export interface DataPoint {
  x: number | Date | string;
  y: number;
}

export interface DataSeries {
  id: string;
  label: string;
  data: DataPoint[];
  color?: string;
  hidden?: boolean;
  type?: 'line' | 'bar' | 'scatter';
  fill?: boolean;
  tension?: number;
  borderWidth?: number;
  pointRadius?: number;
  yAxisID?: string;
}

export interface Threshold {
  value: number;
  label: string;
  color: string;
  yAxisID?: string;
}

export interface TimeRange {
  start: Date | null;
  end: Date | null;
}

export interface TimeSeriesChartProps {
  /**
   * Array of data series to display on the chart
   */
  series: DataSeries[];
  
  /**
   * Chart title
   */
  title?: string;
  
  /**
   * Chart subtitle or description
   */
  description?: string;
  
  /**
   * Height of the chart in pixels
   * @default 400
   */
  height?: number;
  
  /**
   * Whether the chart is loading data
   * @default false
   */
  loading?: boolean;
  
  /**
   * Error message to display if data loading failed
   */
  error?: string | null;
  
  /**
   * Callback function when chart data range changes
   */
  onRangeChange?: (range: TimeRange) => void;
  
  /**
   * Whether to enable zoom and pan functionality
   * @default true
   */
  enableZoom?: boolean;
  
  /**
   * Whether to enable export functionality
   * @default true
   */
  enableExport?: boolean;
  
  /**
   * Whether to enable trend line analysis
   * @default true
   */
  enableTrendline?: boolean;
  
  /**
   * Array of threshold lines to display on the chart
   */
  thresholds?: Threshold[];
  
  /**
   * X-axis label
   * @default "Date"
   */
  xAxisLabel?: string;
  
  /**
   * Y-axis label
   * @default "Value"
   */
  yAxisLabel?: string;
  
  /**
   * Y-axis unit (e.g., "m", "°C")
   */
  yAxisUnit?: string;
  
  /**
   * Secondary Y-axis label (if using dual axes)
   */
  secondaryYAxisLabel?: string;
  
  /**
   * Secondary Y-axis unit
   */
  secondaryYAxisUnit?: string;
  
  /**
   * Whether to allow switching between line and bar chart
   * @default true
   */
  allowChartTypeSwitch?: boolean;
  
  /**
   * Default chart type
   * @default "line"
   */
  defaultChartType?: 'line' | 'bar';
  
  /**
   * CSS class name for custom styling
   */
  className?: string;
  
  /**
   * Additional chart options to merge with defaults
   */
  additionalOptions?: any;
  
  /**
   * Callback function when a data point is clicked
   */
  onPointClick?: (datasetIndex: number, index: number) => void;
  
  /**
   * Callback function when export is triggered
   */
  onExport?: (type: 'png' | 'csv', data: any) => void;
  
  /**
   * Whether to show legend
   * @default true
   */
  showLegend?: boolean;
  
  /**
   * Whether to animate the chart
   * @default true
   */
  animate?: boolean;
}

/**
 * TimeSeriesChart Component (F-05, F-06)
 * 
 * A comprehensive time series chart component with zoom/pan, trend analysis,
 * thresholds, and export functionality.
 */
const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  series,
  title,
  description,
  height = 400,
  loading = false,
  error = null,
  onRangeChange,
  enableZoom = true,
  enableExport = true,
  enableTrendline = true,
  thresholds = [],
  xAxisLabel = "Date",
  yAxisLabel = "Value",
  yAxisUnit,
  secondaryYAxisLabel,
  secondaryYAxisUnit,
  allowChartTypeSwitch = true,
  defaultChartType = 'line',
  className,
  additionalOptions,
  onPointClick,
  onExport,
  showLegend = true,
  animate = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const chartRef = useRef<ChartJS | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // State management
  const [chartType, setChartType] = useState<'line' | 'bar'>(defaultChartType);
  const [showTrendline, setShowTrendline] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [visibleSeries, setVisibleSeries] = useState<string[]>([]);
  const [chartInstance, setChartInstance] = useState<ChartJS | null>(null);
  const [currentRange, setCurrentRange] = useState<TimeRange>({
    start: null,
    end: null,
  });
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  
  // Initialize visible series on component mount
  useEffect(() => {
    if (series && series.length > 0) {
      setVisibleSeries(series.filter(s => !s.hidden).map(s => s.id));
    }
  }, [series]);
  
  // Update chart instance when ref changes
  const onChartRef = useCallback((chart: ChartJS | null) => {
    if (chart) {
      setChartInstance(chart);
      chartRef.current = chart;
    }
  }, []);
  
  // Handle chart type change
  const handleChartTypeChange = (type: 'line' | 'bar') => {
    setChartType(type);
  };
  
  // Handle series visibility toggle
  const handleSeriesToggle = (seriesId: string) => {
    setVisibleSeries(prev => {
      if (prev.includes(seriesId)) {
        return prev.filter(id => id !== seriesId);
      } else {
        return [...prev, seriesId];
      }
    });
  };
  
  // Handle trendline toggle
  const handleTrendlineToggle = () => {
    setShowTrendline(!showTrendline);
  };
  
  // Handle zoom reset
  const handleResetZoom = () => {
    if (chartInstance) {
      chartInstance.resetZoom();
      setIsZoomed(false);
      
      // Notify parent about range change
      if (onRangeChange) {
        onRangeChange({
          start: null,
          end: null,
        });
      }
    }
  };
  
  // Handle zoom in
  const handleZoomIn = () => {
    if (chartInstance) {
      chartInstance.zoom(1.1);
      setIsZoomed(true);
    }
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    if (chartInstance) {
      chartInstance.zoom(0.9);
      setIsZoomed(true);
    }
  };
  
  // Export chart as PNG
  const handleExportPNG = () => {
    if (chartInstance) {
      const url = chartInstance.toBase64Image();
      const link = document.createElement('a');
      link.download = `${title || 'chart'}-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = url;
      link.click();
      
      if (onExport) {
        onExport('png', url);
      }
    }
  };
  
  // Export data as CSV
  const handleExportCSV = () => {
    if (!series || series.length === 0) return;
    
    // Collect all unique x values across all series
    const allXValues = new Set<string>();
    series.forEach(s => {
      s.data.forEach(point => {
        const xValue = point.x instanceof Date 
          ? point.x.toISOString() 
          : String(point.x);
        allXValues.add(xValue);
      });
    });
    
    // Sort x values
    const sortedXValues = Array.from(allXValues).sort();
    
    // Create CSV header row
    let csv = `Date,${series.map(s => s.label).join(',')}\n`;
    
    // Create data rows
    sortedXValues.forEach(xValue => {
      const row = [xValue];
      
      series.forEach(s => {
        const point = s.data.find(p => {
          const pointX = p.x instanceof Date ? p.x.toISOString() : String(p.x);
          return pointX === xValue;
        });
        row.push(point ? String(point.y) : '');
      });
      
      csv += row.join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title || 'chart-data'}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (onExport) {
      onExport('csv', csv);
    }
  };
  
  // Calculate trend line for a series
  const calculateTrendline = (data: DataPoint[]): DataPoint[] => {
    if (!data || data.length < 2) return [];
    
    // Extract x and y values
    const xValues = data.map((point, index) => index);
    const yValues = data.map(point => point.y);
    
    // Calculate linear regression
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
    const sumXX = xValues.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate trend line points
    return data.map((point, index) => ({
      x: point.x,
      y: slope * index + intercept,
    }));
  };
  
  // Prepare chart data
  const chartData = {
    datasets: series
      .filter(s => visibleSeries.includes(s.id))
      .map(s => ({
        label: s.label,
        data: s.data.map(point => ({
          x: point.x,
          y: point.y,
        })),
        borderColor: s.color || theme.palette.primary.main,
        backgroundColor: s.color ? 
          `${s.color}${s.type === 'bar' ? 'CC' : '33'}` : 
          `${theme.palette.primary.main}${s.type === 'bar' ? 'CC' : '33'}`,
        borderWidth: s.borderWidth || 2,
        pointRadius: s.pointRadius || 3,
        pointHoverRadius: (s.pointRadius || 3) + 2,
        tension: s.tension || 0.1,
        fill: s.fill || false,
        yAxisID: s.yAxisID || 'y',
        type: s.type || chartType,
      }))
      // Add trend lines if enabled
      .concat(
        showTrendline ? 
          series
            .filter(s => visibleSeries.includes(s.id))
            .map(s => {
              const trendData = calculateTrendline(s.data);
              return {
                label: `${s.label} (Trend)`,
                data: trendData,
                borderColor: s.color ? 
                  `${s.color}99` : 
                  `${theme.palette.secondary.main}99`,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0,
                fill: false,
                yAxisID: s.yAxisID || 'y',
                type: 'line' as const,
              };
            }) : 
          []
      ),
  };
  
  // Prepare chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animate ? { duration: 500 } : false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (items: any[]) => {
            if (items.length > 0) {
              const item = items[0];
              const xValue = item.parsed.x || item.label;
              
              if (xValue instanceof Date) {
                return formatDate(xValue);
              } else if (typeof xValue === 'string' && !isNaN(Date.parse(xValue))) {
                return formatDate(new Date(xValue));
              }
              return xValue;
            }
            return '';
          },
          label: (item: any) => {
            const dataset = item.dataset;
            const value = item.parsed.y;
            const yAxisID = dataset.yAxisID || 'y';
            const unit = yAxisID === 'y' ? yAxisUnit : secondaryYAxisUnit;
            
            return `${dataset.label}: ${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
          },
        },
      },
      zoom: {
        pan: {
          enabled: enableZoom,
          mode: 'x' as const,
          onPanComplete: ({ chart }: { chart: ChartJS }) => {
            const xAxis = chart.scales.x;
            setIsZoomed(true);
            
            // Notify parent about range change
            if (onRangeChange) {
              onRangeChange({
                start: new Date(xAxis.min),
                end: new Date(xAxis.max),
              });
            }
          },
        },
        zoom: {
          wheel: {
            enabled: enableZoom,
          },
          pinch: {
            enabled: enableZoom,
          },
          mode: 'x' as const,
          onZoomComplete: ({ chart }: { chart: ChartJS }) => {
            const xAxis = chart.scales.x;
            setIsZoomed(true);
            
            // Notify parent about range change
            if (onRangeChange) {
              onRangeChange({
                start: new Date(xAxis.min),
                end: new Date(xAxis.max),
              });
            }
          },
        },
      },
      annotation: {
        annotations: thresholds.map((threshold, index) => ({
          type: 'line',
          yMin: threshold.value,
          yMax: threshold.value,
          borderColor: threshold.color,
          borderWidth: 2,
          borderDash: [6, 4],
          label: {
            display: true,
            content: threshold.label,
            position: 'end',
            backgroundColor: threshold.color,
            color: '#fff',
            font: {
              size: 11,
              weight: 'bold',
            },
          },
          yScaleID: threshold.yAxisID || 'y',
        })),
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          tooltipFormat: 'PPP',
          displayFormats: {
            day: 'MMM d',
          },
        },
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel,
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: isMobile ? 5 : 10,
          color: theme.palette.text.secondary,
        },
      },
      y: {
        title: {
          display: !!yAxisLabel,
          text: yAxisUnit ? `${yAxisLabel} (${yAxisUnit})` : yAxisLabel,
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
        // Add threshold markers to y-axis
        afterDraw: (chart: ChartJS, args: any, options: any) => {
          const ctx = chart.ctx;
          const yAxis = chart.scales.y;
          
          thresholds.forEach(threshold => {
            if (!threshold.yAxisID || threshold.yAxisID === 'y') {
              const y = yAxis.getPixelForValue(threshold.value);
              
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(yAxis.left, y);
              ctx.lineTo(yAxis.right, y);
              ctx.lineWidth = 2;
              ctx.strokeStyle = threshold.color;
              ctx.setLineDash([6, 4]);
              ctx.stroke();
              ctx.restore();
            }
          });
        },
      },
      ...(secondaryYAxisLabel ? {
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          title: {
            display: true,
            text: secondaryYAxisUnit ? 
              `${secondaryYAxisLabel} (${secondaryYAxisUnit})` : 
              secondaryYAxisLabel,
            color: theme.palette.text.secondary,
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: theme.palette.text.secondary,
          },
        },
      } : {}),
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onPointClick) {
        const { datasetIndex, index } = elements[0];
        onPointClick(datasetIndex, index);
      }
    },
    ...(additionalOptions || {}),
  };
  
  // Render loading state
  if (loading) {
    return (
      <Card className={className} elevation={2}>
        {title && (
          <CardContent sx={{ pb: 0 }}>
            <Typography variant="h6" component="h3">{title}</Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">{description}</Typography>
            )}
          </CardContent>
        )}
        <CardContent>
          <Box sx={{ 
            height: height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
          }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              Loading chart data...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card className={className} elevation={2}>
        {title && (
          <CardContent sx={{ pb: 0 }}>
            <Typography variant="h6" component="h3">{title}</Typography>
          </CardContent>
        )}
        <CardContent>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
          <Box sx={{ 
            height: height - 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
          }}>
            <Typography variant="body1" color="text.secondary">
              Unable to load chart data
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  // Render empty state
  if (!series || series.length === 0 || series.every(s => s.data.length === 0)) {
    return (
      <Card className={className} elevation={2}>
        {title && (
          <CardContent sx={{ pb: 0 }}>
            <Typography variant="h6" component="h3">{title}</Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">{description}</Typography>
            )}
          </CardContent>
        )}
        <CardContent>
          <Box sx={{ 
            height: height - 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
          }}>
            <Typography variant="body1" color="text.secondary">
              No data available for the selected period
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className} elevation={2} ref={containerRef}>
      {/* Chart Header */}
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 1,
        }}>
          <Box>
            {title && <Typography variant="h6" component="h3">{title}</Typography>}
            {description && (
              <Typography variant="body2" color="text.secondary">{description}</Typography>
            )}
          </Box>
          
          {/* Chart Controls */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}>
            {/* Chart Type Toggle */}
            {allowChartTypeSwitch && (
              <ButtonGroup size="small" aria-label="chart type">
                <Button
                  variant={chartType === 'line' ? 'contained' : 'outlined'}
                  onClick={() => handleChartTypeChange('line')}
                  aria-label="Line chart"
                  startIcon={<LineChartIcon />}
                >
                  {!isMobile && 'Line'}
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'contained' : 'outlined'}
                  onClick={() => handleChartTypeChange('bar')}
                  aria-label="Bar chart"
                  startIcon={<BarChartIcon />}
                >
                  {!isMobile && 'Bar'}
                </Button>
              </ButtonGroup>
            )}
            
            {/* Zoom Controls */}
            {enableZoom && (
              <ButtonGroup size="small" aria-label="zoom controls">
                <Tooltip title="Zoom in">
                  <IconButton onClick={handleZoomIn} size="small">
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom out">
                  <IconButton onClick={handleZoomOut} size="small">
                    <ZoomOutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset zoom">
                  <IconButton 
                    onClick={handleResetZoom} 
                    size="small"
                    disabled={!isZoomed}
                  >
                    <ResetIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            )}
            
            {/* Export Controls */}
            {enableExport && (
              <ButtonGroup size="small" aria-label="export controls">
                <Tooltip title="Export as PNG">
                  <Button
                    onClick={handleExportPNG}
                    aria-label="Export as PNG"
                    startIcon={<DownloadIcon />}
                  >
                    {!isMobile && 'PNG'}
                  </Button>
                </Tooltip>
                <Tooltip title="Export as CSV">
                  <Button
                    onClick={handleExportCSV}
                    aria-label="Export as CSV"
                    startIcon={<DownloadIcon />}
                  >
                    {!isMobile && 'CSV'}
                  </Button>
                </Tooltip>
              </ButtonGroup>
            )}
            
            {/* Trend Line Toggle */}
            {enableTrendline && (
              <Tooltip title="Show/hide trend lines">
                <Button
                  size="small"
                  variant={showTrendline ? 'contained' : 'outlined'}
                  onClick={handleTrendlineToggle}
                  aria-label="Toggle trend lines"
                  startIcon={<TrendingUpIcon />}
                >
                  {!isMobile && 'Trend'}
                </Button>
              </Tooltip>
            )}
            
            {/* Settings Button */}
            <Tooltip title="Chart settings">
              <IconButton 
                onClick={() => setShowSettings(!showSettings)}
                color={showSettings ? 'primary' : 'default'}
                size="small"
              >
                {showSettings ? <CloseIcon /> : <SettingsIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Series Selection */}
        {showSettings && (
          <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ 
              mt: 2, 
              p: 1.5,
              backgroundColor: theme.palette.background.default,
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Series Visibility
            </Typography>
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                flexWrap: 'wrap', 
                gap: 1,
              }}
            >
              {series.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  onClick={() => handleSeriesToggle(s.id)}
                  color={visibleSeries.includes(s.id) ? 'primary' : 'default'}
                  variant={visibleSeries.includes(s.id) ? 'filled' : 'outlined'}
                  sx={{
                    borderColor: s.color,
                    backgroundColor: visibleSeries.includes(s.id) ? 
                      s.color || theme.palette.primary.main : 
                      'transparent',
                  }}
                />
              ))}
            </Stack>
            
            {/* Threshold Legend */}
            {thresholds && thresholds.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Thresholds
                </Typography>
                <Stack 
                  direction="row" 
                  spacing={1} 
                  sx={{ 
                    flexWrap: 'wrap', 
                    gap: 1,
                  }}
                >
                  {thresholds.map((threshold, index) => (
                    <Chip
                      key={index}
                      label={`${threshold.label}: ${threshold.value}${
                        threshold.yAxisID === 'y1' && secondaryYAxisUnit 
                          ? secondaryYAxisUnit 
                          : yAxisUnit || ''
                      }`}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: threshold.color,
                        '& .MuiChip-label': {
                          color: theme.palette.getContrastText(theme.palette.background.paper),
                        },
                      }}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        )}
      </CardContent>
      
      {/* Chart Container */}
      <CardContent>
        <Box 
          sx={{ 
            height, 
            position: 'relative',
            '& canvas': {
              // Improve accessibility
              outline: 'none',
              '&:focus': {
                boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
              },
            },
          }}
          role="img"
          aria-label={`${title || 'Time series'} chart${
            description ? `: ${description}` : ''
          }`}
          tabIndex={0}
        >
          {chartType === 'line' ? (
            <Line
              data={chartData}
              options={chartOptions}
              ref={onChartRef}
            />
          ) : (
            <Bar
              data={chartData}
              options={chartOptions}
              ref={onChartRef}
            />
          )}
        </Box>
        
        {/* Accessibility note */}
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block', 
            mt: 1, 
            textAlign: 'center',
          }}
        >
          {enableZoom ? 'Use mouse wheel or pinch to zoom, drag to pan' : ''}
          {visibleSeries.length === 0 && 'No data series selected. Please select at least one series.'}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TimeSeriesChart;
