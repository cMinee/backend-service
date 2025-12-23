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
  DialogActions,
  TextField,
  Stack,
  Autocomplete,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion } from 'framer-motion';

// Mock Data
import { InventoryItem, initialInventoryData } from '@/data/mockInventory';

export interface Quotation {
  id: string;
  buyerName: string;
  buyerTaxId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  orderDate: string;
  expiryDate: string;
  status: 'Pending' | 'PO Created';
  sellerName: string;
}

const ComponentContainer = motion(Paper);

export default function DocumentTable() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [fullQuotations, setFullQuotations] = useState<Quotation[]>([]);
  const [openQTModal, setOpenQTModal] = useState(false);
  
  // Form States
  const [selectedCustomer, setSelectedCustomer] = useState<{name: string, taxId: string} | null>(null);
  const [customerInput, setCustomerInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [qtQuantity, setQtQuantity] = useState<number>(1);
  const [sellerName, setSellerName] = useState('My Awesome Shop Co., Ltd.');

  // Print States
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);
  const [openPrintDialog, setOpenPrintDialog] = useState(false);

  // Filter States
  const [searchBuyer, setSearchBuyer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  // Mock initial customers based on db.json names
  const [customers, setCustomers] = useState([
    { name: 'John Doe', taxId: '1234567890123' },
    { name: 'Jane Smith', taxId: '9876543210987' },
    { name: 'Bob Johnson', taxId: '4567891234567' },
    { name: 'Alice Williams', taxId: '3216549870123' },
  ]);

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const res = await fetch('/api/quotations');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setQuotations(data);
            setFullQuotations(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch quotations:', error);
      }
    };
    fetchQuotations();
  }, []);

  const handleSearch = () => {
    let filtered = [...fullQuotations];

    if (searchBuyer.trim()) {
      filtered = filtered.filter(item => item.buyerName.toLowerCase().includes(searchBuyer.toLowerCase()));
    }
    if (searchProduct.trim()) {
      filtered = filtered.filter(item => item.productName.toLowerCase().includes(searchProduct.toLowerCase()));
    }
    
    setQuotations(filtered);
  };

  const handleResetFilter = () => {
    setSearchBuyer('');
    setSearchProduct('');
    setQuotations(fullQuotations);
  };

  const handleOpenQTModal = () => {
    setOpenQTModal(true);
  };

  const handleCloseQTModal = () => {
    setOpenQTModal(false);
    setSelectedCustomer(null);
    setSelectedProduct(null);
    setQtQuantity(1);
    setCustomerInput('');
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    return selectedProduct.price * qtQuantity;
  };

  const handleSaveQT = async () => {
    let buyer = selectedCustomer;
    
    // If it's a new customer (manually typed)
    if (!buyer && customerInput.trim()) {
      buyer = { name: customerInput, taxId: 'Pending...' };
      // Optionally add to customers list
      setCustomers(prev => [...prev, buyer as {name: string, taxId: string}]);
    }

    if (!buyer || !selectedProduct) {
      alert('Please select a customer and a product.');
      return;
    }

    const now = new Date();
    const expiry = new Date();
    expiry.setMonth(now.getMonth() + 3);

    const newQT: Quotation = {
      id: `QT-${Date.now().toString().slice(-6)}`,
      buyerName: buyer.name,
      buyerTaxId: buyer.taxId,
      productName: selectedProduct.productName,
      quantity: qtQuantity,
      pricePerUnit: selectedProduct.price,
      totalPrice: calculateTotal(),
      orderDate: now.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      status: 'Pending',
      sellerName: sellerName
    };

    // Save to local state
    const updatedFull = [newQT, ...fullQuotations];
    setFullQuotations(updatedFull);
    setQuotations([newQT, ...quotations]);

    // Save to API (Mocked persistence via endpoint if exists, else it stays in memory)
    try {
        await fetch('/api/quotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFull)
        });
    } catch (e) {
        console.error('Failed to sync with API', e);
    }

    handleCloseQTModal();
    
    // Auto-open print preview
    setPrintQuotation(newQT);
    setOpenPrintDialog(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const createPOFromQT = React.useCallback(async (qt: Quotation) => {
    try {
        const newPO = {
            id: `PO-${Date.now()}`,
            buyerName: qt.buyerName,
            productName: qt.productName,
            quantity: qt.quantity,
            netPrice: qt.totalPrice,
            orderDate: new Date().toISOString().split('T')[0],
            status: 'Unpaid'
        };

        const res = await fetch('/api/purchases/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([newPO])
        });

        if (res.ok) {
            // Update QT status
            const updatedQTs = fullQuotations.map(q => q.id === qt.id ? { ...q, status: 'PO Created' as const } : q);
            setFullQuotations(updatedQTs);
            setQuotations(prev => prev.map(q => q.id === qt.id ? { ...q, status: 'PO Created' as const } : q));
            
            // Sync with server
            await fetch('/api/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedQTs)
            });

            alert('Purchase Order (PO) created successfully!');
        } else {
            alert('Failed to create PO');
        }
    } catch (error) {
        console.error('Error creating PO:', error);
    }
  }, [fullQuotations]);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Create QT Modal */}
      <Dialog 
        open={openQTModal} 
        onClose={handleCloseQTModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { borderRadius: 16 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>สร้างใบเสนอราคาใหม่ (Create New Quotation)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField 
                label="ชื่อผู้ขาย (Seller Name)"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                fullWidth
            />
            
            <Autocomplete
                freeSolo
                options={customers}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                onInputChange={(event, newInputValue) => {
                    setCustomerInput(newInputValue);
                }}
                onChange={(event, newValue) => {
                    if (typeof newValue === 'string') {
                        setSelectedCustomer({ name: newValue, taxId: '' });
                    } else {
                        setSelectedCustomer(newValue);
                    }
                }}
                renderInput={(params) => (
                    <TextField {...params} label="เลือกลูกค้า (Select/Type Customer)" required />
                )}
            />

            <Autocomplete
                options={initialInventoryData}
                getOptionLabel={(option) => `${option.productName} (${option.brand}) - ฿${option.price}`}
                onChange={(event, newValue) => setSelectedProduct(newValue)}
                renderInput={(params) => (
                    <TextField {...params} label="เลือกสินค้า (Select Product)" required />
                )}
            />

            <TextField 
                label="จำนวน (Quantity)"
                type="number"
                value={qtQuantity}
                onChange={(e) => setQtQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                fullWidth
            />

            {selectedProduct && (
                <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">สรุปราคา (Summary)</Typography>
                    <Typography variant="h6" color="primary">
                        ฿{calculateTotal().toLocaleString()}
                    </Typography>
                </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseQTModal} color="inherit">ยกเลิก</Button>
          <Button onClick={handleSaveQT} variant="contained" color="primary">สร้างและบันทึก</Button>
        </DialogActions>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog 
        open={openPrintDialog} 
        onClose={() => setOpenPrintDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Quotation Preview</DialogTitle>
        <DialogContent>
            <Box id="printable-quotation" sx={{ p: 4, bgcolor: '#fff', color: '#000', fontFamily: 'serif' }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>ใบเสนอราคา (QUOTATION)</Typography>
                    <Typography variant="subtitle1">{printQuotation?.id}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>ผู้ขาย (Seller):</Typography>
                        <Typography>{printQuotation?.sellerName}</Typography>
                        <Typography>เลขเสียภาษี: 0105560000000</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>ลูกค้า (Buyer):</Typography>
                        <Typography>{printQuotation?.buyerName}</Typography>
                        <Typography>เลขเสียภาษี: {printQuotation?.buyerTaxId}</Typography>
                    </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>รายการ (Description)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>จำนวน (Qty)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>ราคาหน่วยละ (Unit Price)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>รวมเงิน (Amount)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>{printQuotation?.productName}</TableCell>
                            <TableCell align="right">{printQuotation?.quantity}</TableCell>
                            <TableCell align="right">฿{printQuotation?.pricePerUnit.toLocaleString()}</TableCell>
                            <TableCell align="right">฿{printQuotation?.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>รวมทั้งสิ้น (Grand Total)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>฿{printQuotation?.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <Box sx={{ mt: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography>วันที่ออก (Date): {printQuotation?.orderDate}</Typography>
                        <Typography>วันที่สิ้นสุด (Expiry): {printQuotation?.expiryDate}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', borderTop: '1px solid #000', width: 200, mt: 4 }}>
                        <Typography sx={{ mt: 1 }}>ผู้มีอำนาจลงนาม</Typography>
                    </Box>
                </Box>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPrintDialog(false)}>ปิด</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Print / Export PDF</Button>
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
            การจัดการเอกสาร (Document Management)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage quotations and generate purchase orders
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenQTModal}
            sx={{
               boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
               borderRadius: '10px'
            }}
          >
            New QT
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
          <Table sx={{ minWidth: 650 }} aria-label="quotation table">
            <TableHead>
              <TableRow sx={{ background: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>QT ID</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>ลูกค้า (Buyer)</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>สินค้า (Product)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>จำนวน (Qty)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>ยอดรวม (Total)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>วันที่ออก (Date)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>หมดอายุ (Expiry)</TableCell>
                <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>สถานะ (Status)</TableCell>
                <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.map((row, index) => (
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
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {row.id}
                  </TableCell>
                  <TableCell component="th" scope="row" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {row.buyerName}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {row.productName}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.quantity}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.primary', fontFamily: 'monospace' }}>
                    ฿{row.totalPrice.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.orderDate}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.expiryDate}</TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={row.status === 'PO Created' ? <CheckCircleIcon /> : <AccessTimeIcon />}
                      label={row.status}
                      size="small"
                      color={row.status === 'PO Created' ? 'success' : 'info'}
                      variant="outlined"
                      sx={{ borderRadius: '8px' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="See/Print Quotation">
                            <IconButton size="small" onClick={() => { setPrintQuotation(row); setOpenPrintDialog(true); }}>
                                <PrintIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {row.status !== 'PO Created' && (
                            <Tooltip title="Create Purchase Order (PO)">
                                <IconButton size="small" color="primary" onClick={() => createPOFromQT(row)}>
                                    <ShoppingCartIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                   </TableCell>
                </TableRow>
              ))}
              {quotations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary">ยังไม่มีข้อมูลใบเสนอราคา</Typography>
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </ComponentContainer>
      
      <style jsx global>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #printable-quotation, #printable-quotation * {
                visibility: visible;
            }
            #printable-quotation {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0;
                margin: 0;
            }
            .MuiDialog-root {
                position: static;
            }
        }
      `}</style>
    </Box>
  );
}
