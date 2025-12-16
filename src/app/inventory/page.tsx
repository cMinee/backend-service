import React from 'react';
import InventoryTable from '@/components/InventoryTable';
import { Box, Container, Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export const metadata = {
  title: 'Inventory Stock In | Backend Service',
  description: 'Manage incoming goods and inventory',
};

export default function InventoryPage() {
  return (
    <Box sx={{ minHeight: '100vh', py: 4, background: 'radial-gradient(circle at top left, rgba(0, 176, 155, 0.05), transparent 40%)' }}>
      <Container maxWidth="xl">
        <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />} 
            aria-label="breadcrumb"
            sx={{ mb: 4, color: 'text.secondary' }}
        >
            <Link underline="hover" color="inherit" href="/">
                Home
            </Link>
            <Typography color="text.primary">Inventory</Typography>
        </Breadcrumbs>
        
        <InventoryTable />
      </Container>
    </Box>
  );
}
