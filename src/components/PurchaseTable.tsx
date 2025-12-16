'use client';

import React, { useState, useEffect } from 'react';
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
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Stack,
  // Grid is not used in the final clean version or if used can be kept
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as XLSX from 'xlsx';

// ...
import { PurchaseTransaction, initialData } from '@/data/mockPurchases';
import { motion } from 'framer-motion';

const ComponentContainer = motion(Paper);

export default function PurchaseTable() {
  const [data, setData] = useState<PurchaseTransaction[]>(initialData);
  const [fullData, setFullData] = useState<PurchaseTransaction[]>(initialData);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Payment Modal States
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<PurchaseTransaction | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);

  // Filter States
  const [searchBuyer, setSearchBuyer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Unpaid'>('All');

  useEffect(() => {
    // Fetch latest data from server on load
    const fetchData = async () => {
        try {
            const res = await fetch('/api/purchases');
            if (res.ok) {
                const serverData = await res.json();
                if (Array.isArray(serverData) && serverData.length > 0) {
                     setData(serverData);
                     setFullData(serverData);
                }
            }
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
        }
    };
    fetchData();
  }, []);

  const handleSearch = () => {
    let filtered = [...fullData];

    if (searchBuyer.trim()) {
        filtered = filtered.filter(item => item.buyerName.toLowerCase().includes(searchBuyer.toLowerCase()));
    }
    if (searchProduct.trim()) {
        filtered = filtered.filter(item => item.productName.toLowerCase().includes(searchProduct.toLowerCase()));
    }
    if (filterStatus !== 'All') {
        filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    setData(filtered);
  };

  const handleResetFilter = () => {
    setSearchBuyer('');
    setSearchProduct('');
    setFilterStatus('All');
    setData(fullData);
  };

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
    reader.onload = async (e) => {
      const bstr = e.target?.result;
      if (bstr) {
          try {
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws) as any[];
            
            const newTransactions: PurchaseTransaction[] = jsonData.map((row: any, index: number) => ({
                id: `imported-${Date.now()}-${index}`,
                buyerName: row['Buyer'] || row['Buyer Name'] || row['ผู้ซื้อ'] || 'Unknown',
                productName: row['Product'] || row['Product Name'] || row['สินค้า'] || 'Unknown Item',
                quantity: Number(row['Qty'] || row['Quantity'] || row['จำนวน'] || 1),
                netPrice: Number(row['Net Price'] || row['Price'] || row['ราคาสุทธิ'] || 0),
                orderDate: row['Order Date'] || row['Date'] || row['วันที่สั่งซื้อ'] || new Date().toISOString().split('T')[0],
                status: (row['Status'] || row['สถานะ'] || 'Unpaid') === 'Paid' ? 'Paid' : 'Unpaid'
            }));

            // 1. Send ONLY new transactions to the import API
            const res = await fetch('/api/purchases/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTransactions)
            });

            const result = await res.json();

            if (result.status === 'success') {
                 // 2. Refresh Data from Server (Get the full updated list)
                 const refreshRes = await fetch('/api/purchases');
                 const refreshedData = await refreshRes.json();
                 
                 setFullData(refreshedData);
                 setData(refreshedData);
                 
                 handleCloseImportModal();
                 alert(`Successfully imported ${newTransactions.length} items.\nInventory has been updated.\n\nLogs:\n${result.logs.join('\n')}`);
            } else {
                 alert(`Failed to import: ${result.message}`);
            }
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

  // Payment Handlers
  const handlePaymentClick = (transaction: PurchaseTransaction) => {
    setCurrentTransaction(transaction);
    setOpenPaymentModal(true);
    setPaymentFile(null);
    setPaymentPreview(transaction.paymentSlip || null);
  };

  const handleClosePaymentModal = () => {
    setOpenPaymentModal(false);
    setCurrentTransaction(null);
    setPaymentFile(null);
    setPaymentPreview(null);
  };

  const handlePaymentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setPaymentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePayment = async () => {
    if (!currentTransaction) return;

    // Create updated transaction
    const updatedTransaction: PurchaseTransaction = { 
        ...currentTransaction, 
        status: 'Paid',
        paymentSlip: paymentPreview || undefined 
    };

    // Update fullData
    const updatedFullData = fullData.map(item => 
        item.id === currentTransaction.id ? updatedTransaction : item
    );
    
    setFullData(updatedFullData);
    // Update visible data
    setData(prevData => prevData.map(item => item.id === currentTransaction.id ? updatedTransaction : item));

    // Sync with Server
    await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFullData)
    });

    handleClosePaymentModal();
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Payment Proof Modal */}
      <Dialog 
        open={openPaymentModal} 
        onClose={handleClosePaymentModal}
        PaperProps={{
            style: { 
                borderRadius: 16, 
                padding: 10,
                minWidth: 400
            }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>หลักฐานรายการชำระเงิน (Payment Evidence)</DialogTitle>
        <DialogContent>
            {currentTransaction && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        <strong>ผู้ซื้อ (Buyer):</strong> {currentTransaction.buyerName}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                         <strong>ยอดชำระ (Amount):</strong> ฿{currentTransaction.netPrice.toLocaleString()}
                    </Typography>
                </Box>
            )}
            
            <Box 
                sx={{ 
                    border: '2px dashed rgba(0, 0, 0, 0.1)', 
                    borderRadius: 2, 
                    p: 3, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'rgba(0,0,0,0.02)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
                }}
            >
                <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="payment-file-input"
                    type="file"
                    onChange={handlePaymentFileChange}
                />
                <label htmlFor="payment-file-input" style={{ width: '100%', cursor: 'pointer' }}>
                     {!paymentPreview ? (
                        <Box sx={{ p: 2 }}>
                             <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                             <Typography color="text.secondary">Click to upload payment slip</Typography>
                        </Box>
                     ) : (
                        <Box sx={{ position: 'relative', width: '100%', minHeight: 200, display: 'flex', justifyContent: 'center' }}>
                            <img src={paymentPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                                <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>Change Image</Typography>
                            </Box>
                        </Box>
                     )}
                </label>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleClosePaymentModal} color="inherit">Cancel</Button>
            <Button onClick={handleSavePayment} variant="contained" color="primary" disabled={!paymentPreview && !currentTransaction?.paymentSlip}>
                Save & Confirm Paid
            </Button>
        </DialogActions>
      </Dialog>
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
              background: 'linear-gradient(45deg, #1976d2, #9c27b0)', 
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
              borderColor: 'rgba(0,0,0,0.1)',
              color: 'text.primary',
              '&:hover': { borderColor: 'secondary.main', background: 'rgba(156, 39, 176, 0.05)' }
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

      {/* Filter Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 1, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography variant="subtitle2" sx={{ mb: 2, display: 'block', fontWeight: 600, color: 'text.secondary' }}>Filter & Search</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField 
                label="Search Buyer" 
                variant="outlined" 
                size="small"
                value={searchBuyer}
                onChange={(e) => setSearchBuyer(e.target.value)}
                sx={{ minWidth: 200 }}
            />
             <TextField 
                label="Search Product" 
                variant="outlined" 
                size="small"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                    value={filterStatus}
                    label="Status"
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                    <MenuItem value="All">All Status</MenuItem>
                    <MenuItem value="Paid">Paid</MenuItem>
                    <MenuItem value="Unpaid">Unpaid</MenuItem>
                </Select>
            </FormControl>
            
            <Box sx={{ flexGrow: 1 }} />

            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleResetFilter} color="secondary">
                Reset
            </Button>
             <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch} color="primary">
                Search
            </Button>
        </Stack>
      </Paper>

      {/* Table Section */}
      <ComponentContainer
        elevation={0}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="purchase table">
            <TableHead>
              <TableRow sx={{ background: 'rgba(0,0,0,0.02)' }}>
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
                    '&:hover': { background: 'rgba(0,0,0,0.02)' },
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
                    <Tooltip title="Upload Payment Evidence">
                        <IconButton size="small" onClick={() => handlePaymentClick(row)} color={row.status === 'Paid' ? 'success' : 'primary'}>
                            <PaymentsIcon fontSize="small" />
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
