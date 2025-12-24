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
    } else if (text.includes('ยอดขาย') || ['วันนี้', 'สัปดาห์', 'เดือน', 'ปี'].some(k => text.includes(k)) || /^[1-4]$/.test(text.trim())) {
        // 3. Report Sales with Timeframes
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const input = text.trim();
        
        // Helper to filter and format sales
        const getSalesReport = (items: PurchaseTransaction[], title: string, filterFn: (item: PurchaseTransaction) => boolean) => {
            const filtered = items.filter(filterFn);
            if (filtered.length === 0) return `ไม่พบยอดขายสำหรับ ${title} ครับ`;
            
            const total = filtered.reduce((sum, item) => sum + item.netPrice, 0);
            const list = filtered.slice(0, 10)
                .map((item, index) => `${index + 1}. ${item.productName} - ${formatMoney(item.netPrice)}`)
                .join('\n');
            
            return `📊 ${title}\n\n${list}${filtered.length > 10 ? '\n...' : ''}\n\nยอดรวมทั้งหมด: ${formatMoney(total)}`;
        };

        if (input === 'ยอดขาย') {
            replyText = `📊 พิมพ์หมายเลขเพื่อดูยอดขายตามช่วงเวลา:\n1. วันนี้\n2. รายสัปดาห์ (7 วันล่าสุด)\n3. รายเดือน (30 วันล่าสุด)\n4. รายปี (ปีปัจจุบัน)`;
        } else if (input === '1' || input.includes('วันนี้')) {
            replyText = getSalesReport(currentData, `ยอดขายวันนี้ (${todayStr})`, item => item.orderDate === todayStr);
        } else if (input === '2' || input.includes('สัปดาห์')) {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];
            replyText = getSalesReport(currentData, 'ยอดขายรายสัปดาห์ (7 วันล่าสุด)', item => item.orderDate >= weekAgoStr);
        } else if (input === '3' || input.includes('เดือน')) {
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            const monthAgoStr = monthAgo.toISOString().split('T')[0];
            replyText = getSalesReport(currentData, 'ยอดขายรายเดือน (30 วันล่าสุด)', item => item.orderDate >= monthAgoStr);
        } else if (input === '4' || input.includes('ปี')) {
            const yearStartStr = `${now.getFullYear()}-01-01`;
            replyText = getSalesReport(currentData, `ยอดขายรายปี (${now.getFullYear()})`, item => item.orderDate >= yearStartStr);
        } else {
            // Check for specific date YYYY-MM-DD
            const dateMatch = input.match(/\d{4}-\d{2}-\d{2}/);
            const targetDate = dateMatch ? dateMatch[0] : todayStr;
            replyText = getSalesReport(currentData, `ยอดขายวันที่ ${targetDate}`, item => item.orderDate === targetDate);
        }

    } else if (text.includes('เช็คสินค้าใกล้หมด') || text.includes('สินค้าใกล้หมด')) {
        // 4. Low Stock Alert
        const inventory = getInventory();
        const lowStock = inventory.filter(item => {
            const threshold = item.initialQuantity ? item.initialQuantity * 0.2 : 20;
            return item.quantity <= threshold;
        });

        if (lowStock.length === 0) {
            replyText = '✅ สินค้าทุกรายการยังมีสต็อกเพียงพอครับ';
        } else {
            const list = lowStock
                .map(item => `- ${item.productName}: เหลือ ${item.quantity} (จาก ${item.initialQuantity || 'N/A'})`)
                .join('\n');
            replyText = `⚠️ รายการสินค้าใกล้หมด (น้อยกว่า 20%):\n\n${list}`;
        }

    } else {
        // 5. Product Search (Fuzzy Match)
        const inventory = getInventory();
        const input = text.trim();
        
        // Explicit check for standalone "สต็อก" command
        if (input === 'สต็อก' || input.toLowerCase() === 'stock') {
            replyText = 'กรุณาพิมพ์สินค้าที่ต้องการ เช่น:\nสต็อก Monitor Dell';
        } else {
            // Clean text: remove prefix "สต็อก" or "check" if present to improve matching
            let cleanText = text.toLowerCase().replace(/^สต็อก\s*/, '').replace(/^check\s*/, '').trim();
            
            // Safety check: Avoid single digit numbers unless they are explicitly prefixed with "สต็อก"
            if (/^\d$/.test(cleanText) && !text.includes('สต็อก')) {
                replyText = `ผมไม่เข้าใจคำสั่งครับ 😅 หรือค้นหาไม่เจอ\n\nลองพิมพ์ เช่น:\n- "สินค้าใกล้หมด"\n- "สต็อก [ชื่อสินค้า]"\n- "ยอดขาย"\n- "ยอดค้าง"`;
            } else if (cleanText === '') {
                 replyText = `กรุณาพิมพ์ชื่อสินค้าที่ต้องการค้นหาครับ เช่น "Monitor"`;
            } else {
                const searchTerms = cleanText.split(/\s+/);
                const matchedItems = inventory.filter(item => {
                    const itemText = `${item.productName} ${item.brand} ${item.sku}`.toLowerCase();
                    return searchTerms.every(term => itemText.includes(term));
                });

                if (matchedItems.length > 0) {
                    if (matchedItems.length === 1) {
                        const item = matchedItems[0];
                        replyText = `🔎 ข้อมูลสต็อก:\n\nสินค้า: ${item.productName}\nคงเหลือ: ✨ ${item.quantity} ชิ้น ✨\nราคา: ${formatMoney(item.price)}\nSKU: ${item.sku}`;
                    } else {
                        const list = matchedItems.slice(0, 5).map(item => `- ${item.productName}: ${item.quantity} ชิ้น`).join('\n');
                        replyText = `🔎 พบสินค้าใกล้เคียง (${matchedItems.length}):\n\n${list}${matchedItems.length > 5 ? '\n...' : ''}`;
                    }
                } else {
                    replyText = `ขออภัย ไม่พบสินค้าที่ตรงกับ "${cleanText}" ในระบบครับ 😅`;
                }
            }
        }
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
