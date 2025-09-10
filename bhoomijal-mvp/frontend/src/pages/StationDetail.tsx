import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Breadcrumbs,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Share as ShareIcon,
  FileDownload as DownloadIcon,
  LocationOn as LocationIcon,
  WaterDrop as WaterIcon,
  AccessTime as TimeIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  ArrowBack as ArrowBackIcon,
  Explore as ExploreIcon,
  Layers as LayersIcon,
  BarChart as BarChartIcon,
  Map as MapIcon,
  Notifications as NotificationsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Import custom components
import TimeSeriesChart, { DataSeries, Threshold } from '../components/TimeSeriesChart';
import GroundwaterBattery from '../components/GroundwaterBattery';
import { formatDate, formatNumber, getStatusColor } from '../utils/helpers';
import { fetchStationDetails, fetchNearbyStations, fetchStationTimeSeries } from '../services/api';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Define interfaces for station data
interface StationMetadata {
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

interface TimeSeriesDataPoint {
  timestamp: string;
  waterLevel: number;
  rainfall?: number;
  temperature?: number;
  status?: string;
}

interface NearbyStation {
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab Panel component for mobile view
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`station-tabpanel-${index}`}
      aria-labelledby={`station-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const StationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  const [station, setStation] = useState<StationMetadata | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeSeriesLoading, setTimeSeriesLoading] = useState<boolean>(true);
  const [nearbyLoading, setNearbyLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | '3m' | '6m' | '1y' | 'all'>('1m');
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Fetch station details
  const fetchStationData = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const stationData = await fetchStationDetails(id);
      setStation(stationData);
    } catch (err) {
      setError('Failed to load station details. Please try again later.');
      console.error('Error fetching station details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  // Fetch time series data
  const fetchTimeSeriesData = useCallback(async () => {
    if (!id) return;
    
    setTimeSeriesLoading(true);
    
    try {
      const data = await fetchStationTimeSeries(id, timeRange);
      setTimeSeriesData(data);
    } catch (err) {
      console.error('Error fetching time series data:', err);
    } finally {
      setTimeSeriesLoading(false);
    }
  }, [id, timeRange]);
  
  // Fetch nearby stations
  const fetchNearbyStationsData = useCallback(async () => {
    if (!id || !station) return;
    
    setNearbyLoading(true);
    
    try {
      const { latitude, longitude } = station.location;
      const data = await fetchNearbyStations(latitude, longitude, 10); // 10km radius
      setNearbyStations(data);
    } catch (err) {
      console.error('Error fetching nearby stations:', err);
    } finally {
      setNearbyLoading(false);
    }
  }, [id, station]);
  
  // Initial data loading
  useEffect(() => {
    fetchStationData();
  }, [fetchStationData]);
  
  // Load time series data when station data is loaded or time range changes
  useEffect(() => {
    if (station) {
      fetchTimeSeriesData();
    }
  }, [station, fetchTimeSeriesData]);
  
  // Load nearby stations when station data is loaded
  useEffect(() => {
    if (station) {
      fetchNearbyStationsData();
    }
  }, [station, fetchNearbyStationsData]);
  
  // Set up polling for real-time updates (every 60 seconds)
  useEffect(() => {
    if (!station) return;
    
    const intervalId = setInterval(() => {
      fetchTimeSeriesData();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [station, fetchTimeSeriesData]);
  
  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStationData(), fetchTimeSeriesData()]);
    setRefreshing(false);
  };
  
  // Handle tab change for mobile view
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle time range change
  const handleTimeRangeChange = (range: '1w' | '1m' | '3m' | '6m' | '1y' | 'all') => {
    setTimeRange(range);
  };
  
  // Handle share dialog
  const handleShareOpen = () => {
    setShareDialogOpen(true);
  };
  
  const handleShareClose = () => {
    setShareDialogOpen(false);
  };
  
  // Handle menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Handle export data
  const handleExportData = (format: 'csv' | 'json') => {
    if (!timeSeriesData.length) return;
    
    let content: string;
    let fileName: string;
    
    if (format === 'csv') {
      // Create CSV content
      const headers = ['Timestamp', 'Water Level', 'Rainfall', 'Temperature', 'Status'];
      const rows = timeSeriesData.map(point => [
        point.timestamp,
        point.waterLevel.toString(),
        point.rainfall?.toString() || '',
        point.temperature?.toString() || '',
        point.status || ''
      ]);
      
      content = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      fileName = `station_${id}_data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else {
      // Create JSON content
      content = JSON.stringify(timeSeriesData, null, 2);
      fileName = `station_${id}_data_${format(new Date(), 'yyyy-MM-dd')}.json`;
    }
    
    // Create download link
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    handleMenuClose();
  };
  
