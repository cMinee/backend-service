'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    Select,
    Stack,
    MenuItem,
    InputLabel,
    FormControl,
    CircularProgress,
    Alert,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import * as XLSX from 'xlsx';
import Tesseract from 'tesseract.js';
import { motion } from 'framer-motion';

// ...
import { PurchaseTransaction, initialData } from '@/data/mockPurchases';
import GenericTable, { Column } from '@/components/common/GenericTable';
import PageHeader from '@/components/common/PageHeader';
import FilterSection from '@/components/common/FilterSection';

// =========================
// OCR / Amount Verification Helpers
// =========================

const THAI_DIGIT_MAP: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
};

const toArabicDigits = (s: string) => s.replace(/[๐-๙]/g, (d) => THAI_DIGIT_MAP[d] ?? d);

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const autoCropToContent = async (dataUrl: string): Promise<string> => {
    const img = await loadImage(dataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0);

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // หา bounding box ของพิกเซลที่ "ไม่ขาว" (เป็นข้อความ/เส้น/โลโก้)
    // ใช้ sampling step เพื่อลดโหลด
    const step = Math.max(2, Math.floor(Math.min(width, height) / 400));
    const WHITE_THRESHOLD = 245; // ยิ่งต่ำ = ครอปเข้มขึ้น

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const i = (y * width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 20) continue;

            // luminance
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            if (lum < WHITE_THRESHOLD) {
                found = true;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    // ถ้าไม่เจอ content เลย ไม่ครอป
    if (!found) return dataUrl;

    // padding กันครอปกินขอบ
    const pad = Math.round(Math.min(width, height) * 0.03); // 3%
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    const cropW = Math.max(1, maxX - minX);
    const cropH = Math.max(1, maxY - minY);

    // ถ้ากล่องเล็กผิดปกติ (เช่นเจอแค่จุดเดียว) ไม่ครอป
    if (cropW * cropH < width * height * 0.08) return dataUrl; // <8% ของภาพ

    const out = document.createElement('canvas');
    out.width = cropW;
    out.height = cropH;
    const octx = out.getContext('2d');
    if (!octx) return dataUrl;

    octx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return out.toDataURL('image/png');
};


/**
 * Enhance image for OCR (works well for slip screenshots)
 * - upscale
 * - grayscale + contrast + brightness
 * - threshold (binarize)
 */
const enhanceForOcr = async (dataUrl: string): Promise<string> => {
    // ✅ ครอปก่อน (ตัดขอบขาว/พื้นหลังออก)
    const croppedUrl = await autoCropToContent(dataUrl);
    const img = await loadImage(croppedUrl);

    // upscale to help OCR (target width ~2000px)
    const scale = Math.max(1, 2000 / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return croppedUrl;

    ctx.filter = 'grayscale(1) contrast(2.0) brightness(1.1)';
    ctx.drawImage(img, 0, 0, w, h);

    // threshold (ปรับค่าได้: 160-190)
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const TH = 175;

    for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const t = v > TH ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = t;
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
};

const normalizeNumberToken = (tokenRaw: string): string => {
    let t = toArabicDigits(tokenRaw);

    // remove currency symbol
    t = t.replace(/[฿]/g, '');

    // remove spaces
    t = t.replace(/\s+/g, '');

    // handle decimal comma like "198,00" -> "198.00"
    if (/^\d+,\d{2}$/.test(t)) t = t.replace(',', '.');

    // remove thousand separators
    // "1,234.00" -> "1234.00"
    t = t.replace(/,/g, '');

    // fix OCR common mistakes *inside numeric token only*
    // (do not apply to whole text to avoid destroying words)
    t = t
        .replace(/[Oo]/g, '0')
        .replace(/[Il|]/g, '1')
        .replace(/S/g, '5')
        .replace(/B/g, '8');

    // fix weird "198. 00" like cases (after spaces removed it’s usually already ok)
    t = t.replace(/(\d)\.(\d{1})$/, '$1.0$2');

    return t;
};

type AmountCandidate = {
    value: number;
    score: number;
    line: string;
};

const POSITIVE_KEYWORDS: RegExp[] = [
    /amount/i,
    /payment/i,
    /total/i,
    /net/i,
    /grand/i,
    /ยอดชำระ/,
    /ยอดโอน/,
    /โอนเงิน/,
    /จำนวนเงิน/,
    /จำนวน\s*:?/,
    /ราคา/,
    /เติมเงิน/,
];

const CURRENCY_KEYWORDS: RegExp[] = [
    /บาท/,
    /baht/i,
    /thb/i,
    /฿/,
];

const NEGATIVE_KEYWORDS: RegExp[] = [
    /fee/i,
    /ค่าธรรมเนียม/,
    /ค่าบริการ/,
    /commission/i,
];

const looksLikeDateOrTimeLine = (line: string) => {
    // common date/time patterns that contain many distracting numbers
    return /(:\d{2})/.test(line) || /(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/.test(line) || /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line);
};

const extractAmountCandidates = (rawText: string, expectedAmount: number): AmountCandidate[] => {
    const expected = round2(expectedAmount);
    const text = toArabicDigits(rawText);

    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    const candidates: AmountCandidate[] = [];

    // number-ish tokens (allow commas/dots/spaces inside)
    const tokenRegex = /[0-9๐-๙OoIlSB฿][0-9๐-๙OoIlSB฿,\.\s]{0,18}/g;

    for (const lineRaw of lines) {
        const line = lineRaw;

        const hasPositive = POSITIVE_KEYWORDS.some((re) => re.test(line));
        const hasCurrency = CURRENCY_KEYWORDS.some((re) => re.test(line));
        const hasNegative = NEGATIVE_KEYWORDS.some((re) => re.test(line));
        const dateTimePenalty = looksLikeDateOrTimeLine(line);

        const matches = line.match(tokenRegex) ?? [];
        for (const m of matches) {
            const cleaned = normalizeNumberToken(m);

            // must contain at least one digit
            if (!/\d/.test(cleaned)) continue;

            // parse float
            const v = Number(cleaned);
            if (!Number.isFinite(v)) continue;

            // filter obvious junk
            if (v <= 0) continue; // amounts should be > 0
            if (v > 100000000) continue;

            // score
            const v2 = round2(v);
            const diff = Math.abs(v2 - expected);

            let score = 0;

            // exact match priority
            if (diff < 0.005) score += 2000;

            // closeness (the closer, the higher)
            score += Math.max(0, 600 - diff * 80);

            // context boosts
            if (hasPositive) score += 250;
            if (hasCurrency) score += 120;

            // avoid fees and date/time lines
            if (hasNegative) score -= 700;
            if (dateTimePenalty) score -= 200;

            // prefer 2-decimal numbers
            if (/\.\d{2}$/.test(cleaned)) score += 80;

            candidates.push({ value: v2, score, line });
        }
    }

    return candidates.sort((a, b) => b.score - a.score);
};

const analyzeEvidence = (rawText: string, expectedAmount: number): { foundAmount: number | null; isMatch: boolean; candidates: number[] } => {
    const expected = round2(expectedAmount);

    // 1) quick exact-match string search (super reliable when OCR reads correctly)
    const textCompact = toArabicDigits(rawText)
        .replace(/\s+/g, '')
        .replace(/,/g, '')
        .replace(/[฿]/g, '')
        .toLowerCase();

    const expectedVariants = [
        expected.toFixed(2),                  // 198.00
        expected.toString(),                  // 198
        expected.toFixed(2).replace('.', ''), // 19800 (rare OCR missing dot)
    ];

    for (const v of expectedVariants) {
        const vv = v.replace(/\s+/g, '').replace(/,/g, '').toLowerCase();
        if (textCompact.includes(vv)) {
            return { foundAmount: expected, isMatch: true, candidates: [expected] };
        }
    }

    // 2) candidate extraction + scoring
    const cands = extractAmountCandidates(rawText, expected);

    if (cands.length === 0) {
        return { foundAmount: null, isMatch: false, candidates: [] };
    }

    const best = cands[0].value;
    const isMatch = Math.abs(round2(best) - expected) < 0.005;

    return {
        foundAmount: best,
        isMatch,
        candidates: cands.slice(0, 8).map((c) => c.value),
    };
};

export default function PurchaseTable() {
    const [data, setData] = useState<PurchaseTransaction[]>(initialData);
    const [fullData, setFullData] = useState<PurchaseTransaction[]>(initialData);
    const [openImportModal, setOpenImportModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Payment Modal States
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [currentTransaction, setCurrentTransaction] = useState<PurchaseTransaction | null>(null);
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [paymentPreview, setPaymentPreview] = useState<string | null>(null);

    // OCR States
    const [isProcessingSlip, setIsProcessingSlip] = useState(false);
    type OcrResult = {
        foundAmount: number | null;
        isMatch: boolean;
        rawText: string;
        candidates: number[];
    };

    const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);


    // Filter States
    const [searchBuyer, setSearchBuyer] = useState('');
    const [searchProduct, setSearchProduct] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Unpaid'>('All');

    useEffect(() => {
        // Fetch latest data from server on load
        const fetchData = async () => {
            try {
                const res = await fetch('/api/purchases');
                if (res.ok) {
                    const serverData = await res.json();
                    if (Array.isArray(serverData) && serverData.length > 0) {
                        setData(serverData);
                        setFullData(serverData);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch initial data:', error);
            }
        };
        fetchData();
    }, []);

    const handleSearch = () => {
        let filtered = [...fullData];

        if (searchBuyer.trim()) {
            filtered = filtered.filter(item => item.buyerName.toLowerCase().includes(searchBuyer.toLowerCase()));
        }
        if (searchProduct.trim()) {
            filtered = filtered.filter(item => item.productName.toLowerCase().includes(searchProduct.toLowerCase()));
        }
        if (filterStatus !== 'All') {
            filtered = filtered.filter(item => item.status === filterStatus);
        }

        setData(filtered);
    };

    const handleResetFilter = () => {
        setSearchBuyer('');
        setSearchProduct('');
        setFilterStatus('All');
        setData(fullData);
    };

    const handleImportClick = () => {
        setOpenImportModal(true);
    };

    const handleCloseImportModal = () => {
        setOpenImportModal(false);
        setSelectedFile(null);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleSaveImport = async () => {
        if (!selectedFile) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const bstr = e.target?.result;
            if (bstr) {
                try {
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const jsonData = XLSX.utils.sheet_to_json(ws) as Record<string, string | number>[];

                    const newTransactions: PurchaseTransaction[] = jsonData.map((row, index) => ({
                        id: `imported-${Date.now()}-${index}`,
                        buyerName: String(row['Buyer'] || row['Buyer Name'] || row['ผู้ซื้อ'] || 'Unknown'),
                        productName: String(row['Product'] || row['Product Name'] || row['สินค้า'] || 'Unknown Item'),
                        quantity: Number(row['Qty'] || row['Quantity'] || row['จำนวน'] || 1),
                        netPrice: Number(row['Net Price'] || row['Price'] || row['ราคาสุทธิ'] || 0),
                        orderDate: String(row['Order Date'] || row['Date'] || row['วันที่สั่งซื้อ'] || new Date().toISOString().split('T')[0]),
                        status: (String(row['Status'] || row['สถานะ'] || 'Unpaid')) === 'Paid' ? 'Paid' : 'Unpaid'
                    }));

                    // 1. Send ONLY new transactions to the import API
                    const res = await fetch('/api/purchases/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newTransactions)
                    });

                    const result = await res.json();

                    if (result.status === 'success') {
                        // 2. Refresh Data from Server (Get the full updated list)
                        const refreshRes = await fetch('/api/purchases');
                        const refreshedData = await refreshRes.json();

                        setFullData(refreshedData);
                        setData(refreshedData);

                        handleCloseImportModal();
                        alert(`Successfully imported ${newTransactions.length} items.\nInventory has been updated.\n\nLogs:\n${result.logs.join('\n')}`);
                    } else {
                        alert(`Failed to import: ${result.message}`);
                    }
                } catch (error) {
                    console.error("Error reading file:", error);
                    alert("Error parsing Excel file");
                }
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleExport = () => {
        // Generate Excel from current data
        const exportData = data.map(item => ({
            'Buyer Name': item.buyerName,
            'Product Name': item.productName,
            'Quantity': item.quantity,
            'Net Price': item.netPrice,
            'Order Date': item.orderDate,
            'Status': item.status
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Purchases");
        XLSX.writeFile(wb, "purchase_data.xlsx");
    };

    // Payment Handlers
    const handlePaymentClick = (transaction: PurchaseTransaction) => {
        setCurrentTransaction(transaction);
        setOpenPaymentModal(true);
        setPaymentFile(null);
        setPaymentPreview(transaction.paymentSlip || null);
    };

    const handleClosePaymentModal = () => {
        setOpenPaymentModal(false);
        setCurrentTransaction(null);
        setPaymentFile(null);
        setPaymentPreview(null);
    };

    // const analyzeEvidence = (text: string, expectedAmount: number): { foundAmount: number | null, isMatch: boolean } => {
    //     // --- 1. PRECISE MATCH (Targeted Search) ---
    //     // Best for correct slips. Finds the expected amount directly.

    //     const formatted = expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    //     const variants = [
    //         formatted, // "1,234.00"
    //         expectedAmount.toFixed(2), // "1234.00"
    //         expectedAmount.toString() // "1234"
    //     ];

    //     const compactText = text.replace(/(\d)\s+(\d)/g, '$1$2').replace(/,/g, '');
    //     for (const v of variants) {
    //         if (compactText.includes(v.replace(/,/g, ''))) {
    //             return { foundAmount: expectedAmount, isMatch: true };
    //         }
    //     }

    //     // --- 2. EXTRACTION STRATEGY (Fallback) ---
    //     // If we reach here, the expected amount is NOT in the text.
    //     // We now try to find WHAT IS in the text, to report a mismatch.

    //     // Clean Thai Text
    //     const cleanedText = text.replace(/([ก-๙])\s+(?=[ก-๙])/g, '$1');

    //     const candidates: number[] = [];

    //     // Strategy A: Keyword Prefix (Amount 100.00)
    //     // Keywords: Amount, จำนวนเงิน, ยอดโอน, โอนเงิน, โอน, จำนวน, ราคา
    //     const prefixPattern = /(?:Amount|จำนวนเงิน|ยอดโอน|โอนเงิน|โอน|จำนวน|ราคา|Net Amount)[\D]{0,50}?([\d,]+\.\d{2})/gi;
    //     let m;
    //     while ((m = prefixPattern.exec(cleanedText)) !== null) {
    //         if (m[1]) candidates.push(parseFloat(m[1].replace(/,/g, '')));
    //     }

    //     // Strategy B: Keyword Suffix (100.00 Baht)
    //     // Look for number immediately followed by "Baht" or "บาท"
    //     const suffixPattern = /([\d,]+\.\d{2})\s*(?:Baht|THB|บาท)/gi;
    //     while ((m = suffixPattern.exec(cleanedText)) !== null) {
    //         if (m[1]) candidates.push(parseFloat(m[1].replace(/,/g, '')));
    //     }

    //     if (candidates.length > 0) {
    //         return { foundAmount: candidates[0], isMatch: false };
    //     }

    //     return { foundAmount: null, isMatch: false };
    // };

    const handlePaymentFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !event.target.files[0]) return;
        if (!currentTransaction) return;

        const file = event.target.files[0];
        setPaymentFile(file);
        setOcrResult(null);
        setIsProcessingSlip(true);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageDataUrl = reader.result as string;
            setPaymentPreview(imageDataUrl);

            const expectedAmount = currentTransaction.netPrice;

            try {
                // preprocess (enhanced) + fallback original
                const enhanced = await enhanceForOcr(imageDataUrl);
                const attempts = [enhanced, imageDataUrl];

                let best: { foundAmount: number | null; isMatch: boolean; rawText: string; candidates: number[] } | null = null;

                for (const imgSrc of attempts) {
                    const result = await Tesseract.recognize(
                        imgSrc,
                        'eng+tha',
                        {
                            logger: m => console.log(m),
                        }
                    );

                    const text = result.data.text || '';
                    const analysis = analyzeEvidence(text, expectedAmount);

                    const current = {
                        foundAmount: analysis.foundAmount,
                        isMatch: analysis.isMatch,
                        rawText: text,
                        candidates: analysis.candidates,
                    };

                    // pick best:
                    // - if match found => stop immediately
                    // - else keep one that has foundAmount (not null) and closer candidates (analyzeEvidence already scored internally)
                    if (!best) best = current;
                    if (current.isMatch) { best = current; break; }

                    // if previously null but now found number => replace
                    if (best.foundAmount === null && current.foundAmount !== null) best = current;
                }

                setOcrResult(best ?? { foundAmount: null, isMatch: false, rawText: '', candidates: [] });

            } catch (error) {
                console.error("OCR Failed:", error);
                setOcrResult({ foundAmount: null, isMatch: false, rawText: '', candidates: [] });
            } finally {
                setIsProcessingSlip(false);
            }
        };

        reader.readAsDataURL(file);
    };


    const handleSavePayment = async () => {
        if (!currentTransaction) return;

        // Create updated transaction
        const updatedTransaction: PurchaseTransaction = {
            ...currentTransaction,
            status: 'Paid',
            paymentSlip: paymentPreview || undefined
        };

        // Update fullData
        const updatedFullData = fullData.map(item =>
            item.id === currentTransaction.id ? updatedTransaction : item
        );

        setFullData(updatedFullData);
        // Update visible data
        setData(prevData => prevData.map(item => item.id === currentTransaction.id ? updatedTransaction : item));

        // Sync with Server
        await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFullData)
        });

        handleClosePaymentModal();
    };

    const handleViewPO = (row: PurchaseTransaction) => {
        if (!row.poFile) return;
        // Open base64 file in new window
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(`<iframe src="${row.poFile}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
    };

    const columns: Column<PurchaseTransaction>[] = [
        {
            id: 'buyerName',
            label: 'ผู้ซื้อ (Buyer)',
            cellSx: { color: 'text.primary', fontWeight: 500 }
        },
        {
            id: 'productName',
            label: 'สินค้า (Product)',
            cellSx: { color: 'text.secondary' }
        },
        {
            id: 'quantity',
            label: 'จำนวน (Qty)',
            align: 'right',
            cellSx: { color: 'text.secondary' }
        },
        {
            id: 'netPrice',
            label: 'ราคาสุทธิ (Net Price)',
            align: 'right',
            cellSx: { color: 'text.primary', fontFamily: 'monospace' },
            render: (row) => `฿${row.netPrice.toLocaleString()}`
        },
        {
            id: 'orderDate',
            label: 'วันที่สั่งซื้อ (Date)',
            align: 'right',
            cellSx: { color: 'text.secondary' }
        },
        {
            id: 'status',
            label: 'สถานะ (Status)',
            align: 'center',
            render: (row) => (
                <Chip
                    icon={row.status === 'Paid' ? <CheckCircleIcon /> : <AccessTimeIcon />}
                    label={row.status}
                    size="small"
                    color={row.status === 'Paid' ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ borderRadius: '8px' }}
                />
            )
        },
        {
            id: 'actions',
            label: 'Actions',
            align: 'center',
            render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="center">
                    {row.poFile && (
                        <Tooltip title="View Customer PO">
                            <IconButton size="small" onClick={() => handleViewPO(row)} color="info">
                                <DescriptionIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Upload Payment Evidence">
                        <IconButton size="small" onClick={() => handlePaymentClick(row)} color={row.status === 'Paid' ? 'success' : 'primary'}>
                            <PaymentsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )
        }
    ];

    return (
        <Box sx={{ width: '100%', p: 2 }}>
            {/* Payment Proof Modal */}
            <Dialog
                open={openPaymentModal}
                onClose={handleClosePaymentModal}
                PaperProps={{
                    style: {
                        borderRadius: 16,
                        padding: 10,
                        minWidth: 400
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>หลักฐานรายการชำระเงิน (Payment Evidence)</DialogTitle>
                <DialogContent>
                    {currentTransaction && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                <strong>ผู้ซื้อ (Buyer):</strong> {currentTransaction.buyerName}
                            </Typography>
                            <Typography variant="subtitle1" gutterBottom>
                                <strong>ยอดชำระ (Amount):</strong> ฿{currentTransaction.netPrice.toLocaleString()}
                            </Typography>
                        </Box>
                    )}

                    <Box
                        sx={{
                            border: '2px dashed rgba(0, 0, 0, 0.1)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: isProcessingSlip ? 'default' : 'pointer',
                            bgcolor: 'rgba(0,0,0,0.02)',
                            '&:hover': { bgcolor: isProcessingSlip ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.05)' },
                            position: 'relative'
                        }}
                    >
                        {isProcessingSlip && (
                            <Box sx={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(255,255,255,0.8)',
                                borderRadius: 2
                            }}>
                                <CircularProgress />
                                <Typography variant="caption" sx={{ mt: 2 }}>Analyzing Slip...</Typography>
                            </Box>
                        )}

                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="payment-file-input"
                            type="file"
                            disabled={isProcessingSlip}
                            onChange={handlePaymentFileChange}
                        />
                        <label htmlFor="payment-file-input" style={{ width: '100%', cursor: isProcessingSlip ? 'default' : 'pointer' }}>
                            {!paymentPreview ? (
                                <Box sx={{ p: 2 }}>
                                    <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                    <Typography color="text.secondary">Click to upload payment slip</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ position: 'relative', width: '100%', minHeight: 200, display: 'flex', justifyContent: 'center' }}>
                                    <img
                                        src={paymentPreview}
                                        alt="Preview"
                                        style={{
                                            width: '100%',
                                            maxWidth: 520,
                                            maxHeight: 520,
                                            objectFit: 'contain',
                                            borderRadius: 8
                                        }}
                                    />
                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
                                        <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>Change Image</Typography>
                                    </Box>
                                </Box>
                            )}
                        </label>
                    </Box>

                    {/* OCR Result Display */}
                    {ocrResult && currentTransaction && (
                        <Box sx={{ mt: 2 }}>
                            {ocrResult.isMatch ? (
                                <Alert icon={<CheckIcon fontSize="inherit" />} severity="success">
                                    Verified! Amount matches: ฿{ocrResult.foundAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Alert>
                            ) : (
                                ocrResult.foundAmount !== null ? (
                                    <Alert icon={<ErrorOutlineIcon fontSize="inherit" />} severity="error">
                                        Mismatch! Slip says ฿{ocrResult.foundAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {' '}but expected ฿{currentTransaction.netPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Alert>
                                ) : (
                                    <Alert severity="warning">
                                        Could not detect amount automatically. (Save disabled) กรุณาอัปโหลดรูปที่ชัดขึ้น/ครอปเฉพาะส่วนยอดเงิน
                                    </Alert>
                                )
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClosePaymentModal} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleSavePayment}
                        variant="contained"
                        color="primary"
                        disabled={
                            !paymentPreview ||           // ต้องมีรูป
                            isProcessingSlip ||          // ห้ามกดระหว่าง OCR
                            !ocrResult ||                // ต้องมีผล OCR
                            !ocrResult.isMatch           // ต้อง match เท่านั้น
                        }
                    >
                        Save & Confirm Paid
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Import Modal */}
            <Dialog
                open={openImportModal}
                onClose={handleCloseImportModal}
                PaperProps={{
                    style: {
                        borderRadius: 16,
                        padding: 10,
                        background: '#0a1929',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#fff' }}>Import Excel File</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                        Select an Excel file (.xlsx, .xls) to import purchase transactions.
                    </DialogContentText>
                    <Box
                        sx={{
                            border: '2px dashed rgba(144, 202, 249, 0.3)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            '&:hover': { borderColor: '#90caf9', background: 'rgba(144, 202, 249, 0.05)' }
                        }}
                    >
                        <input
                            accept=".xlsx, .xls"
                            style={{ display: 'none' }}
                            id="raised-button-file"
                            type="file"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="raised-button-file">
                            <Button variant="text" component="span" startIcon={<CloudUploadIcon />} sx={{ pointerEvents: 'none' }}>
                                {selectedFile ? selectedFile.name : "Choose File"}
                            </Button>
                        </label>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseImportModal} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button onClick={handleSaveImport} variant="contained" disabled={!selectedFile}>
                        Save & Import
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Header Section */}
            <PageHeader
                title="รายการซื้อ (Purchase Items)"
                subtitle="Manage your purchase transactions imported from Excel"
                gradient="linear-gradient(45deg, #1976d2, #9c27b0)"
                actions={
                    <>
                        <Button
                            variant="outlined"
                            startIcon={<CloudDownloadIcon />}
                            onClick={handleExport}
                            sx={{
                                borderColor: 'rgba(0,0,0,0.1)',
                                color: 'text.primary',
                                '&:hover': { borderColor: 'secondary.main', background: 'rgba(156, 39, 176, 0.05)' }
                            }}
                        >
                            Export
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CloudUploadIcon />}
                            onClick={handleImportClick}
                            sx={{
                                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
                            }}
                        >
                            Import Excel
                        </Button>
                    </>
                }
            />

            {/* Filter Section */}
            <FilterSection onSearch={handleSearch} onReset={handleResetFilter}>
                <TextField
                    label="Search Buyer"
                    variant="outlined"
                    size="small"
                    value={searchBuyer}
                    onChange={(e) => setSearchBuyer(e.target.value)}
                    sx={{ minWidth: 200 }}
                />
                <TextField
                    label="Search Product"
                    variant="outlined"
                    size="small"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    sx={{ minWidth: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={filterStatus}
                        label="Status"
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                    >
                        <MenuItem value="All">All Status</MenuItem>
                        <MenuItem value="Paid">Paid</MenuItem>
                        <MenuItem value="Unpaid">Unpaid</MenuItem>
                    </Select>
                </FormControl>
            </FilterSection>

            {/* Table Section */}
            <GenericTable
                data={data}
                columns={columns}
                emptyMessage="ไม่พบรายการซื้อ"
            />
        </Box>
    );
}
