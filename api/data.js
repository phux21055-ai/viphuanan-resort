import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      // ดึงข้อมูล
      const collection = db.collection('records');
      const data = await collection.find({}).toArray();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      // บันทึกข้อมูล
      const collection = db.collection('records');
      const result = await collection.insertOne(req.body);
      return res.status(201).json({ success: true, data: result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }
}