  // Prepare chart data for TimeSeriesChart component
  const chartData = useMemo(() => {
    if (!timeSeriesData.length) return [];
    
    const waterLevelSeries: DataSeries = {
      id: 'waterLevel',
      label: 'Water Level',
      data: timeSeriesData.map(point => ({
        x: new Date(point.timestamp),
        y: point.waterLevel
      })),
      color: theme.palette.primary.main,
      fill: true
    };
    
    const series: DataSeries[] = [waterLevelSeries];
    
    // Add rainfall data if available
    const rainfallData = timeSeriesData
      .filter(point => point.rainfall !== undefined)
      .map(point => ({
        x: new Date(point.timestamp),
        y: point.rainfall as number
      }));
    
    if (rainfallData.length > 0) {
      series.push({
        id: 'rainfall',
        label: 'Rainfall',
        data: rainfallData,
        color: theme.palette.info.main,
        type: 'bar',
        yAxisID: 'y1'
      });
    }
    
    return series;
  }, [timeSeriesData, theme]);
  
  // Define thresholds for the chart
  const chartThresholds: Threshold[] = useMemo(() => {
    if (!station) return [];
    
    return [
      {
        value: station.depthDetails.totalDepth * 0.25, // 25% of total depth is critical
        label: 'Critical',
        color: theme.palette.error.main
      },
      {
        value: station.depthDetails.totalDepth * 0.5, // 50% is moderate
        label: 'Moderate',
        color: theme.palette.warning.main
      },
      {
        value: station.depthDetails.totalDepth * 0.75, // 75% is safe
        label: 'Safe',
        color: theme.palette.success.main
      }
    ];
  }, [station, theme]);
  
  // Calculate battery level percentage
  const batteryLevel = useMemo(() => {
    if (!station) return 0;
    
    const { waterLevel, totalDepth } = station.depthDetails;
    return Math.max(0, Math.min(100, (waterLevel / totalDepth) * 100));
  }, [station]);
  
  // Get status color
  const statusColor = useMemo(() => {
    if (!station) return theme.palette.grey[500];
    
    return getStatusColor(station.status, theme);
  }, [station, theme]);
  
  // Show loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" width="100%" height={400} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" width="100%" height={400} />
          </Grid>
        </Grid>
      </Box>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    );
  }
  
  // If no station data
  if (!station) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No station data found for ID: {id}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Breadcrumbs navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/" style={{ textDecoration: 'none', color: theme.palette.text.secondary }}>
          Home
        </Link>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: theme.palette.text.secondary }}>
          Dashboard
        </Link>
        <Typography color="text.primary">{station.name}</Typography>
      </Breadcrumbs>
      
      {/* Station header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" component="h1">
            {station.name}
            <Chip 
              label={station.status} 
              size="small" 
              sx={{ 
                ml: 2, 
                bgcolor: statusColor,
                color: theme.palette.getContrastText(statusColor)
              }} 
            />
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Station Code: {station.code}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Share station">
            <IconButton onClick={handleShareOpen}>
              <ShareIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Export data">
            <IconButton onClick={handleMenuOpen}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="More options">
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Mobile tabs */}
      {isMobile && (
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<WaterIcon />} label="Overview" />
          <Tab icon={<BarChartIcon />} label="Charts" />
          <Tab icon={<InfoIcon />} label="Details" />
          <Tab icon={<MapIcon />} label="Nearby" />
        </Tabs>
      )}
      
      {/* Main content */}
      {isMobile ? (
        <>
          {/* Mobile view with tabs */}
          <TabPanel value={tabValue} index={0}>
            <StationOverviewPanel 
              station={station} 
              batteryLevel={batteryLevel} 
              statusColor={statusColor} 
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <StationChartsPanel 
              chartData={chartData} 
              thresholds={chartThresholds}
              timeSeriesLoading={timeSeriesLoading}
              onTimeRangeChange={handleTimeRangeChange}
              timeRange={timeRange}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <StationDetailsPanel station={station} />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <NearbyStationsPanel 
              station={station} 
              nearbyStations={nearbyStations} 
              loading={nearbyLoading} 
            />
          </TabPanel>
        </>
      ) : (
        // Desktop view with grid layout
        <Grid container spacing={3}>
          {/* Left column: Overview and charts */}
          <Grid item xs={12} md={8}>
            <StationChartsPanel 
              chartData={chartData} 
              thresholds={chartThresholds}
              timeSeriesLoading={timeSeriesLoading}
              onTimeRangeChange={handleTimeRangeChange}
              timeRange={timeRange}
            />
            
            <StationDetailsPanel station={station} />
          </Grid>
          
          {/* Right column: Status and nearby stations */}
          <Grid item xs={12} md={4}>
            <StationOverviewPanel 
              station={station} 
              batteryLevel={batteryLevel} 
              statusColor={statusColor} 
            />
            
            <NearbyStationsPanel 
              station={station} 
              nearbyStations={nearbyStations} 
              loading={nearbyLoading} 
            />
          </Grid>
        </Grid>
      )}
      
      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onClose={handleShareClose}>
        <DialogTitle>Share Station Information</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Share this station's information with others using the link below:
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" component="code">
              {window.location.href}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleShareClose}>Cancel</Button>
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              handleShareClose();
            }} 
            variant="contained"
          >
            Copy Link
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Export menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleExportData('csv')}>
          Export as CSV
        </MenuItem>
        <MenuItem onClick={() => handleExportData('json')}>
          Export as JSON
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          Print Report
        </MenuItem>
      </Menu>
    </Box>
  );
};

