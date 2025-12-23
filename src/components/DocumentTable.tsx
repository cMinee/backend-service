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
  Stack,
  Autocomplete,
  Divider,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { motion } from 'framer-motion';
import GenericTable, { Column } from '@/components/common/GenericTable';
import PageHeader from '@/components/common/PageHeader';
import FilterSection from '@/components/common/FilterSection';

// Mock Data
import { InventoryItem, initialInventoryData } from '@/data/mockInventory';

export interface Quotation {
  id: string;
  buyerName: string;
  buyerTaxId: string;
  buyerAddress?: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  discountPerUnit: number;
  subtotal: number;
  specialDiscountPercent: number;
  totalAfterDiscount: number;
  vatAmount: number;
  grandTotal: number;
  orderDate: string;
  expiryDate: string;
  status: 'Pending' | 'PO Created';
  sellerName: string;
  sellerAddress?: string;
  sellerPhone?: string;
  salesPerson?: string;
  paymentTerm?: string;
  totalPrice?: number; // Legacy support
}

export default function DocumentTable() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [fullQuotations, setFullQuotations] = useState<Quotation[]>([]);
  const [openQTModal, setOpenQTModal] = useState(false);
  const [editingQT, setEditingQT] = useState<Quotation | null>(null);
  
  // Form States
  const [selectedCustomer, setSelectedCustomer] = useState<{name: string, taxId: string} | null>(null);
  const [customerInput, setCustomerInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [qtQuantity, setQtQuantity] = useState<number>(1);
  const [discountPerUnit, setDiscountPerUnit] = useState<number>(0);
  const [specialDiscountPercent, setSpecialDiscountPercent] = useState<number>(0);
  const [sellerName, setSellerName] = useState('บริษัท สิริไพศาล จำกัด');
  const [sellerAddress, setSellerAddress] = useState('555 อาคารคิวเฮาส์ เพลินจิต ถนนเพลินจิต แขวงลุมพินี เขตปทุมวัน กรุงเทพฯ 10330');
  const [sellerPhone, setSellerPhone] = useState('02-222-2255');
  const [salesPerson, setSalesPerson] = useState('John Doe');
  const [paymentTerm, setPaymentTerm] = useState('60 วัน');
  const [buyerAddress, setBuyerAddress] = useState('');

  // Print States
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);
  const [openPrintDialog, setOpenPrintDialog] = useState(false);

  // PO Upload States
  const [openPOModal, setOpenPOModal] = useState(false);
  const [selectedQTForPO, setSelectedQTForPO] = useState<Quotation | null>(null);
  const [poFile, setPoFile] = useState<File | null>(null);

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
    setEditingQT(null);
    setOpenQTModal(true);
  };

  const handleEditClick = (qt: Quotation) => {
    setEditingQT(qt);
    
    // Set Form States
    const customer = customers.find(c => c.name === qt.buyerName) || { name: qt.buyerName, taxId: qt.buyerTaxId };
    setSelectedCustomer(customer);
    setCustomerInput(qt.buyerName);
    
    const product = initialInventoryData.find(p => p.productName === qt.productName) || null;
    setSelectedProduct(product);
    
    setQtQuantity(qt.quantity);
    setDiscountPerUnit(qt.discountPerUnit || 0);
    setSpecialDiscountPercent(qt.specialDiscountPercent || 0);
    setBuyerAddress(qt.buyerAddress || '');
    setSellerName(qt.sellerName);
    setPaymentTerm(qt.paymentTerm || '60 วัน');
    
    setOpenQTModal(true);
  };

  const handleCloseQTModal = () => {
    setOpenQTModal(false);
    setSelectedCustomer(null);
    setSelectedProduct(null);
    setQtQuantity(1);
    setCustomerInput('');
    setDiscountPerUnit(0);
    setSpecialDiscountPercent(0);
    setEditingQT(null);
  };

  const calculatePricing = () => {
    if (!selectedProduct) return { 
        subtotal: 0, 
        totalAfterDiscount: 0, 
        vatAmount: 0, 
        grandTotal: 0 
    };
    
    const lineSubtotal = (selectedProduct.price - discountPerUnit) * qtQuantity;
    const afterSpecialDiscount = lineSubtotal * (1 - specialDiscountPercent / 100);
    const vat = afterSpecialDiscount * 0.07;
    const grand = afterSpecialDiscount + vat;

    return {
        subtotal: lineSubtotal,
        totalAfterDiscount: afterSpecialDiscount,
        vatAmount: vat,
        grandTotal: grand
    };
  };

  // Helper to convert number to Thai words (Simplified for demo)
  const numberToThaiWords = (num: number) => {
    // This is a very basic mock of "Thai Baht Text"
    if (num === 0) return 'ศูนย์บาทถ้วน';
    return `${num.toLocaleString()} บาทถ้วน`; // In real app, use a lib like bahttext.js
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

    const pricing = calculatePricing();
    const newQT: Quotation = {
      id: editingQT ? editingQT.id : `QT-${Date.now().toString().slice(-6)}`,
      buyerName: buyer.name,
      buyerTaxId: buyer.taxId,
      buyerAddress: buyerAddress,
      productName: selectedProduct.productName,
      quantity: qtQuantity,
      pricePerUnit: selectedProduct.price,
      discountPerUnit: discountPerUnit,
      subtotal: pricing.subtotal,
      specialDiscountPercent: specialDiscountPercent,
      totalAfterDiscount: pricing.totalAfterDiscount,
      vatAmount: pricing.vatAmount,
      grandTotal: pricing.grandTotal,
      orderDate: editingQT ? editingQT.orderDate : now.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      status: editingQT ? editingQT.status : 'Pending',
      sellerName: sellerName,
      sellerAddress: sellerAddress,
      sellerPhone: sellerPhone,
      salesPerson: salesPerson,
      paymentTerm: paymentTerm
    };

    let updatedFull: Quotation[];
    if (editingQT) {
        updatedFull = fullQuotations.map(q => q.id === editingQT.id ? newQT : q);
    } else {
        updatedFull = [newQT, ...fullQuotations];
    }

    setFullQuotations(updatedFull);
    // Re-apply current filters to show update if necessary
    setQuotations(prev => {
        if (editingQT) {
            return prev.map(q => q.id === editingQT.id ? newQT : q);
        }
        return [newQT, ...prev];
    });

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

   const handleOpenPOModal = (qt: Quotation) => {
    setSelectedQTForPO(qt);
    setPoFile(null);
    setOpenPOModal(true);
  };

  const handleClosePOModal = () => {
    setOpenPOModal(false);
    setSelectedQTForPO(null);
    setPoFile(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPoFile(event.target.files[0]);
    }
  };

  const handleSavePO = async () => {
    if (!selectedQTForPO || !poFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64File = e.target?.result as string;
        
        try {
            const newPO = {
                id: `PO-${Date.now()}`,
                buyerName: selectedQTForPO.buyerName,
                productName: selectedQTForPO.productName,
                quantity: selectedQTForPO.quantity,
                netPrice: selectedQTForPO.grandTotal,
                orderDate: new Date().toISOString().split('T')[0],
                status: 'Unpaid',
                poFile: base64File // Now saving the full file as base64
            };

            const res = await fetch('/api/purchases/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([newPO])
            });

            if (res.ok) {
                // Update QT status in both local states
                const updatedQTs = fullQuotations.map(q => q.id === selectedQTForPO.id ? { ...q, status: 'PO Created' as const } : q);
                setFullQuotations(updatedQTs);
                // Also update the filtered list
                setQuotations(prev => prev.map(q => q.id === selectedQTForPO.id ? { ...q, status: 'PO Created' as const } : q));
                
                // Sync with server
                await fetch('/api/quotations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedQTs)
                });

                handleClosePOModal();
                alert('สร้าง Purchase Order (PO) พร้อมบันทึกไฟล์สำเร็จ!');
            } else {
                alert('Failed to create PO');
            }
        } catch (error) {
            console.error('Error creating PO:', error);
            alert('เกิดข้อผิดพลาดในการสร้าง PO');
        }
    };
    reader.readAsDataURL(poFile);
  };

  const columns: Column<Quotation>[] = [
    {
        id: 'id',
        label: 'QT ID',
        cellSx: { fontWeight: 'bold', color: 'primary.main' }
    },
    {
        id: 'buyerName',
        label: 'ลูกค้า (Buyer)',
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
        id: 'grandTotal',
        label: 'ยอดรวม (Total)',
        align: 'right',
        cellSx: { color: 'text.primary', fontFamily: 'monospace' },
        render: (row) => `฿${(row.grandTotal ?? row.totalPrice ?? 0).toLocaleString()}`
    },
    {
        id: 'orderDate',
        label: 'วันที่ออก (Date)',
        align: 'right',
        cellSx: { color: 'text.secondary' }
    },
    {
        id: 'expiryDate',
        label: 'หมดอายุ (Expiry)',
        align: 'right',
        cellSx: { color: 'text.secondary' }
    },
    {
        id: 'status',
        label: 'สถานะ (Status)',
        align: 'center',
        render: (row) => (
            <Chip
                icon={row.status === 'PO Created' ? <CheckCircleIcon /> : <AccessTimeIcon />}
                label={row.status}
                size="small"
                color={row.status === 'PO Created' ? 'success' : 'info'}
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
            <Stack direction="row" spacing={1} justifyContent="center">
                <Tooltip title="See/Print Quotation">
                    <IconButton size="small" onClick={() => { setPrintQuotation(row); setOpenPrintDialog(true); }}>
                        <PrintIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                {row.status !== 'PO Created' && (
                    <Tooltip title="Edit Quotation">
                        <IconButton size="small" onClick={() => handleEditClick(row)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                {row.status !== 'PO Created' && (
                    <Tooltip title="Create Purchase Order (PO) - Upload PDF">
                        <IconButton size="small" color="primary" onClick={() => handleOpenPOModal(row)}>
                            <ShoppingCartIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        )
    }
  ];

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Create QT Modal */}
      {/* ... (keep existing Dialog components) ... */}
      <Dialog 
        open={openQTModal} 
        onClose={handleCloseQTModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { borderRadius: 16 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
            {editingQT ? `แก้ไขใบเสนอราคา (Edit Quotation: ${editingQT.id})` : 'สร้างใบเสนอราคาใหม่ (Create New Quotation)'}
        </DialogTitle>
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
                value={selectedCustomer}
                inputValue={customerInput}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                isOptionEqualToValue={(option, value) => option.name === value.name}
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
                value={selectedProduct}
                getOptionLabel={(option) => `${option.productName} (${option.brand}) - ฿${option.price}`}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                onChange={(event, newValue) => setSelectedProduct(newValue)}
                renderInput={(params) => (
                    <TextField {...params} label="เลือกสินค้า (Select Product)" required />
                )}
            />

            <Stack direction="row" spacing={2}>
                <TextField 
                    label="จำนวน (Quantity)"
                    type="number"
                    value={qtQuantity}
                    onChange={(e) => setQtQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    fullWidth
                />
                <TextField 
                    label="ส่วนลดต่อหน่วย (Discount/Unit)"
                    type="number"
                    value={discountPerUnit}
                    onChange={(e) => setDiscountPerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                    fullWidth
                />
            </Stack>

            <Stack direction="row" spacing={2}>
                <TextField 
                    label="หักส่วนลดพิเศษ % (Special Discount %)"
                    type="number"
                    value={specialDiscountPercent}
                    onChange={(e) => setSpecialDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    fullWidth
                />
                <TextField 
                    label="เครดิต (Payment Term)"
                    value={paymentTerm}
                    onChange={(e) => setPaymentTerm(e.target.value)}
                    fullWidth
                />
            </Stack>

            {selectedProduct && (
                <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">สรุปราคา (Pricing Summary)</Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">รวมเงิน:</Typography>
                            <Typography variant="body2">฿{calculatePricing().subtotal.toLocaleString()}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">หักส่วนลดพิเศษ ({specialDiscountPercent}%):</Typography>
                            <Typography variant="body2">-฿{(calculatePricing().subtotal - calculatePricing().totalAfterDiscount).toLocaleString()}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">ภาษีมูลค่าเพิ่ม 7%:</Typography>
                            <Typography variant="body2">฿{calculatePricing().vatAmount.toLocaleString()}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="h6" color="primary">ยอดสุทธิ (Grand Total):</Typography>
                            <Typography variant="h6" color="primary">฿{calculatePricing().grandTotal.toLocaleString()}</Typography>
                        </Box>
                    </Stack>
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
            <Box id="printable-quotation" sx={{ p: 4, bgcolor: '#fff', color: '#000', fontSize: '13px', lineBreak: 'anywhere' }}>
                {/* Header Row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Box sx={{ width: 60, height: 60, bgcolor: '#f0f4f8', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingCartIcon sx={{ fontSize: 40, color: '#333' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', fontSize: '20px', color: '#000' }}>{printQuotation?.sellerName}</Typography>
                        </Box>
                    </Box>
                    <Typography sx={{ fontSize: '30px', color: '#4472c4', fontWeight: 'bold' }}>ใบเสนอราคา</Typography>
                </Box>

                {/* Seller Detail & Doc Info */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ maxWidth: '60%' }}>
                        <Typography sx={{ fontSize: '12px', mb: 0.5 }}>{printQuotation?.sellerAddress}</Typography>
                        <Typography sx={{ fontSize: '12px' }}>โทร. : {printQuotation?.sellerPhone} เลขที่ผู้เสียภาษี : 0-1111-11111-11-1</Typography>
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', gap: 5 }}>
                            <Typography sx={{ fontWeight: 'bold' }}>วันที่เอกสาร</Typography>
                            <Typography>{printQuotation?.orderDate}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 5 }}>
                            <Typography sx={{ fontWeight: 'bold' }}>เลขที่ใบเสนอราคา</Typography>
                            <Typography>{printQuotation?.id}</Typography>
                        </Box>
                         <Box sx={{ display: 'flex', gap: 5 }}>
                            <Typography sx={{ fontWeight: 'bold' }}>รหัสลูกค้า</Typography>
                            <Typography>ABC123</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Buyer Sections */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ border: '1px solid #ddd', p: 1, width: '48%', borderRadius: 1 }}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>ใบเสนอราคาสำหรับ</Typography>
                        <Stack spacing={0.5}>
                            <Box sx={{ display: 'flex' }}>
                                <Typography sx={{ minWidth: 80, fontSize: '11px' }}>ชื่อลูกค้า :</Typography>
                                <Typography sx={{ fontSize: '11px' }}>{printQuotation?.buyerName}</Typography>
                            </Box>
                             <Box sx={{ display: 'flex' }}>
                                <Typography sx={{ minWidth: 80, fontSize: '11px' }}>ชื่อบริษัท :</Typography>
                                <Typography sx={{ fontSize: '11px' }}>{printQuotation?.buyerName} Co., Ltd.</Typography>
                            </Box>
                            <Box sx={{ display: 'flex' }}>
                                <Typography sx={{ minWidth: 80, fontSize: '11px' }}>ที่อยู่ :</Typography>
                                <Typography sx={{ fontSize: '11px' }}>-</Typography>
                            </Box>
                            <Box sx={{ display: 'flex' }}>
                                <Typography sx={{ minWidth: 80, fontSize: '11px' }}>โทรศัพท์ :</Typography>
                                <Typography sx={{ fontSize: '11px' }}>-</Typography>
                            </Box>
                             <Box sx={{ display: 'flex' }}>
                                <Typography sx={{ minWidth: 80, fontSize: '11px' }}>เลขภาษี :</Typography>
                                <Typography sx={{ fontSize: '11px' }}>{printQuotation?.buyerTaxId}</Typography>
                            </Box>
                        </Stack>
                    </Box>
                    <Box sx={{ width: '48%' }}>
                         <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                            <Typography sx={{ fontWeight: 'bold' }}>ใบเสนอราคาใช้ได้จนถึง:</Typography>
                            <Typography>{printQuotation?.expiryDate}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography sx={{ fontWeight: 'bold' }}>จัดทำโดย:</Typography>
                            <Typography>{printQuotation?.salesPerson}</Typography>
                        </Box>
                    </Box>
                </Box>

                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>พนักงานขาย : {printQuotation?.salesPerson}</Typography>

                {/* Main Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#cfe2f3' }}>
                            <th style={{ border: '1px solid #aaa', padding: '5px' }}>เลขที่</th>
                            <th style={{ border: '1px solid #aaa', padding: '5px' }}>รายการ</th>
                            <th style={{ border: '1px solid #aaa', padding: '5px' }}>จำนวน/หน่วย</th>
                            <th style={{ border: '1px solid #aaa', padding: '5px' }}>ราคา/หน่วย</th>
                            <th style={{ border: '1px solid #aaa', padding: '5px' }}>ส่วนลด</th>
                            <th style={{ border: '1px solid #aaa', padding: '5px' }}>จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ height: '30px' }}>
                            <td style={{ border: '1px solid #aaa', padding: '5px', textAlign: 'center' }}>1</td>
                            <td style={{ border: '1px solid #aaa', padding: '5px' }}>{printQuotation?.productName}</td>
                            <td style={{ border: '1px solid #aaa', padding: '5px', textAlign: 'center' }}>{printQuotation?.quantity}</td>
                            <td style={{ border: '1px solid #aaa', padding: '5px', textAlign: 'right' }}>฿ {(printQuotation?.pricePerUnit || 0).toLocaleString()}</td>
                            <td style={{ border: '1px solid #aaa', padding: '5px', textAlign: 'right' }}>฿ {(printQuotation?.discountPerUnit || 0).toLocaleString()}</td>
                            <td style={{ border: '1px solid #aaa', padding: '5px', textAlign: 'right' }}>฿ {(printQuotation?.subtotal || printQuotation?.totalPrice || 0).toLocaleString()}</td>
                        </tr>
                        {/* Fill empty rows */}
                        {[...Array(6)].map((_, i) => (
                            <tr key={i} style={{ height: '30px' }}>
                                <td style={{ border: '1px solid #aaa', padding: '5px' }}></td>
                                <td style={{ border: '1px solid #aaa', padding: '5px' }}></td>
                                <td style={{ border: '1px solid #aaa', padding: '5px' }}></td>
                                <td style={{ border: '1px solid #aaa', padding: '5px' }}></td>
                                <td style={{ border: '1px solid #aaa', padding: '5px' }}></td>
                                <td style={{ border: '1px solid #aaa', padding: '5px' }}></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary Section */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                         <Typography sx={{ fontWeight: 'bold' }}>จำนวนเงิน: {numberToThaiWords(printQuotation?.grandTotal || 0)}</Typography>
                         <Box sx={{ mt: 5 }}>
                            <Typography>การชำระเงิน: {printQuotation?.paymentTerm}</Typography>
                         </Box>
                    </Box>
                    <Box sx={{ width: '35%' }}>
                        <Stack spacing={0.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 'bold' }}>รวมเป็นเงิน</Typography>
                                <Typography>฿ {(printQuotation?.subtotal || printQuotation?.totalPrice || 0).toLocaleString()}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 'bold' }}>หักส่วนลดพิเศษ {printQuotation?.specialDiscountPercent || 0}%</Typography>
                                <Typography>฿ {((printQuotation?.subtotal || 0) - (printQuotation?.totalAfterDiscount || 0)).toLocaleString()}</Typography>
                            </Box>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 'bold' }}>ยอดรวมหลังหักส่วนลด</Typography>
                                <Typography>฿ {(printQuotation?.totalAfterDiscount || printQuotation?.totalPrice || 0).toLocaleString()}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 'bold' }}>ภาษีมูลค่าเพิ่ม 7%</Typography>
                                <Typography>฿ {(printQuotation?.vatAmount || 0).toLocaleString()}</Typography>
                            </Box>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#cfe2f3', p: 0.5 }}>
                                <Typography sx={{ fontWeight: 'bold' }}>ผลรวม</Typography>
                                <Typography sx={{ fontWeight: 'bold' }}>฿ {(printQuotation?.grandTotal || printQuotation?.totalPrice || 0).toLocaleString()}</Typography>
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPrintDialog(false)}>ปิด</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Print / Export PDF</Button>
        </DialogActions>
      </Dialog>

      {/* PO Upload Modal */}
      <Dialog 
        open={openPOModal} 
        onClose={handleClosePOModal}
        PaperProps={{
            sx: { 
                borderRadius: 4, 
                padding: 1.5,
                minWidth: 450
            }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
            อัปโหลดใบสั่งซื้อ (Upload Purchase Order: {selectedQTForPO?.id})
        </DialogTitle>
        <DialogContent>
            {selectedQTForPO && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        <strong>ลูกค้า:</strong> {selectedQTForPO.buyerName}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                         <strong>สินค้า:</strong> {selectedQTForPO.productName}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                         <strong>ยอดรวม:</strong> ฿{(selectedQTForPO.grandTotal ?? selectedQTForPO.totalPrice ?? 0).toLocaleString()}
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
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    id="po-file-input"
                    type="file"
                    onChange={handleFileChange}
                />
                <Box component="label" htmlFor="po-file-input" sx={{ width: '100%', cursor: 'pointer', display: 'block' }}>
                     {!poFile ? (
                        <Box sx={{ p: 2 }}>
                             <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                             <Typography color="text.secondary">คลิกเพื่ออัปโหลดไฟล์ PDF (ใบ PO จากลูกค้า)</Typography>
                        </Box>
                     ) : (
                        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                             <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                             <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{poFile.name}</Typography>
                             <Typography variant="caption" color="text.secondary">{(poFile.size / 1024).toFixed(2)} KB</Typography>
                             <Button size="small" sx={{ mt: 1 }}>เปลี่ยนไฟล์ (Change File)</Button>
                        </Box>
                     )}
                </Box>
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClosePOModal} color="inherit">Cancel</Button>
            <Button 
                onClick={handleSavePO} 
                variant="contained" 
                color="primary" 
                disabled={!poFile}
                sx={{ borderRadius: '8px' }}
            >
                Confirm & Create PO
            </Button>
        </DialogActions>
      </Dialog>

      {/* Header Section */}
      <PageHeader
        title="ใบเสนอราคา (Sales Quotation)"
        subtitle="Create and manage your sales quotations for customers"
        gradient="linear-gradient(45deg, #12c2e9, #c471ed, #f64f59)"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenQTModal}
            sx={{
              background: 'linear-gradient(45deg, #12c2e9, #c471ed)',
              boxShadow: '0 4px 12px rgba(196, 113, 237, 0.3)',
            }}
          >
            New QT
          </Button>
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Search Product"
          variant="outlined"
          size="small"
          value={searchProduct}
          onChange={(e) => setSearchProduct(e.target.value)}
          sx={{ minWidth: 200 }}
        />
      </FilterSection>

      {/* Table Section */}
      <GenericTable
        data={quotations}
        columns={columns}
        emptyMessage="ยังไม่มีข้อมูลใบเสนอราคา"
      />

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
