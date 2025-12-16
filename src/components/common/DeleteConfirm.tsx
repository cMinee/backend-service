import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';

interface DeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  title?: string;
  content?: string;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({
  open,
  onClose,
  onConfirm,
  itemName,
  title = "Confirm Deletion",
  content
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ color: 'error.main' }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {content ? content : (
            <>
              Are you sure you want to delete {itemName ? <strong>{itemName}</strong> : "this item"}?
              <br />
              This action cannot be undone.
            </>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Confirm Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirm;