// Station Overview Panel Component
interface StationOverviewPanelProps {
  station: StationMetadata;
  batteryLevel: number;
  statusColor: string;
}

const StationOverviewPanel: React.FC<StationOverviewPanelProps> = ({ 
  station, 
  batteryLevel,
  statusColor 
}) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Station Overview
        </Typography>
        
        <Grid container spacing={2}>
          {/* Groundwater battery visualization */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              p: 2
            }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Water Level
              </Typography>
              
              <GroundwaterBattery 
                level={batteryLevel} 
                size="large" 
                showLabel 
                animate 
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {formatNumber(station.depthDetails.waterLevel)} meters
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                Last measured: {formatDate(new Date(station.depthDetails.lastMeasured))}
              </Typography>
            </Box>
          </Grid>
          
          {/* Station status and quick info */}
          <Grid item xs={12} sm={6}>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Location" 
                  secondary={`${station.location.district}, ${station.location.state}`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <LayersIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Well Depth" 
                  secondary={`${formatNumber(station.depthDetails.totalDepth)} meters`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <TimeIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Last Updated" 
                  secondary={formatDate(new Date(station.lastUpdated))} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <InfoIcon style={{ color: statusColor }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Status" 
                  secondary={station.status} 
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
        
        {/* Alert for critical status */}
        {station.status === 'Critical' && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mt: 2 }}
          >
            This station is reporting critically low water levels. Immediate attention may be required.
          </Alert>
        )}
        
        {/* Quick action buttons */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            size="small"
            startIcon={<NotificationsIcon />}
            variant="outlined"
          >
            Set Alert
          </Button>
          
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            variant="outlined"
            component={Link}
            to={`/analysis?station=${station.id}`}
          >
            Analyze
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

// Station Charts Panel Component
interface StationChartsPanelProps {
  chartData: DataSeries[];
  thresholds: Threshold[];
  timeSeriesLoading: boolean;
  onTimeRangeChange: (range: '1w' | '1m' | '3m' | '6m' | '1y' | 'all') => void;
  timeRange: string;
}

const StationChartsPanel: React.FC<StationChartsPanelProps> = ({ 
  chartData, 
  thresholds,
  timeSeriesLoading,
  onTimeRangeChange,
  timeRange
}) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Water Level Trends
        </Typography>
        
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <ButtonGroup size="small">
            <Button 
              onClick={() => onTimeRangeChange('1w')}
              variant={timeRange === '1w' ? 'contained' : 'outlined'}
            >
              1W
            </Button>
            <Button 
              onClick={() => onTimeRangeChange('1m')}
              variant={timeRange === '1m' ? 'contained' : 'outlined'}
            >
              1M
            </Button>
            <Button 
              onClick={() => onTimeRangeChange('3m')}
              variant={timeRange === '3m' ? 'contained' : 'outlined'}
            >
              3M
            </Button>
            <Button 
              onClick={() => onTimeRangeChange('6m')}
              variant={timeRange === '6m' ? 'contained' : 'outlined'}
            >
              6M
            </Button>
            <Button 
              onClick={() => onTimeRangeChange('1y')}
              variant={timeRange === '1y' ? 'contained' : 'outlined'}
            >
              1Y
            </Button>
            <Button 
              onClick={() => onTimeRangeChange('all')}
              variant={timeRange === 'all' ? 'contained' : 'outlined'}
            >
              All
            </Button>
          </ButtonGroup>
        </Box>
        
        <TimeSeriesChart
          series={chartData}
          height={400}
          loading={timeSeriesLoading}
          thresholds={thresholds}
          enableZoom
          enableExport
          enableTrendline
          yAxisLabel="Water Level"
          yAxisUnit="m"
          secondaryYAxisLabel="Rainfall"
          secondaryYAxisUnit="mm"
          title="Groundwater Level & Rainfall"
          description="Historical water level measurements with rainfall correlation"
        />
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This chart shows the historical water level measurements for this station along with 
          rainfall data to help visualize the correlation between precipitation and groundwater levels.
          Use the zoom controls to explore specific time periods or toggle the trend line to see the overall direction.
        </Typography>
      </CardContent>
    </Card>
  );
};

