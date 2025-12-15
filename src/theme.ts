'use client';
import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Darker Blue for Light Mode
    },
    secondary: {
      main: '#9c27b0', // Darker Purple for Light Mode
    },
    background: {
      default: '#ffffff', // White
      paper: '#f8f9fa', // Very light grey
    },
    text: {
      primary: '#0a1929', // Dark Blue Text
      secondary: '#546e7a', // Grey Text
    },
  },
  typography: {
    fontFamily: roboto.style.fontFamily,
    h1: {
      fontSize: '4rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
      background: 'linear-gradient(to right, #1976d2, #9c27b0)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '1rem',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      marginBottom: '0.5rem',
      color: '#0a1929',
    },
    h5: {
      fontWeight: 500,
      color: '#546e7a',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '10px 24px',
          fontSize: '1rem',
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            borderColor: 'rgba(25, 118, 210, 0.5)',
          },
        },
      },
    },
  },
});

export default theme;
