import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { getPurchases, savePurchases, getInventory, saveInventory, PurchaseTransaction } from '@/lib/db';

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
    const currentData = getPurchases();

    // 1. Check for "Purchase Order" Format
    // Format:
    // Name
    // ซื้อ Product
    // จำนวน Quantity
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const isPurchaseOrder = lines.length >= 3 && lines[1]?.startsWith('ซื้อ');

    if (isPurchaseOrder) {
        const buyerName = lines[0];
        const productName = lines[1].replace('ซื้อ', '').trim();
        const quantityStr = lines[2].replace('จำนวน', '').trim();
        const quantity = parseInt(quantityStr, 10);

        if (!productName || isNaN(quantity) || quantity <= 0) {
             replyText = 'ขออภัย รูปแบบข้อมูลสั่งซื้อไม่ถูกต้อง\nตัวอย่าง:\nคุณนิรชา\nซื้อ Headphones\nจำนวน 1';
        } else {
             // Logic: Check Inventory & Process Purchase
             const inventory = getInventory();
             const itemIndex = inventory.findIndex(
                 item => item.productName.toLowerCase() === productName.toLowerCase()
             );
         
             if (itemIndex === -1) {
                 replyText = `ไม่พบสินค้า "${productName}" ในคลังสินค้า`;
             } else {
                 const item = inventory[itemIndex];
             
                 if (item.quantity < quantity) {
                     replyText = `สินค้าไม่พอ (คงเหลือ ${item.quantity} ชิ้น)`;
                 } else {
                     // 1. Decrement Stock
                     item.quantity -= quantity;
                     saveInventory(inventory);
             
                     // 2. Create Purchase Record
                     const totalParams = item.price * quantity;
                     const newPurchase: PurchaseTransaction = {
                         id: `line-${Date.now()}`,
                         buyerName: buyerName,
                         productName: item.productName,
                         quantity: quantity,
                         netPrice: totalParams,
                         orderDate: new Date().toISOString().split('T')[0],
                         status: 'Unpaid' // Default for Line orders
                     };
                     
                     currentData.push(newPurchase);
                     savePurchases(currentData);
             
                     replyText = `รับคำสั่งซื้อเรียบร้อยแล้ว\nคุณ: ${buyerName}\nสินค้า: ${productName}\nจำนวน: ${quantity}\nยอดรวม: ฿${totalParams.toLocaleString()}\nสถานะ: ยังไม่จ่าย`;
                 }
             }
        }

    } else if (text.includes('ยอดค้าง')) {
        // 2. Report Unpaid Orders
        const unpaidOrders = currentData.filter(item => item.status === 'Unpaid');
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
        // 3. Report Daily Sales
        const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
        const targetDate = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];

        const dailyOrders = currentData.filter(item => item.orderDate === targetDate);

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
        // 4. Default Helper Message
        replyText = `ผมไม่เข้าใจคำสั่งครับ 😅\nลองพิมพ์คำว่า:\n- "ยอดค้าง" เพื่อดูรายการที่ยังไม่จ่าย\n- "ยอดขายรายวัน" เพื่อดูสรุปยอดขาย\n\nหรือสั่งซื้อสินค้า:\nชื่อ\nซื้อ [ชื่อสินค้า]\nจำนวน [จำนวน]`;
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
    const events = body.events;

    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
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
