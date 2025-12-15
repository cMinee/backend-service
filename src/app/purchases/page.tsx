import React from 'react';
import PurchaseTable from '@/components/PurchaseTable';
import { Box, Container, Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export const metadata = {
  title: 'Purchase Items | Backend Service',
  description: 'Manage imported purchase transactions',
};

export default function PurchasesPage() {
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
            <Typography color="text.primary">Purchases</Typography>
        </Breadcrumbs>
        
        <PurchaseTable />
      </Container>
    </Box>
  );
}
