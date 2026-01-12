// Vercel Serverless Function for scanning payment slips with Gemini AI
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Extract payment information from this Thai bank transfer slip and return ONLY valid JSON with this exact structure:
{
  "customer_name": "ชื่อผู้โอน (string)",
  "amount": จำนวนเงิน (number without commas),
  "date": "วันที่ในรูปแบบ YYYY-MM-DD",
  "time": "เวลาในรูปแบบ HH:MM",
  "bank": "ชื่อธนาคาร",
  "from_account": "บัญชีต้นทาง (ถ้ามี)",
  "to_account": "บัญชีปลายทาง (ถ้ามี)",
  "reference": "เลขอ้างอิง (ถ้ามี)"
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- amount must be a number (no commas, no currency symbols)
- date must be YYYY-MM-DD format
- If any field cannot be extracted, use empty string "" or 0 for numbers
- customer_name should be in Thai if available
`;

    // Remove data:image prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Clean response (remove markdown code blocks if present)
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const data = JSON.parse(cleanedText);

    // Validate required fields
    if (!data.amount || data.amount === 0) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบจำนวนเงินในสลิป กรุณาลองใหม่หรือกรอกข้อมูลเอง'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        customer_name: data.customer_name || '',
        amount: parseFloat(data.amount),
        date: data.date || new Date().toISOString().split('T')[0],
        time: data.time || '',
        bank: data.bank || '',
        from_account: data.from_account || '',
        to_account: data.to_account || '',
        reference: data.reference || ''
      }
    });

  } catch (error) {
    console.error('Slip scanning error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการอ่านสลิป'
    });
  }
}
