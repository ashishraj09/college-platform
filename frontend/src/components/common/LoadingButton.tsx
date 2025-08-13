import React from 'react';
import { Button, CircularProgress, ButtonProps, Box } from '@mui/material';

interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled = false,
  startIcon,
  endIcon,
  ...props
}) => {
  const isDisabled = loading || disabled;
  
  return (
    <Button
      {...props}
      disabled={isDisabled}
      sx={{
        position: 'relative',
        ...props.sx,
        ...(loading && {
          '& .MuiButton-startIcon, & .MuiButton-endIcon': {
            opacity: 0.3,
          },
          '& .MuiButton-text': {
            opacity: 0.7,
          }
        })
      }}
      startIcon={loading ? undefined : startIcon}
      endIcon={loading ? undefined : endIcon}
    >
      {loading && (
        <CircularProgress
          size={20}
          thickness={4}
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: '-10px',
            marginTop: '-10px',
            color: 'inherit',
            opacity: 0.8
          }}
        />
      )}
      <Box sx={{ opacity: loading ? 0.3 : 1 }}>
        {loading && loadingText ? loadingText : children}
      </Box>
    </Button>
  );
};

export default LoadingButton;
