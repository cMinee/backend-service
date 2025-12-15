export interface PurchaseTransaction {
  id: string;
  buyerName: string;
  productName: string;
  quantity: number;
  netPrice: number;
  orderDate: string;
  status: 'Paid' | 'Unpaid';
  paymentSlip?: string;
}

export const initialData: PurchaseTransaction[] = [
  { id: '1', buyerName: 'John Doe', productName: 'Wireless Headphones', quantity: 2, netPrice: 5990, orderDate: '2025-12-12', status: 'Paid' },
  { id: '2', buyerName: 'Jane Smith', productName: 'Mechanical Keyboard', quantity: 1, netPrice: 3500, orderDate: '2025-12-13', status: 'Unpaid' },
  { id: '3', buyerName: 'Bob Johnson', productName: 'Gaming Mouse', quantity: 1, netPrice: 1290, orderDate: '2025-12-11', status: 'Paid' },
  { id: '4', buyerName: 'Alice Williams', productName: '27" 4K Monitor', quantity: 2, netPrice: 25000, orderDate: '2025-12-10', status: 'Paid' },
  { id: '5', buyerName: 'Charlie Brown', productName: 'USB-C Hub', quantity: 5, netPrice: 4500, orderDate: '2025-12-13', status: 'Unpaid' },
];
