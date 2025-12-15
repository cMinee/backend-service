import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { initialData, PurchaseTransaction } from '@/data/mockPurchases';

// Initialize LINE Client
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.CHANNEL_SECRET || '',
};

const client = new messagingApi.MessagingApiClient(config);

// Helper function to format currency
const formatMoney = (amount: number) => `฿${amount.toLocaleString()}`;

// Logic to handle user text messages
const handleTextMessage = async (text: string, replyToken: string) => {
    let replyText = '';

    if (text.includes('ยอดค้าง')) {
        // Filter unpaid orders
        const unpaidOrders = initialData.filter(item => item.status === 'Unpaid');
        if (unpaidOrders.length === 0) {
            replyText = 'ไม่มียอดค้างชำระครับ ✨';
        } else {
            const totalUnpaid = unpaidOrders.reduce((sum, item) => sum + item.netPrice, 0);
            const orderList = unpaidOrders
                .map((item, index) => `${index + 1}. ${item.productName} (${formatMoney(item.netPrice)}) - ${item.buyerName}`)
                .join('\n');
            
            replyText = `📊 สรุปยอดค้างชำระ\n\n${orderList}\n\nรวมทั้งหมด: ${formatMoney(totalUnpaid)}`;
        }
    } else if (text.includes('ยอดขายรายวัน') || text.includes('ยอดขายวันนี้')) {
        // For demo, let's use '2025-12-13' as "today" because mock data has it, 
        // OR we can default to looking for orders matching today's system date.
        // Let's matching the specific example logic: "ข้อมูลที่มีการขายในวันที่ถาม"
        // Since user might ask "ยอดขายรายวัน", let's assume they mean *Today*.
        // But our mock data is in 2025. Let's just default to showing ALL daily sales grouped by date for clarity
        // OR filtering for a specific date if provided.
        // Let's keep it simple: Show sales for "today" (which in mock context might be empty unless we fake it).
        // Let's actually show a specific date present in mock data for demonstration if today is empty.
        
        // Simple logic: Check for date in YYYY-MM-DD format in string, else default to today
        const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
        let targetDate = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];

        // Hack for demo: if no date provided and 'today' yields nothing, show 2025-12-13
        const hasTodayOrders = initialData.some(item => item.orderDate === targetDate);
        if (!hasTodayOrders && !dateMatch) {
            // Check for mock data dates
            targetDate = '2025-12-13'; // Default to a day with data for demo purposes
        }

        const dailyOrders = initialData.filter(item => item.orderDate === targetDate);

        if (dailyOrders.length === 0) {
            replyText = `ไม่พบยอดขายสำหรับวันที่ ${targetDate} ครับ`;
        } else {
            const totalDaily = dailyOrders.reduce((sum, item) => sum + item.netPrice, 0);
             const orderList = dailyOrders
                .map((item, index) => `${index + 1}. ${item.productName} - ${formatMoney(item.netPrice)}`)
                .join('\n');
            replyText = `📅 ยอดขายวันที่ ${targetDate}\n\n${orderList}\n\nรวมยอดขาย: ${formatMoney(totalDaily)}`;
        }

    } else {
        // Default Helper Message
        replyText = `ผมไม่เข้าใจคำสั่งครับ 😅\nลองพิมพ์คำว่า:\n- "ยอดค้าง" เพื่อดูรายการที่ยังไม่จ่าย\n- "ยอดขายรายวัน" เพื่อดูสรุปยอดขาย`;
    }

    try {
        await client.replyMessage({
            replyToken: replyToken,
            messages: [{ type: 'text', text: replyText }],
        });
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // console.log('🔹 LINE Webhook Received:', JSON.stringify(body, null, 2));

    const events = body.events;

    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            // const userId = event.source.userId;
            // console.log(`📩 Message from ${userId}: ${event.message.text}`);
            await handleTextMessage(event.message.text, event.replyToken);
        } else {
            console.log('⚠️ Unsupported event type:', event.type);
        }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
