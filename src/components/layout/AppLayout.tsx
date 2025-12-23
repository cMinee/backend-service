'use client';

import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorageIcon from '@mui/icons-material/Storage';
import EditDocumentIcon from '@mui/icons-material/EditDocument';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const drawerWidth = 260;

interface AppLayoutProps {
  children: React.ReactNode;
}

const MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Purchases', icon: <ShoppingCartIcon />, path: '/purchases' },
  { text: 'Inventory', icon: <StorageIcon />, path: '/inventory' },
  { text: 'Document', icon: <EditDocumentIcon />, path: '/document' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const pathname = usePathname();

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  // Close drawer on mobile when routing
  const handleItemClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  // User Menu State
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'text.primary',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Box 
              component="img" 
              src="https://cdn-icons-png.flaticon.com/512/9024/9024887.png" 
              alt="Logo"
              sx={{ width: 32, height: 32 }} 
            />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              BackendService
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 0 }}>
             <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt="User Admin" sx={{ bgcolor: 'secondary.main' }}>
                    <PersonIcon />
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
               <MenuItem onClick={handleCloseUserMenu}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Profile</Typography>
               </MenuItem>
               <MenuItem onClick={handleCloseUserMenu}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Settings</Typography>
               </MenuItem>
               <Divider />
               <MenuItem onClick={handleCloseUserMenu}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <Typography textAlign="center" color="error">Logout</Typography>
               </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar (Drawer) */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0,0,0,0.05)',
            background: '#f8f9fa' // Slightly off-white for sidebar
          },
        }}
        ModalProps={{
            keepMounted: true, // Better open performance on mobile.
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ overflow: 'auto', py: 2 }}>
          <List>
            {MENU_ITEMS.map((item) => {
               const isActive = pathname === item.path;
               return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 1, px: 1 }}>
                    <ListItemButton
                      component={Link}
                      href={item.path}
                      onClick={handleItemClick}
                      selected={isActive}
                      sx={{
                        minHeight: 48,
                        justifyContent: open ? 'initial' : 'center',
                        px: 2.5,
                        borderRadius: 2,
                        '&.Mui-selected': {
                            background: 'rgba(33, 150, 243, 0.1)',
                            color: 'primary.main',
                            '&:hover': {
                                background: 'rgba(33, 150, 243, 0.15)',
                            },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: 2,
                          justifyContent: 'center',
                          color: isActive ? 'primary.main' : 'text.secondary'
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text} 
                        primaryTypographyProps={{ 
                            fontWeight: isActive ? 600 : 400 
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
               );
            })}
          </List>
        </Box>
        
        {/* Sidebar Footer */}
        {/* <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 2, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                 <Typography variant="subtitle2" fontWeight="bold">Pro Plan Check</Typography>
                 <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 1 }}>You have 5 days left</Typography>
                 <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 2, mb: 0 }}>
                     <Box sx={{ width: '70%', height: '100%', bgcolor: '#fff', borderRadius: 2 }}></Box>
                 </Box>
            </Box>
        </Box> */}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', background: '#fff' }}>
        <Toolbar /> {/* Spacer using the toolbar height */}
        {children}
      </Box>
    </Box>
  );
}
