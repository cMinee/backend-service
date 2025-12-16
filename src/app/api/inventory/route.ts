import { NextResponse } from 'next/server';
import { getInventory, saveInventory, InventoryItem } from '@/lib/db';

export async function GET() {
  const data = getInventory();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const newData: InventoryItem[] = await req.json();
    
    if (!Array.isArray(newData)) {
        return NextResponse.json({ status: 'error', message: 'Invalid data format' }, { status: 400 });
    }

    saveInventory(newData);
    
    return NextResponse.json({ status: 'success', count: newData.length });
  } catch (error) {
     return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
