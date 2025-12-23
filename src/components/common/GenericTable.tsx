'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  SxProps,
  Theme,
} from '@mui/material';
import { motion } from 'framer-motion';

export interface Column<T> {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  render?: (row: T, index: number) => React.ReactNode;
  headerSx?: SxProps<Theme>;
  cellSx?: SxProps<Theme>;
}

interface GenericTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField?: keyof T;
  emptyMessage?: string;
  containerSx?: SxProps<Theme>;
  loading?: boolean;
}

const ComponentContainer = motion(Paper);

export default function GenericTable<T>({
  data,
  columns,
  keyField = 'id' as keyof T,
  emptyMessage = 'ไม่พบข้อมูล',
  containerSx = {},
  loading = false,
}: GenericTableProps<T>) {
  return (
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
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        ...containerSx,
      }}
    >
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="generic table">
          <TableHead>
            <TableRow sx={{ background: 'rgba(0,0,0,0.02)' }}>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    width: column.width,
                    ...column.headerSx,
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <TableRow
                  key={String(row[keyField]) || rowIndex}
                  component={motion.tr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rowIndex * 0.05 }}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { background: 'rgba(0,0,0,0.02)' },
                    transition: 'background 0.2s',
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={`${String(row[keyField])}-${column.id}`}
                      align={column.align || 'left'}
                      sx={{ ...column.cellSx }}
                    >
                      {column.render
                        ? column.render(row, rowIndex)
                        : (row[column.id as keyof T] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    {loading ? 'กำลังโหลดข้อมูล...' : emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ComponentContainer>
  );
}
