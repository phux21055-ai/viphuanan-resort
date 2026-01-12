// CSV Export Utility
import { Transaction } from '../types';

export function exportToCSV(transactions: Transaction[], filename: string = 'transactions.csv') {
  // CSV Headers
  const headers = [
    'วันที่',
    'ประเภท',
    'หมวดหมู่',
    'จำนวนเงิน',
    'รายละเอียด',
    'สถานะกระทบยอด',
    'ชื่อแขก',
    'เลขบัตรประชาชน',
    'เบอร์โทร',
    'ประเภทลูกค้า'
  ];

  // Convert transactions to CSV rows
  const rows = transactions.map(tx => [
    tx.date,
    tx.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย',
    tx.category,
    tx.amount.toString(),
    `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes
    tx.isReconciled ? 'กระทบยอดแล้ว' : 'รอกระทบยอด',
    tx.guestData ? `"${tx.guestData.firstNameTH} ${tx.guestData.lastNameTH}"` : '',
    tx.guestData?.idNumber || '',
    tx.guestData?.phone || '',
    tx.customerType || ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Add BOM for UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBookingsToCSV(bookings: any[], filename: string = 'bookings.csv') {
  const headers = [
    'รหัสการจอง',
    'ชื่อแขก',
    'เลขห้อง',
    'วันเข้าพัก',
    'วันออก',
    'ยอดเงิน',
    'สถานะ'
  ];

  const rows = bookings.map(b => [
    b.id,
    `"${b.guestName}"`,
    b.roomNumber,
    b.checkIn,
    b.checkOut,
    b.totalAmount.toString(),
    b.status
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
