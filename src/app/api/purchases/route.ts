import { NextResponse } from 'next/server';
import { getPurchases, savePurchases, PurchaseTransaction } from '@/lib/db';

export async function GET() {
  const data = getPurchases();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const newData: PurchaseTransaction[] = await req.json();
    
    // Validate (Simple check)
    if (!Array.isArray(newData)) {
        return NextResponse.json({ status: 'error', message: 'Invalid data format' }, { status: 400 });
    }

    // Save to file (replace all or append? for now let's say 'replace' specifically for sync logic,
    // logic in frontend sends merged data, so here we overwrite)
    savePurchases(newData);
    
    return NextResponse.json({ status: 'success', count: newData.length });
  } catch (error) {
     return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
