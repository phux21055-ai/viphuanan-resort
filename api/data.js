import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('resort_data');

    if (req.method === 'GET') {
      // ดึงข้อมูลล่าสุด
      const data = await collection.find({}).sort({ lastSync: -1 }).limit(1).toArray();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      // บันทึก/อัพเดทข้อมูล
      const newData = {
        ...req.body,
        lastSync: new Date().toISOString(),
        updatedAt: new Date()
      };

      // ลบข้อมูลเก่าแล้วเพิ่มข้อมูลใหม่ (เก็บเฉพาะเวอร์ชันล่าสุด)
      await collection.deleteMany({});
      const result = await collection.insertOne(newData);

      return res.status(201).json({ success: true, data: result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database connection failed', message: error.message });
  }
}
