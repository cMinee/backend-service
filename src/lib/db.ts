import fs from 'fs';
import path from 'path';

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

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  brand: string;
  quantity: number;
  price: number;
}

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

const purchasesDbPath = path.join(process.cwd(), 'src/data/db.json');
const inventoryDbPath = path.join(process.cwd(), 'src/data/inventory.json');
const quotationsDbPath = path.join(process.cwd(), 'src/data/quotation.json');

// Ensure DB files exist
if (!fs.existsSync(purchasesDbPath)) {
  fs.writeFileSync(purchasesDbPath, '[]');
}

if (!fs.existsSync(inventoryDbPath)) {
  // Initialize with some mock data if empty
  const initialInventory = [
    { id: '1', sku: 'SNY-WH-001', productName: 'Wireless Headphones', brand: 'Sony', quantity: 50, price: 2995 },
    { id: '2', sku: 'KYC-K2-002', productName: 'Mechanical Keyboard', brand: 'Keychron', quantity: 30, price: 3200 },
    { id: '3', sku: 'LOG-G5-003', productName: 'Gaming Mouse', brand: 'Logitech', quantity: 100, price: 1150 },
    { id: '4', sku: 'DEL-U27-004', productName: '27" 4K Monitor', brand: 'Dell', quantity: 15, price: 12500 },
    { id: '5', sku: 'ANK-H7-005', productName: 'USB-C Hub', brand: 'Anker', quantity: 200, price: 850 },
  ];
  fs.writeFileSync(inventoryDbPath, JSON.stringify(initialInventory, null, 2));
}

if (!fs.existsSync(quotationsDbPath)) {
  fs.writeFileSync(quotationsDbPath, '[]');
}

// Purchases Functions
export function getPurchases(): PurchaseTransaction[] {
  try {
    const data = fs.readFileSync(purchasesDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading db.json', error);
    return [];
  }
}

export function savePurchases(data: PurchaseTransaction[]): boolean {
  try {
    fs.writeFileSync(purchasesDbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to db.json', error);
    return false;
  }
}

// Inventory Functions
export function getInventory(): InventoryItem[] {
  try {
    const data = fs.readFileSync(inventoryDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading inventory.json', error);
    return [];
  }
}

export function saveInventory(data: InventoryItem[]): boolean {
  try {
    fs.writeFileSync(inventoryDbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to inventory.json', error);
    return false;
  }
}

// Quotation Functions
export function getQuotations(): Quotation[] {
  try {
    if (!fs.existsSync(quotationsDbPath)) return [];
    const data = fs.readFileSync(quotationsDbPath, 'utf8');
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading quotation.json', error);
    return [];
  }
}

export function saveQuotations(data: Quotation[]): boolean {
  try {
    fs.writeFileSync(quotationsDbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to quotation.json', error);
    return false;
  }
}
