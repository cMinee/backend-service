export interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  quantity: number;
  price: number;
}

export const initialInventoryData: InventoryItem[] = [
  { id: '1', productName: 'Wireless Headphones', brand: 'Sony', quantity: 50, price: 2995 },
  { id: '2', productName: 'Mechanical Keyboard', brand: 'Keychron', quantity: 30, price: 3200 },
  { id: '3', productName: 'Gaming Mouse', brand: 'Logitech', quantity: 100, price: 1150 },
  { id: '4', productName: '27" 4K Monitor', brand: 'Dell', quantity: 15, price: 12500 },
  { id: '5', productName: 'USB-C Hub', brand: 'Anker', quantity: 200, price: 850 },
];
