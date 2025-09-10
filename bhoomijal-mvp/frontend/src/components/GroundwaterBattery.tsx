import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tooltip, 
  useTheme, 
  alpha 
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// Props interface for the GroundwaterBattery component
export interface GroundwaterBatteryProps {
  /**
   * The current water level percentage (0-100)
   */
  level: number;
  
  /**
   * Size variant of the battery
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Custom status text to display
   * If not provided, it will be determined based on the level
   */
  status?: string;
  
  /**
   * Whether to show the percentage text inside the battery
   * @default true
   */
  showPercentage?: boolean;
  
  /**
   * Optional click handler for interactivity
   */
  onClick?: () => void;
  
  /**
   * Optional CSS class name for custom styling
   */
  className?: string;
  
  /**
   * Optional custom aria label for accessibility
   */
  ariaLabel?: string;
  
  /**
   * Whether to animate the fill level when it changes
   * @default true
   */
  animate?: boolean;
  
  /**
   * Whether to show the status text below the battery
   * @default true
   */
  showStatus?: boolean;
}

// Pulse animation for critical levels
const pulseAnimation = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
`;

// Styled battery container
const BatteryContainer = styled(Box, {
  shouldForwardProp: (prop) => 
    prop !== 'batterySize' && 
    prop !== 'isInteractive' && 
    prop !== 'isCritical'
})<{ 
  batterySize: string; 
  isInteractive: boolean;
  isCritical: boolean;
}>(({ theme, batterySize, isInteractive, isCritical }) => {
  // Size mappings
  const sizeMap = {
    small: {
      width: 30,
      height: 16,
      borderRadius: 3,
      tipWidth: 2,
      tipHeight: 6,
      tipBorderRadius: 1,
    },
    medium: {
      width: 50,
      height: 24,
      borderRadius: 4,
      tipWidth: 3,
      tipHeight: 10,
      tipBorderRadius: 1.5,
    },
    large: {
      width: 80,
      height: 36,
      borderRadius: 6,
      tipWidth: 4,
      tipHeight: 14,
      tipBorderRadius: 2,
    }
  };
  
  const sizes = sizeMap[batterySize as keyof typeof sizeMap];
  
  return {
    position: 'relative',
    width: sizes.width,
    height: sizes.height,
    borderRadius: sizes.borderRadius,
    border: `2px solid ${theme.palette.grey[500]}`,
    backgroundColor: theme.palette.grey[200],
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: isInteractive ? 'pointer' : 'default',
    '&:hover': isInteractive ? {
      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
    } : {},
    '&::after': {
      content: '""',
      position: 'absolute',
      right: -sizes.tipWidth - 2,
      top: '50%',
      transform: 'translateY(-50%)',
      width: sizes.tipWidth,
      height: sizes.tipHeight,
      backgroundColor: theme.palette.grey[500],
      borderTopRightRadius: sizes.tipBorderRadius,
      borderBottomRightRadius: sizes.tipBorderRadius,
    },
    animation: isCritical ? `${pulseAnimation} 2s infinite` : 'none',
  };
});

// Styled battery fill
const BatteryFill = styled(Box, {
  shouldForwardProp: (prop) => 
    prop !== 'fillLevel' && 
    prop !== 'fillColor' && 
    prop !== 'animate'
})<{ 
  fillLevel: number; 
  fillColor: string;
  animate: boolean;
}>(({ fillLevel, fillColor, animate }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  height: `${fillLevel}%`,
  backgroundColor: fillColor,
  transition: animate ? 'height 1s ease-in-out, background-color 1s ease-in-out' : 'none',
}));

/**
 * GroundwaterBattery Component (F-04)
 * 
 * A visual battery indicator for groundwater levels with color-coding,
 * animations, and accessibility features.
 */
export const GroundwaterBattery: React.FC<GroundwaterBatteryProps> = ({
  level,
  size = 'medium',
  status,
  showPercentage = true,
  onClick,
  className,
  ariaLabel,
  animate = true,
  showStatus = true,
}) => {
  const theme = useTheme();
  const [displayLevel, setDisplayLevel] = useState<number>(level);
  
  // Ensure level is between 0 and 100
  const normalizedLevel = Math.max(0, Math.min(100, level));
  
  // Update display level with animation
  useEffect(() => {
    setDisplayLevel(normalizedLevel);
  }, [normalizedLevel]);
  
  // Determine color based on level
  const getColorByLevel = (level: number) => {
    if (level <= 30) {
      return theme.palette.error.main; // Critical - Red
    } else if (level <= 60) {
      return theme.palette.warning.main; // Moderate - Yellow/Amber
    } else {
      return theme.palette.success.main; // Good - Green
    }
  };
  
  // Determine status text if not provided
  const getStatusText = (level: number) => {
    if (level <= 30) {
      return 'Critical';
    } else if (level <= 60) {
      return 'Moderate';
    } else {
      return 'Good';
    }
  };
  
  const fillColor = getColorByLevel(normalizedLevel);
  const statusText = status || getStatusText(normalizedLevel);
  const isCritical = normalizedLevel <= 30;
  
  // Size mapping for text
  const fontSizeMap = {
    small: '0.625rem', // 10px
    medium: '0.75rem',  // 12px
    large: '0.875rem'   // 14px
  };
  
  // ARIA label for accessibility
  const batteryAriaLabel = ariaLabel || 
    `Groundwater level: ${normalizedLevel}%. Status: ${statusText}`;
  
  return (
    <Box 
      className={className}
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Tooltip 
        title={`Groundwater Level: ${normalizedLevel}%`} 
        arrow
      >
        <BatteryContainer
          batterySize={size}
          isInteractive={!!onClick}
          isCritical={isCritical}
          onClick={onClick}
          role="img"
          aria-label={batteryAriaLabel}
          sx={{
            boxShadow: theme.shadows[1],
          }}
        >
          <BatteryFill 
            fillLevel={displayLevel} 
            fillColor={fillColor}
            animate={animate}
          />
          
          {showPercentage && (
            <Typography
              variant="caption"
              sx={{
                position: 'relative',
                zIndex: 1,
                fontSize: fontSizeMap[size as keyof typeof fontSizeMap],
                fontWeight: 'bold',
                color: normalizedLevel > 50 ? 
                  theme.palette.getContrastText(fillColor) : 
                  theme.palette.text.primary,
                textShadow: '0 0 2px rgba(255,255,255,0.5)',
              }}
              aria-hidden="true" // Screen readers will use the aria-label instead
            >
              {normalizedLevel}%
            </Typography>
          )}
        </BatteryContainer>
      </Tooltip>
      
      {showStatus && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            fontSize: fontSizeMap[size as keyof typeof fontSizeMap],
            fontWeight: 'medium',
            color: fillColor,
          }}
        >
          {statusText}
        </Typography>
      )}
    </Box>
  );
};

export default GroundwaterBattery;
