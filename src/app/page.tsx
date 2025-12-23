'use client';
import { Typography, Container, Box, Card, CardContent, Grid, Paper, Chip, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import StorageIcon from '@mui/icons-material/Storage';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,  PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';

// Interfaces (Matches your DB structure)
interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  brand: string;
  quantity: number;
  price: number;
  initialQuantity?: number;
}

interface Quotation {
  id: string;
  status: 'Pending' | 'PO Created';
  grandTotal: number;
}

interface PurchaseTransaction {
    id: string;
    buyerName: string;
    productName: string;
    quantity: number;
    netPrice: number;
    orderDate: string;
    status: 'Paid' | 'Unpaid';
}

interface ChartDatePoint {
    date: string;
    amount: number;
}

interface ChartStatusPoint {
    name: string;
    value: number;
}

interface TopProduct {
    name: string;
    totalQuantity: number;
    totalRevenue: number;
}

const COLORS = ['#00C49F', '#FF8042', '#0088FE', '#FFBB28'];

const StatCard = ({ title, value, icon, color, delay }: { title: string, value: string, icon: React.ReactNode, color: string, delay: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        style={{ height: '100%' }}
    >
        <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 4, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, transform: 'rotate(15deg) scale(1.5)', color: color }}>
                {icon}
            </Box>
            <CardContent>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h3" fontWeight="bold" sx={{ color: color }}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    </motion.div>
);

