import React from 'react';
import DocumentTable from '@/components/DocumentTable';
import { Box, Container, Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export const metadata = {
  title: 'Document | Backend Service',
  description: 'Manage imported document transactions',
};

export default function DocumentPage() {
  return (
    <Box sx={{ minHeight: '100vh', py: 4, background: 'radial-gradient(circle at top right, rgba(144, 202, 249, 0.05), transparent 40%)' }}>
      <Container maxWidth="xl">
        <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />} 
            aria-label="breadcrumb"
            sx={{ mb: 4, color: 'text.secondary' }}
        >
            <Link underline="hover" color="inherit" href="/">
                Home
            </Link>
            <Typography color="text.primary">Document</Typography>
        </Breadcrumbs>
        
        <DocumentTable />
      </Container>
    </Box>
  );
}
