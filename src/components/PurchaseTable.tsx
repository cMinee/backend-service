'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Define the data structure matching the user's request
import { PurchaseTransaction, initialData } from '@/data/mockPurchases';


const ComponentContainer = motion(Paper);

export default function PurchaseTable() {
  const [data, setData] = useState<PurchaseTransaction[]>(initialData);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImportClick = () => {
    setOpenImportModal(true);
  };

  const handleCloseImportModal = () => {
    setOpenImportModal(false);
    setSelectedFile(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSaveImport = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target?.result;
      if (bstr) {
          try {
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws) as any[];
            
            // Map Excel data to our structure
            // Assuming simplified headers or just mapping by order roughly if keys match, 
            // but let's try to be smart or generic.
            // For now, I will expect specific column names or just map generic if possible.
            // Let's assume the user uses English headers similar to our keys, or we map them.
            // Mapping strategy: Look for "Product", "Qty", "Price", etc.
            
            const newTransactions: PurchaseTransaction[] = jsonData.map((row: any, index: number) => ({
                id: `imported-${Date.now()}-${index}`,
                buyerName: row['Buyer'] || row['Buyer Name'] || row['ผู้ซื้อ'] || 'Unknown',
                productName: row['Product'] || row['Product Name'] || row['สินค้า'] || 'Unknown Item',
                quantity: Number(row['Qty'] || row['Quantity'] || row['จำนวน'] || 1),
                netPrice: Number(row['Net Price'] || row['Price'] || row['ราคาสุทธิ'] || 0),
                orderDate: row['Order Date'] || row['Date'] || row['วันที่สั่งซื้อ'] || new Date().toISOString().split('T')[0],
                status: (row['Status'] || row['สถานะ'] || 'Unpaid') === 'Paid' ? 'Paid' : 'Unpaid'
            }));

            setData([...data, ...newTransactions]);
            handleCloseImportModal();
            alert(`Successfully imported ${newTransactions.length} items.`);
          } catch (error) {
              console.error("Error reading file:", error);
              alert("Error parsing Excel file");
          }
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleExport = () => {
    // Generate Excel from current data
    const exportData = data.map(item => ({
        'Buyer Name': item.buyerName,
        'Product Name': item.productName,
        'Quantity': item.quantity,
        'Net Price': item.netPrice,
        'Order Date': item.orderDate,
        'Status': item.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");
    XLSX.writeFile(wb, "purchase_data.xlsx");
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Import Modal */}
      <Dialog 
        open={openImportModal} 
        onClose={handleCloseImportModal}
        PaperProps={{
            style: { 
                borderRadius: 16, 
                padding: 10, 
                background: '#0a1929', 
                border: '1px solid rgba(255,255,255,0.1)' 
            }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Import Excel File</DialogTitle>
        <DialogContent>
            <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                Select an Excel file (.xlsx, .xls) to import purchase transactions.
            </DialogContentText>
            <Box 
                sx={{ 
                    border: '2px dashed rgba(144, 202, 249, 0.3)', 
                    borderRadius: 2, 
                    p: 3, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#90caf9', background: 'rgba(144, 202, 249, 0.05)' }
                }}
            >
                <input
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    id="raised-button-file"
                    type="file"
                    onChange={handleFileChange}
                />
                <label htmlFor="raised-button-file">
                    <Button variant="text" component="span" startIcon={<CloudUploadIcon />} sx={{ pointerEvents: 'none' }}>
                        {selectedFile ? selectedFile.name : "Choose File"}
                    </Button>
                </label>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseImportModal} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button onClick={handleSaveImport} variant="contained" disabled={!selectedFile}>
                Save & Import
            </Button>
        </DialogActions>
      </Dialog>

      {/* Header Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              background: 'linear-gradient(45deg, #90caf9, #ce93d8)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            รายการซื้อ (Purchase Items)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your purchase transactions imported from Excel
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExport}
            sx={{ 
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'text.primary',
              '&:hover': { borderColor: 'secondary.main', background: 'rgba(206, 147, 216, 0.05)' }
            }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CloudUploadIcon />}
            onClick={handleImportClick}
            sx={{
               boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
            }}
          >
            Import Excel
          </Button>
        </Box>
      </Box>

      {/* Table Section */}
      <ComponentContainer
        elevation={0}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ 
          background: 'rgba(18, 18, 18, 0.6)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="purchase table">
            <TableHead>
              <TableRow sx={{ background: 'rgba(255,255,255,0.03)' }}>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>ผู้ซื้อ (Buyer)</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>สินค้า (Product)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>จำนวน (Qty)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>ราคาสุทธิ (Net Price)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>วันที่สั่งซื้อ (Date)</TableCell>
                <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>สถานะ (Status)</TableCell>
                <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => (
                <TableRow
                  key={row.id}
                  component={motion.tr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { background: 'rgba(255,255,255,0.02)' },
                    transition: 'background 0.2s'
                  }}
                >
                  <TableCell component="th" scope="row" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {row.buyerName}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {row.productName}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.quantity}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.primary', fontFamily: 'monospace' }}>
                    ฿{row.netPrice.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.orderDate}</TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={row.status === 'Paid' ? <CheckCircleIcon /> : <AccessTimeIcon />}
                      label={row.status}
                      size="small"
                      color={row.status === 'Paid' ? 'success' : 'warning'}
                      variant="outlined"
                      sx={{ borderRadius: '8px' }}
                    />
                  </TableCell>
                   <TableCell align="center">
                     <Tooltip title="Coming Soon">
                        <IconButton size="small">
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                     </Tooltip>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ComponentContainer>
    </Box>
  );
}