export default function Dashboard() {
  const [dateData, setDateData] = useState<ChartDatePoint[]>([]);
  const [statusData, setStatusData] = useState<ChartStatusPoint[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [paidOrders, setPaidOrders] = useState(0);
  const [unpaidOrders, setUnpaidOrders] = useState(0);
  
  // New States
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [pendingQT, setPendingQT] = useState(0);
  const [poCreatedQT, setPoCreatedQT] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    // Fetch Purchases
    fetch('/api/purchases')
        .then(res => res.json())
        .then((items: PurchaseTransaction[]) => {
            if (!Array.isArray(items)) return;
            

            const revenue = items.reduce((sum, item) => sum + item.netPrice, 0);
            const tOrders = items.length;
            const pOrders = items.filter(item => item.status === 'Paid').length;
            const uOrders = items.filter(item => item.status === 'Unpaid').length;

            setTotalRevenue(revenue);
            setTotalOrders(tOrders);
            setPaidOrders(pOrders);
            setUnpaidOrders(uOrders);

            setStatusData([
                { name: 'Paid', value: pOrders },
                { name: 'Unpaid', value: uOrders },
            ]);

            const dData = items.reduce((acc: ChartDatePoint[], item) => {
                const existing = acc.find(x => x.date === item.orderDate);
                if (existing) {
                    existing.amount += item.netPrice;
                } else {
                    acc.push({ date: item.orderDate, amount: item.netPrice });
                }
                return acc;
            }, []).sort((a: ChartDatePoint, b: ChartDatePoint) => new Date(a.date).getTime() - new Date(b.date).getTime());

            setDateData(dData);

            // Calculate Best Sellers
            const bestSellers = items.reduce((acc: Record<string, { qty: number, rev: number }>, item) => {
                if (!acc[item.productName]) {
                    acc[item.productName] = { qty: 0, rev: 0 };
                }
                acc[item.productName].qty += item.quantity;
                acc[item.productName].rev += item.netPrice;
                return acc;
            }, {});

            const top3 = Object.entries(bestSellers)
                .map(([name, data]) => ({ name, totalQuantity: data.qty, totalRevenue: data.rev }))
                .sort((a, b) => b.totalQuantity - a.totalQuantity)
                .slice(0, 3);

            setTopProducts(top3);
        })
        .catch(err => console.error("Failed to fetch purchase data:", err));

    // Fetch Inventory for Low Stock
    fetch('/api/inventory')
        .then(res => res.json())
        .then((items: InventoryItem[]) => {
            if (!Array.isArray(items)) return;
            const lowStock = items.filter(item => {
                if (!item.initialQuantity) return item.quantity < 20; // Default threshold
                return item.quantity <= (item.initialQuantity * 0.2);
            });
            setLowStockItems(lowStock);
        })
        .catch(err => console.error("Failed to fetch inventory data:", err));

    // Fetch Quotations for Status
    fetch('/api/quotations')
        .then(res => res.json())
        .then((items: Quotation[]) => {
            if (!Array.isArray(items)) return;
            setPendingQT(items.filter(q => q.status === 'Pending').length);
            setPoCreatedQT(items.filter(q => q.status === 'PO Created').length);
        })
        .catch(err => console.error("Failed to fetch quotation data:", err));
  }, []);

  return (
    <Box>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Dashboard Overview
            </Typography>
            <Typography variant="body1" color="text.secondary">
                Real-time insights from your purchase data
            </Typography>
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <StatCard 
                    title="Total Revenue" 
                    value={`฿${totalRevenue.toLocaleString()}`} 
                    icon={<AttachMoneyIcon sx={{ fontSize: 100 }} />} 
                    color="#90caf9" // Sales Blue
                    delay={0}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <StatCard 
                    title="Total Orders" 
                    value={totalOrders.toString()} 
                    icon={<ShoppingCartIcon sx={{ fontSize: 100 }} />} 
                    color="#ce93d8" // Purple
                    delay={0.1}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <StatCard 
                    title="Quotations Sent" 
                    value={pendingQT.toString()} 
                    icon={<StorageIcon sx={{ fontSize: 100 }} />} 
                    color="#0088FE" // Blue
                    delay={0.2}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <StatCard 
                    title="PO Created" 
                    value={poCreatedQT.toString()} 
                    icon={<CheckCircleIcon sx={{ fontSize: 100 }} />} 
                    color="#00C49F" // Green
                    delay={0.3}
                />
            </Grid>
        </Grid>

        {/* Charts and Low Stock Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Revenue Trend Chart */}
            <Grid size={{ xs: 12, md: 8 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)', height: 400 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Revenue Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={dateData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                <XAxis dataKey="date" stroke="#546e7a" />
                                <YAxis stroke="#546e7a" tickFormatter={(value) => `฿${value}`} width={80} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.1)', color: '#000' }}
                                    itemStyle={{ color: '#000' }}
                                />
                                <Bar dataKey="amount" fill="#1976d2" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </motion.div>
            </Grid>

            {/* Status Pie Chart */}
             <Grid size={{ xs: 12, md: 4 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <Typography variant="h6" gutterBottom sx={{ alignSelf: 'flex-start', mb: 2 }}>
                            Payment Status
                        </Typography>
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, color: '#000' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ w: 12, h: 12, borderRadius: '50%', background: COLORS[0], width: 12, height: 12 }} />
                                <Typography variant="body2">Paid ({paidOrders})</Typography>
                             </Box>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ w: 12, h: 12, borderRadius: '50%', background: COLORS[1], width: 12, height: 12 }} />
                                <Typography variant="body2">Unpaid ({unpaidOrders})</Typography>
                             </Box>
                        </Box>
                    </Paper>
                </motion.div>
            </Grid>
        </Grid>

        {/* Alerts and Insights Section */}
        <Grid container spacing={3}>
            {/* Low Stock Items Section */}
            <Grid size={{ xs: 12, md: 6 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)', height: '100%' }}>
                        <Typography variant="h6" gutterBottom color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <StorageIcon /> Low Stock Alert (Remaining &lt; 20%)
                        </Typography>
                        {lowStockItems.length > 0 ? (
                            <Stack spacing={2}>
                                {lowStockItems.map((item) => (
                                    <Card key={item.id} variant="outlined" sx={{ borderRadius: 2, borderLeft: '5px solid #d32f2f' }}>
                                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {item.productName}
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Stock: <strong>{item.quantity}</strong> / {item.initialQuantity || 'N/A'}
                                                </Typography>
                                                <Chip 
                                                    label={`${Math.round((item.quantity / (item.initialQuantity || 1)) * 100)}%`} 
                                                    size="small" 
                                                    color="error" 
                                                    variant="outlined"
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    All products are in healthy stock levels.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </motion.div>
            </Grid>

            {/* Best Sellers Section */}
            <Grid size={{ xs: 12, md: 6 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)', height: '100%' }}>
                        <Typography variant="h6" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <LocalFireDepartmentIcon color="error" /> Top 3 Best Selling Products
                        </Typography>
                        {topProducts.length > 0 ? (
                            <Stack spacing={2}>
                                {topProducts.map((product, index) => (
                                    <Card key={product.name} variant="outlined" sx={{ borderRadius: 2, borderLeft: `5px solid ${COLORS[index % COLORS.length]}` }}>
                                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {product.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Total Revenue: ฿{product.totalRevenue.toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="h6" fontWeight="bold" color="primary">
                                                        {product.totalQuantity}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Units Sold
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    No sales data available yet.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </motion.div>
            </Grid>
        </Grid>
        
      </Container>
    </Box>
  );
}
