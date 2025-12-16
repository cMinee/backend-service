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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Stack,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import * as XLSX from 'xlsx';
import { InventoryItem, initialInventoryData } from '@/data/mockInventory';
import { motion } from 'framer-motion';
import DeleteConfirm from '@/components/common/DeleteConfirm';

const ComponentContainer = motion(Paper);

export default function InventoryTable() {
  const [data, setData] = useState<InventoryItem[]>(initialInventoryData);
  const [fullData, setFullData] = useState<InventoryItem[]>(initialInventoryData);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Filter States
  const [searchProduct, setSearchProduct] = useState('');
  const [searchBrand, setSearchBrand] = useState('');

  // Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<InventoryItem | null>(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const handleSearch = () => {
    let filtered = [...fullData];

    if (searchProduct.trim()) {
        filtered = filtered.filter(item => item.productName.toLowerCase().includes(searchProduct.toLowerCase()));
    }
    if (searchBrand.trim()) {
        filtered = filtered.filter(item => item.brand.toLowerCase().includes(searchBrand.toLowerCase()));
    }
    
    setData(filtered);
  };

  const handleResetFilter = () => {
    setSearchProduct('');
    setSearchBrand('');
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
            
            const newItems: InventoryItem[] = jsonData.map((row: any, index: number) => ({
                id: `imported-${Date.now()}-${index}`,
                productName: row['Product'] || row['Product Name'] || row['ชื่อสินค้า'] || 'Unknown Item',
                brand: row['Brand'] || row['ยี่ห้อ'] || 'Unknown Brand',
                quantity: Number(row['Qty'] || row['Quantity'] || row['จำนวน'] || 0),
                price: Number(row['Price'] || row['ราคา'] || 0),
            }));

            // Merge with existing data
            const updatedData = [...fullData, ...newItems];

            setFullData(updatedData);
            setData(updatedData);
            handleCloseImportModal();
            alert(`Successfully imported ${newItems.length} items.`);
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
        'Product Name': item.productName,
        'Brand': item.brand,
        'Quantity': item.quantity,
        'Unit Price': item.price,
        'Total Price': item.quantity * item.price,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "inventory_data.xlsx");
  };

  // Edit Handlers
  const handleEditClick = (item: InventoryItem) => {
      setCurrentEditItem({ ...item });
      setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
      setEditModalOpen(false);
      setCurrentEditItem(null);
  };

  const handleSaveEdit = () => {
      if (!currentEditItem) return;

      const updatedFullData = fullData.map(item => 
          item.id === currentEditItem.id ? currentEditItem : item
      );

      setFullData(updatedFullData);
      // Re-apply filter if needed, or simply update displayed data
      // For simplicity, we update displayed data directly if it exists there, 
      // but ideally we re-run filter logic. Here we just update the specific item in 'data' too.
      setData(prevData => prevData.map(item => item.id === currentEditItem.id ? currentEditItem : item));
      
      handleCloseEditModal();
  };

  const handleEditChange = (field: keyof InventoryItem, value: any) => {
      if (!currentEditItem) return;
      setCurrentEditItem({
          ...currentEditItem,
          [field]: value
      });
  };

  // Delete Handlers
  const handleDeleteClick = (item: InventoryItem) => {
      setItemToDelete(item);
      setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
      setDeleteModalOpen(false);
      setItemToDelete(null);
  };

  const handleConfirmDelete = () => {
      if (!itemToDelete) return;

      const updatedFullData = fullData.filter(item => item.id !== itemToDelete.id);
      setFullData(updatedFullData);
      setData(prevData => prevData.filter(item => item.id !== itemToDelete.id));

      handleCloseDeleteModal();
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
        <DialogTitle sx={{ color: '#fff' }}>Import Inventory Excel</DialogTitle>
        <DialogContent>
            <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                Select an Excel file (.xlsx, .xls) to import inventory items.
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

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={handleCloseEditModal}>
        <DialogTitle>Edit Inventory Item</DialogTitle>
        <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
                {currentEditItem && (
                    <>
                        <TextField
                            label="Product Name"
                            value={currentEditItem.productName}
                            onChange={(e) => handleEditChange('productName', e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Brand"
                            value={currentEditItem.brand}
                            onChange={(e) => handleEditChange('brand', e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Quantity"
                            type="number"
                            value={currentEditItem.quantity}
                            onChange={(e) => handleEditChange('quantity', Number(e.target.value))}
                            fullWidth
                        />
                         <TextField
                            label="Price per Unit"
                            type="number"
                            value={currentEditItem.price}
                            onChange={(e) => handleEditChange('price', Number(e.target.value))}
                            fullWidth
                            InputProps={{
                                startAdornment: <InputAdornment position="start">฿</InputAdornment>,
                            }}
                        />
                    </>
                )}
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseEditModal} color="inherit">Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained" color="primary">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirm
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.productName}
      />

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
              background: 'linear-gradient(45deg, #00b09b, #96c93d)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            รายการสินค้าเข้า (Inventory / Stock In)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your incoming goods and inventory stock
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
              '&:hover': { borderColor: '#96c93d', background: 'rgba(150, 201, 61, 0.05)' }
            }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CloudUploadIcon />}
            onClick={handleImportClick}
            sx={{
               background: 'linear-gradient(45deg, #00b09b, #96c93d)',
               boxShadow: '0 4px 12px rgba(150, 201, 61, 0.3)',
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
                label="Search Product" 
                variant="outlined" 
                size="small"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
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
                label="Search Brand" 
                variant="outlined" 
                size="small"
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                sx={{ minWidth: 200 }}
            />
            
            <Box sx={{ flexGrow: 1 }} />

            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleResetFilter} color="secondary">
                Reset
            </Button>
             <Button variant="contained" onClick={handleSearch} color="primary" sx={{ background: '#00b09b' }}>
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
          <Table sx={{ minWidth: 650 }} aria-label="inventory table">
            <TableHead>
              <TableRow sx={{ background: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>ชื่อสินค้า (Product)</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>ยี่ห้อ (Brand)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>จำนวน (Qty)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>ราคาต่อหน่วย (Unit Price)</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>ราคาสุทธิ (Total Price)</TableCell>
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
                    {row.productName}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {row.brand}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                    {row.quantity}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    ฿{row.price.toLocaleString()}
                  </TableCell>
                   <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ฿{(row.price * row.quantity).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Item">
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(row)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Item">
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(row)}>
                            <DeleteIcon fontSize="small" />
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
