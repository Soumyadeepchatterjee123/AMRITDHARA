import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  IconButton, 
  Divider, 
  Chip, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemAvatar, 
  Avatar, 
  CircularProgress, 
  Alert, 
  useTheme, 
  useMediaQuery 
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  WaterDrop as WaterDropIcon, 
  Warning as WarningIcon, 
  CheckCircle as CheckCircleIcon, 
  ErrorOutline as ErrorIcon, 
  Add as AddIcon, 
  GetApp as DownloadIcon, 
  Notifications as NotificationsIcon, 
  Settings as SettingsIcon, 
  Search as SearchIcon 
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useApi } from '../services/api';
import { formatNumber, formatDate } from '../utils/helpers';
import { GroundwaterBattery } from '../components/GroundwaterBattery';

// Fix for Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Types for dashboard data
interface StationSummary {
  total: number;
  active: number;
  inactive: number;
  critical: number;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  stationId: string;
  stationName: string;
  timestamp: string;
}

interface MapStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'critical';
  waterLevel: number;
  lastUpdated: string;
  batteryLevel: number;
}

interface DashboardData {
  summary: StationSummary;
  recentAlerts: Alert[];
  mapStations: MapStation[];
  lastUpdated: string;
}

// Quick action definition
interface QuickAction {
  title: string;
  icon: React.ReactNode;
  link: string;
  color: string;
}

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { getDashboardSummary } = useApi();

  // Quick actions definition
  const quickActions: QuickAction[] = [
    { 
      title: 'Add Station', 
      icon: <AddIcon />, 
      link: '/stations/new', 
      color: theme.palette.primary.main 
    },
    { 
      title: 'Generate Report', 
      icon: <DownloadIcon />, 
      link: '/reports', 
      color: theme.palette.secondary.main 
    },
    { 
      title: 'View Alerts', 
      icon: <NotificationsIcon />, 
      link: '/alerts', 
      color: theme.palette.warning.main 
    },
    { 
      title: 'Search Stations', 
      icon: <SearchIcon />, 
      link: '/map', 
      color: theme.palette.info.main 
    }
  ];

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const data = await getDashboardSummary();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
    
    // Optional: Set up auto-refresh interval
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(intervalId);
  }, []);

  // Get alert icon based on severity
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <NotificationsIcon color="info" />;
    }
  };

  // Get station status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'inactive':
        return theme.palette.text.disabled;
      case 'critical':
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={fetchDashboardData}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Last Updated Banner */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          mb: 3, 
          backgroundColor: theme.palette.background.default,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Last updated: {dashboardData?.lastUpdated ? formatDate(dashboardData.lastUpdated) : 'Unknown'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {dashboardData?.lastUpdated ? 
            `(${formatDistanceToNow(new Date(dashboardData.lastUpdated), { addSuffix: true })})` : 
            ''}
        </Typography>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              p: 2
            }}>
              <Avatar sx={{ 
                bgcolor: theme.palette.primary.main, 
                width: 56, 
                height: 56, 
                mb: 1 
              }}>
                <WaterDropIcon />
              </Avatar>
              <Typography variant="h4" component="div">
                {formatNumber(dashboardData?.summary.total || 0)}
              </Typography>
              <Typography color="textSecondary" variant="subtitle1">
                Total Stations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              p: 2
            }}>
              <Avatar sx={{ 
                bgcolor: theme.palette.success.main, 
                width: 56, 
                height: 56, 
                mb: 1 
              }}>
                <CheckCircleIcon />
              </Avatar>
              <Typography variant="h4" component="div">
                {formatNumber(dashboardData?.summary.active || 0)}
              </Typography>
              <Typography color="textSecondary" variant="subtitle1">
                Active Stations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              p: 2
            }}>
              <Avatar sx={{ 
                bgcolor: theme.palette.error.main, 
                width: 56, 
                height: 56, 
                mb: 1 
              }}>
                <WarningIcon />
              </Avatar>
              <Typography variant="h4" component="div">
                {formatNumber(dashboardData?.summary.critical || 0)}
              </Typography>
              <Typography color="textSecondary" variant="subtitle1">
                Critical Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              p: 2
            }}>
              <GroundwaterBattery 
                level={(dashboardData?.summary.active || 0) / (dashboardData?.summary.total || 1) * 100}
                size="large"
              />
              <Typography variant="h4" component="div" sx={{ mt: 1 }}>
                {Math.round((dashboardData?.summary.active || 0) / (dashboardData?.summary.total || 1) * 100)}%
              </Typography>
              <Typography color="textSecondary" variant="subtitle1">
                Operational Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Map Preview */}
        <Grid item xs={12} md={8}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader 
              title="Station Map" 
              action={
                <Button 
                  component={Link} 
                  to="/map" 
                  size="small" 
                  endIcon={<SearchIcon />}
                >
                  Full Map
                </Button>
              } 
            />
            <Divider />
            <CardContent sx={{ height: isMobile ? '300px' : '400px', p: 0 }}>
              {dashboardData?.mapStations && dashboardData.mapStations.length > 0 ? (
                <MapContainer 
                  center={[20.5937, 78.9629]} // Center of India
                  zoom={4} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  attributionControl={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {dashboardData.mapStations.map((station) => (
                    <Marker 
                      key={station.id}
                      position={[station.latitude, station.longitude]}
                    >
                      <Popup>
                        <Typography variant="subtitle1">{station.name}</Typography>
                        <Typography variant="body2">
                          Water Level: {station.waterLevel} mbgl
                        </Typography>
                        <Typography variant="body2">
                          Status: 
                          <Chip 
                            label={station.status} 
                            size="small" 
                            sx={{ 
                              ml: 1, 
                              backgroundColor: getStatusColor(station.status),
                              color: 'white'
                            }} 
                          />
                        </Typography>
                        <Typography variant="body2">
                          Last Updated: {formatDistanceToNow(new Date(station.lastUpdated), { addSuffix: true })}
                        </Typography>
                        <Button 
                          component={Link}
                          to={`/stations/${station.id}`}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 1 }}
                          fullWidth
                        >
                          View Details
                        </Button>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              ) : (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Typography variant="body1" color="textSecondary">
                    No station data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side Content */}
        <Grid item xs={12} md={4}>
          {/* Quick Actions */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardHeader title="Quick Actions" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={6} key={index}>
                    <Button
                      component={Link}
                      to={action.link}
                      variant="outlined"
                      startIcon={action.icon}
                      fullWidth
                      sx={{ 
                        justifyContent: 'flex-start',
                        borderColor: action.color,
                        color: action.color,
                        '&:hover': {
                          borderColor: action.color,
                          backgroundColor: `${action.color}10`,
                        }
                      }}
                    >
                      {action.title}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Alerts Feed */}
          <Card elevation={2}>
            <CardHeader 
              title="Recent Alerts" 
              action={
                <IconButton component={Link} to="/alerts" size="small">
                  <NotificationsIcon />
                </IconButton>
              } 
            />
            <Divider />
            <List sx={{ 
              width: '100%', 
              maxHeight: isMobile ? '300px' : '350px', 
              overflow: 'auto' 
            }}>
              {dashboardData?.recentAlerts && dashboardData.recentAlerts.length > 0 ? (
                dashboardData.recentAlerts.map((alert) => (
                  <React.Fragment key={alert.id}>
                    <ListItem 
                      alignItems="flex-start" 
                      component={Link} 
                      to={`/stations/${alert.stationId}`}
                      sx={{ 
                        textDecoration: 'none', 
                        color: 'inherit',
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: 
                            alert.severity === 'critical' ? theme.palette.error.main : 
                            alert.severity === 'warning' ? theme.palette.warning.main : 
                            theme.palette.info.main 
                        }}>
                          {getAlertIcon(alert.severity)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" component="span">
                            {alert.title}
                            <Chip 
                              label={alert.severity} 
                              size="small" 
                              sx={{ 
                                ml: 1, 
                                backgroundColor: 
                                  alert.severity === 'critical' ? theme.palette.error.main : 
                                  alert.severity === 'warning' ? theme.palette.warning.main : 
                                  theme.palette.info.main,
                                color: 'white',
                                height: 20,
                                '& .MuiChip-label': {
                                  px: 1,
                                  py: 0
                                }
                              }} 
                            />
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" component="span" color="textPrimary">
                              {alert.message}
                            </Typography>
                            <Typography variant="caption" display="block" color="textSecondary">
                              {alert.stationName} • {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText 
                    primary="No recent alerts" 
                    secondary="All stations are operating normally"
                  />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
