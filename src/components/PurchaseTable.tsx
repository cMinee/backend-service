'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

// ...
import { PurchaseTransaction, initialData } from '@/data/mockPurchases';
import GenericTable, { Column } from '@/components/common/GenericTable';
import PageHeader from '@/components/common/PageHeader';
import FilterSection from '@/components/common/FilterSection';

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
            const jsonData = XLSX.utils.sheet_to_json(ws) as Record<string, string | number>[];
            
            const newTransactions: PurchaseTransaction[] = jsonData.map((row, index) => ({
                id: `imported-${Date.now()}-${index}`,
                buyerName: String(row['Buyer'] || row['Buyer Name'] || row['ผู้ซื้อ'] || 'Unknown'),
                productName: String(row['Product'] || row['Product Name'] || row['สินค้า'] || 'Unknown Item'),
                quantity: Number(row['Qty'] || row['Quantity'] || row['จำนวน'] || 1),
                netPrice: Number(row['Net Price'] || row['Price'] || row['ราคาสุทธิ'] || 0),
                orderDate: String(row['Order Date'] || row['Date'] || row['วันที่สั่งซื้อ'] || new Date().toISOString().split('T')[0]),
                status: (String(row['Status'] || row['สถานะ'] || 'Unpaid')) === 'Paid' ? 'Paid' : 'Unpaid'
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

  const columns: Column<PurchaseTransaction>[] = [
    {
        id: 'buyerName',
        label: 'ผู้ซื้อ (Buyer)',
        cellSx: { color: 'text.primary', fontWeight: 500 }
    },
    {
        id: 'productName',
        label: 'สินค้า (Product)',
        cellSx: { color: 'text.secondary' }
    },
    {
        id: 'quantity',
        label: 'จำนวน (Qty)',
        align: 'right',
        cellSx: { color: 'text.secondary' }
    },
    {
        id: 'netPrice',
        label: 'ราคาสุทธิ (Net Price)',
        align: 'right',
        cellSx: { color: 'text.primary', fontFamily: 'monospace' },
        render: (row) => `฿${row.netPrice.toLocaleString()}`
    },
    {
        id: 'orderDate',
        label: 'วันที่สั่งซื้อ (Date)',
        align: 'right',
        cellSx: { color: 'text.secondary' }
    },
    {
        id: 'status',
        label: 'สถานะ (Status)',
        align: 'center',
        render: (row) => (
            <Chip
                icon={row.status === 'Paid' ? <CheckCircleIcon /> : <AccessTimeIcon />}
                label={row.status}
                size="small"
                color={row.status === 'Paid' ? 'success' : 'warning'}
                variant="outlined"
                sx={{ borderRadius: '8px' }}
            />
        )
    },
    {
        id: 'actions',
        label: 'Actions',
        align: 'center',
        render: (row) => (
            <Tooltip title="Upload Payment Evidence">
                <IconButton size="small" onClick={() => handlePaymentClick(row)} color={row.status === 'Paid' ? 'success' : 'primary'}>
                    <PaymentsIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        )
    }
  ];

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
      <PageHeader
        title="รายการซื้อ (Purchase Items)"
        subtitle="Manage your purchase transactions imported from Excel"
        gradient="linear-gradient(45deg, #1976d2, #9c27b0)"
        actions={
          <>
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
          </>
        }
      />

      {/* Filter Section */}
      <FilterSection onSearch={handleSearch} onReset={handleResetFilter}>
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
      </FilterSection>

      {/* Table Section */}
      <GenericTable
        data={data}
        columns={columns}
        emptyMessage="ไม่พบรายการซื้อ"
      />
    </Box>
  );
}
