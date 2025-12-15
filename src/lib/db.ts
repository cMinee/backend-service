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
}

const dbPath = path.join(process.cwd(), 'src/data/db.json');

// Ensure DB file exists
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '[]');
}

export function getPurchases(): PurchaseTransaction[] {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading db.json', error);
    return [];
  }
}

export function savePurchases(data: PurchaseTransaction[]): boolean {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to db.json', error);
    return false;
  }
}
