'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  gradient?: string;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  gradient = 'linear-gradient(45deg, #2196f3, #9c27b0)',
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 4,
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            background: gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