// Station Details Panel Component
interface StationDetailsPanelProps {
  station: StationMetadata;
}

const StationDetailsPanel: React.FC<StationDetailsPanelProps> = ({ station }) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Station Details
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '30%' }}>
                  Station ID
                </TableCell>
                <TableCell>{station.id}</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Station Code
                </TableCell>
                <TableCell>{station.code}</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Type
                </TableCell>
                <TableCell>{station.type}</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Location
                </TableCell>
                <TableCell>
                  {station.location.village && `${station.location.village}, `}
                  {station.location.block}, {station.location.district}, {station.location.state}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Coordinates
                </TableCell>
                <TableCell>
                  {station.location.latitude.toFixed(6)}, {station.location.longitude.toFixed(6)}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Elevation
                </TableCell>
                <TableCell>{station.location.elevation} meters above sea level</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Installation Date
                </TableCell>
                <TableCell>{formatDate(new Date(station.installationDate))}</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Last Maintenance
                </TableCell>
                <TableCell>
                  {station.lastMaintenance ? 
                    formatDate(new Date(station.lastMaintenance)) : 
                    'Not available'}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Operator
                </TableCell>
                <TableCell>{station.operator || 'Not specified'}</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Contact
                </TableCell>
                <TableCell>{station.contactInfo || 'Not available'}</TableCell>
              </TableRow>
              
              {station.notes && (
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                    Notes
                  </TableCell>
                  <TableCell>{station.notes}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Tags */}
        {station.tags && station.tags.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {station.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Nearby Stations Panel Component
interface NearbyStationsPanelProps {
  station: StationMetadata;
  nearbyStations: NearbyStation[];
  loading: boolean;
}

const NearbyStationsPanel: React.FC<NearbyStationsPanelProps> = ({ 
  station, 
  nearbyStations,
  loading 
}) => {
  const theme = useTheme();
  
  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Nearby Stations
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Nearby Stations
        </Typography>
        
        {/* Map view of nearby stations */}
        <Box sx={{ height: 300, mb: 2, borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer
            center={[station.location.latitude, station.location.longitude]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Current station marker */}
            <Marker position={[station.location.latitude, station.location.longitude]}>
              <Popup>
                <b>{station.name}</b><br />
                Current station
              </Popup>
            </Marker>
            
            {/* 10km radius circle */}
            <Circle
              center={[station.location.latitude, station.location.longitude]}
              radius={10000}
              pathOptions={{
                color: theme.palette.primary.main,
                fillColor: theme.palette.primary.main,
                fillOpacity: 0.1
              }}
            />
            
            {/* Nearby station markers */}
            {nearbyStations.map(nearbyStation => (
              <Marker
                key={nearbyStation.id}
                position={[nearbyStation.location.latitude, nearbyStation.location.longitude]}
              >
                <Popup>
                  <b>{nearbyStation.name}</b><br />
                  Distance: {nearbyStation.distance.toFixed(1)} km<br />
                  Water Level: {nearbyStation.currentWaterLevel.toFixed(2)} m<br />
                  <Link to={`/station/${nearbyStation.id}`}>View details</Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Box>
        
        {/* List of nearby stations */}
        <List dense disablePadding>
          {nearbyStations.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No nearby stations found within 10km radius
            </Typography>
          ) : (
            nearbyStations.map(nearbyStation => (
              <ListItem
                key={nearbyStation.id}
                button
                component={Link}
                to={`/station/${nearbyStation.id}`}
                divider
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getStatusColor(nearbyStation.status, theme) }}>
                    <LocationIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={nearbyStation.name}
                  secondary={`${nearbyStation.distance.toFixed(1)} km away • ${nearbyStation.currentWaterLevel.toFixed(2)} m water level`}
                />
              </ListItem>
            ))
          )}
        </List>
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ExploreIcon />}
          component={Link}
          to="/map"
          sx={{ mt: 2 }}
        >
          View All Stations
        </Button>
      </CardContent>
    </Card>
  );
};

export default StationDetail;
