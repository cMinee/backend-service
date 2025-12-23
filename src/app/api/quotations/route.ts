import { NextResponse } from 'next/server';
import { getQuotations, saveQuotations, Quotation } from '@/lib/db';

export async function GET() {
  const data = getQuotations();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const newData: Quotation[] = await req.json();
    
    if (!Array.isArray(newData)) {
        return NextResponse.json({ status: 'error', message: 'Invalid data format' }, { status: 400 });
    }

    saveQuotations(newData);
    
    return NextResponse.json({ status: 'success', count: newData.length });
  } catch (error) {
     return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
