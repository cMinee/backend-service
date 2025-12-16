import { NextResponse } from 'next/server';
import { getPurchases, savePurchases, getInventory, saveInventory, PurchaseTransaction, InventoryItem } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const newTransactions: PurchaseTransaction[] = await req.json();
    
    if (!Array.isArray(newTransactions)) {
        return NextResponse.json({ status: 'error', message: 'Invalid data format' }, { status: 400 });
    }

    // 1. Update Inventory (Decrement Stock)
    const currentInventory = getInventory();
    const updatedInventory = [...currentInventory];
    const logDetails: string[] = [];

    newTransactions.forEach(transaction => {
        // Try to find by Exact Name Match (insensitive)
        const inventoryItemIndex = updatedInventory.findIndex(
            item => item.productName.toLowerCase().trim() === transaction.productName.toLowerCase().trim()
        );

        if (inventoryItemIndex !== -1) {
            const item = updatedInventory[inventoryItemIndex];
            if (item.quantity >= transaction.quantity) {
                 updatedInventory[inventoryItemIndex] = {
                    ...item,
                    quantity: item.quantity - transaction.quantity
                 };
                 logDetails.push(`Decreased stock for ${item.productName}: -${transaction.quantity}`);
            } else {
                 // Option: Reduce to 0 or allow negative? Let's allow negative for now but log warning
                 updatedInventory[inventoryItemIndex] = {
                    ...item,
                    quantity: item.quantity - transaction.quantity
                 };
                 logDetails.push(`Warning: Stock negative for ${item.productName}`);
            }
        } else {
            logDetails.push(`Product not found in inventory: ${transaction.productName}`);
        }
    });

    saveInventory(updatedInventory);

    // 2. Save Purchases (Append to existing)
    const currentPurchases = getPurchases();
    const updatedPurchases = [...currentPurchases, ...newTransactions];
    savePurchases(updatedPurchases);
    
    return NextResponse.json({ 
        status: 'success', 
        count: newTransactions.length,
        logs: logDetails
    });
  } catch (error) {
     console.error("Import error:", error);
     return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
