'use client';

import React from 'react';
import { Paper, Typography, Stack, Button, Box } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';

interface FilterSectionProps {
  children: React.ReactNode;
  onSearch: () => void;
  onReset: () => void;
  searchButtonText?: string;
}

export default function FilterSection({
  children,
  onSearch,
  onReset,
  searchButtonText = 'Search',
}: FilterSectionProps) {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 1,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ mb: 2, display: 'block', fontWeight: 600, color: 'text.secondary' }}
      >
        Filter & Search
      </Typography>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems="center"
      >
        {children}

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
          color="secondary"
        >
          Reset
        </Button>
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={onSearch}
          color="primary"
          sx={{ background: '#00b09b' }}
        >
          {searchButtonText}
        </Button>
      </Stack>
    </Paper>
  );
}
