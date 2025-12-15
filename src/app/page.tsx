'use client';
import { AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent, Grid, Paper, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import StorageIcon from '@mui/icons-material/Storage';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingIcon from '@mui/icons-material/Pending';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import { initialData } from '@/data/mockPurchases';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,  PieChart, Pie, Cell } from 'recharts';

const MotionBox = motion(Box);

// Calculate Stats
const totalRevenue = initialData.reduce((sum, item) => sum + item.netPrice, 0);
const totalOrders = initialData.length;
const paidOrders = initialData.filter(item => item.status === 'Paid').length;
const unpaidOrders = initialData.filter(item => item.status === 'Unpaid').length;

// Prepare Chart Data
const statusData = [
  { name: 'Paid', value: paidOrders },
  { name: 'Unpaid', value: unpaidOrders },
];
const COLORS = ['#00C49F', '#FF8042'];

const dateData = initialData.reduce((acc: any[], item) => {
    const existing = acc.find(x => x.date === item.orderDate);
    if (existing) {
        existing.amount += item.netPrice;
    } else {
        acc.push({ date: item.orderDate, amount: item.netPrice });
    }
    return acc;
}, []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

const StatCard = ({ title, value, icon, color, delay }: { title: string, value: string, icon: React.ReactNode, color: string, delay: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
    >
        <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 4, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, transform: 'rotate(15deg) scale(1.5)' }}>
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
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a1929' }}>
      {/* Navbar */}
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10, 25, 41, 0.7)' }}>
        <Toolbar>
           <StorageIcon sx={{ mr: 2, color: 'secondary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', background: 'linear-gradient(to right, #90caf9, #ce93d8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BackendService
          </Typography>
          <Link href="/purchases" passHref>
             <Button variant="outlined" sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.2)', color: 'text.primary' }}>
                Purchase Management
             </Button>
          </Link>
          <Button color="inherit">Settings</Button>
        </Toolbar>
      </AppBar>

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
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard 
                    title="Total Revenue" 
                    value={`฿${totalRevenue.toLocaleString()}`} 
                    icon={<AttachMoneyIcon sx={{ fontSize: 100 }} />} 
                    color="#90caf9" // Sales Blue
                    delay={0}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard 
                    title="Total Orders" 
                    value={totalOrders.toString()} 
                    icon={<ShoppingCartIcon sx={{ fontSize: 100 }} />} 
                    color="#ce93d8" // Purple
                    delay={0.1}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                 <StatCard 
                    title="Paid Orders" 
                    value={paidOrders.toString()} 
                    icon={<TrendingUpIcon sx={{ fontSize: 100 }} />} 
                    color="#00C49F" // Success Green
                    delay={0.2}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard 
                    title="Pending Payment" 
                    value={unpaidOrders.toString()} 
                    icon={<PendingIcon sx={{ fontSize: 100 }} />} 
                    color="#FF8042" // Warning Orange
                    delay={0.3}
                />
            </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3}>
            {/* Revenue Trend Chart */}
            <Grid size={{ xs: 12, md: 8 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', height: 400 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Revenue Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={dateData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="#bdbdbd" />
                                <YAxis stroke="#bdbdbd" tickFormatter={(value) => `฿${value}`} width={80} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0a1929', borderColor: 'rgba(255,255,255,0.1)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="amount" fill="#90caf9" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </motion.div>
            </Grid>

            {/* Status Pie Chart */}
             <Grid size={{ xs: 12, md: 4 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <Typography variant="h6" gutterBottom sx={{ alignSelf: 'flex-start', mb: 2 }}>
                            Order Status
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
                                <RechartsTooltip contentStyle={{ backgroundColor: '#0a1929', borderRadius: 8 }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ w: 12, h: 12, borderRadius: '50%', background: COLORS[0], width: 12, height: 12 }} />
                                <Typography variant="body2">Paid</Typography>
                             </Box>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ w: 12, h: 12, borderRadius: '50%', background: COLORS[1], width: 12, height: 12 }} />
                                <Typography variant="body2">Unpaid</Typography>
                             </Box>
                        </Box>
                    </Paper>
                </motion.div>
            </Grid>
        </Grid>
        
        {/* Quick Actions */}
        <Box sx={{ mt: 5, textAlign: 'center' }}>
            <Link href="/purchases" passHref>
                 <Button 
                    variant="contained" 
                    size="large" 
                    endIcon={<ArrowForwardIcon />}
                    sx={{ 
                        borderRadius: 50, 
                        px: 5, 
                        py: 2,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                        fontSize: '1.1rem'
                    }}
                >
                    Manage All Purchases
                 </Button>
            </Link>
        </Box>
        
      </Container>
    </Box>
  );
}
