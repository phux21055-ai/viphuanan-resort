
// App.tsx contains the main application logic, dashboard and view management.
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Transaction, 
  TransactionType, 
  Category,
  GuestData,
  CustomerType,
  Booking
} from './types';
import OCRUpload from './components/OCRUpload';
import TransactionList from './components/TransactionList';
import PMSIntegration from './components/PMSIntegration';
import SystemReport from './components/SystemReport';
import CloudArchive from './components/CloudArchive';
import ManualEntry from './components/ManualEntry';
import FrontDesk from './components/FrontDesk';
import Settings from './components/Settings';
import CameraCapture from './components/CameraCapture';
import { processReceiptOCR } from './services/geminiService';

const STORAGE_KEY = 'resort_finance_data_v2.7';
const SETTINGS_KEY = 'resort_settings_v2.7';
const BOOKINGS_KEY = 'resort_bookings_v2.7';

const COLORS = {
  INCOME: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'],
  EXPENSE: ['#ef4444', '#f87171', '#fb7185', '#fda4af', '#fecaca']
};

const DEFAULT_SETTINGS = {
  resortName: "Smart Resort & Spa",
  resortAddress: "123 หมู่ 1 ต.โป่ง อ.บางละมุง จ.ชลบุรี 20150",
  taxId: "0-2055-5700x-xx-x",
  phone: "081-234-5678",
  aiModel: "gemini-3-flash-preview",
  autoReconcile: false
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem(BOOKINGS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<'dashboard' | 'transactions' | 'pms' | 'archive' | 'frontdesk' | 'settings'>('dashboard');
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isQuickCameraOpen, setIsQuickCameraOpen] = useState(false);
  const [isQuickProcessing, setIsQuickProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pieMode, setPieMode] = useState<TransactionType>(TransactionType.EXPENSE);

  // Auto-Unlock System: Check every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setBookings(prev => {
        let changed = false;
        const newBookings = prev.map(b => {
          if (b.status === 'locked' && b.lockedUntil && new Date(b.lockedUntil) < now) {
            changed = true;
            return { ...b, status: 'pending' as const }; // Or remove, but let's just mark it pending/cancelled
          }
          return b;
        });
        // Filter out completely expired locks to free up rooms
        const filtered = newBookings.filter(b => !(b.status === 'pending' && b.lockedUntil && new Date(b.lockedUntil) < now));
        if (filtered.length !== prev.length) changed = true;
        return changed ? filtered : prev;
      });
    }, 10000); // Check every 10 seconds for more responsiveness
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }, [bookings]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...t,
      id: Math.random().toString(36).substr(2, 9),
      isReconciled: settings.autoReconcile || t.isReconciled
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const handleQuickCameraCapture = async (base64: string) => {
    setIsQuickProcessing(true);
    try {
      const result = await processReceiptOCR(base64, 'GENERAL');
      addTransaction({
        date: result.date,
        amount: result.amount,
        type: result.type,
        category: result.category as Category,
        description: result.description,
        isReconciled: false,
        imageUrl: `data:image/jpeg;base64,${base64}`
      });
      alert("บันทึกรายการจากการถ่ายภาพสำเร็จ!");
    } catch (err: any) {
      alert("AI ประมวลผลผิดพลาด: " + err.message);
    } finally {
      setIsQuickProcessing(false);
    }
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const toggleReconcile = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, isReconciled: !t.isReconciled } : t));
  };

  const handleFrontDeskCheckIn = (data: { 
    guest: GuestData, 
    amount: number, 
    room: string, 
    description: string, 
    customerType: CustomerType,
    checkIn: string,
    checkOut: string
  }) => {
    addTransaction({
      date: new Date().toISOString().split('T')[0],
      type: TransactionType.INCOME,
      category: Category.ROOM_REVENUE,
      amount: data.amount,
      description: `${data.description} (${data.customerType}) เช็คอิน ${data.checkIn} - ${data.checkOut}`,
      isReconciled: true,
      guestData: { ...data.guest, customerType: data.customerType },
      customerType: data.customerType,
      pmsReferenceId: data.room
    });

    setBookings(prev => {
      const existingBookingIndex = prev.findIndex(b => b.roomNumber === data.room && (b.status === 'confirmed' || b.status === 'pending' || b.status === 'locked'));
      
      if (existingBookingIndex !== -1) {
        const newBookings = [...prev];
        newBookings[existingBookingIndex] = {
          ...newBookings[existingBookingIndex],
          status: 'checked_in',
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guestDetails: data.guest,
          guestName: `${data.guest.firstNameTH} ${data.guest.lastNameTH}`,
          lockedUntil: undefined
        };
        return newBookings;
      } else {
        const newBooking: Booking = {
          id: `PMS${Math.floor(Math.random() * 10000)}`,
          guestName: `${data.guest.firstNameTH} ${data.guest.lastNameTH}`,
          roomNumber: data.room,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          totalAmount: data.amount,
          status: 'checked_in',
          guestDetails: data.guest
        };
        return [newBooking, ...prev];
      }
    });
  };

  const handleQuickBooking = (bookingData: Omit<Booking, 'id' | 'status'>) => {
    const lockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour lock
    const newBooking: Booking = {
      ...bookingData,
      id: `LOCK${Math.floor(Math.random() * 10000)}`,
      status: 'locked',
      lockedUntil
    };
    setBookings(prev => [newBooking, ...prev]);
  };

  // Fix: Implemented handleClearData function to clear transaction and booking data
  const handleClearData = () => {
    if (window.confirm('คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่? ข้อมูลนี้ไม่สามารถกู้คืนได้')) {
      setTransactions([]);
      setBookings([]);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BOOKINGS_KEY);
      alert('ล้างข้อมูลสำเร็จ');
    }
  };

  const occupancyInsights = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const nextArrival = bookings
      .filter(b => (b.status === 'confirmed' || b.status === 'pending' || b.status === 'locked') && b.checkIn >= today)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
    const nextDeparture = bookings
      .filter(b => b.status === 'checked_in' && b.checkOut >= today)
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut))[0];
    return { nextArrival, nextDeparture };
  }, [bookings]);

  const { totalIncome, totalExpense, netProfit } = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome: income, totalExpense: expense, netProfit: Number(income) - Number(expense) };
  }, [transactions]);

  const monthlyChartData = useMemo(() => {
    const monthsMap: Record<string, { month: string, income: number, expense: number, timestamp: number }> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const monthIndex = Number(d.getMonth()) + 1;
      const key = `${d.getFullYear()}-${monthIndex.toString().padStart(2, '0')}`;
      const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
      if (!monthsMap[key]) monthsMap[key] = { month: label, income: 0, expense: 0, timestamp: d.getTime() };
      if (t.type === TransactionType.INCOME) monthsMap[key].income += t.amount;
      else monthsMap[key].expense += t.amount;
    });
    const sortedData = (Object.values(monthsMap) as Array<{ month: string, income: number, expense: number, timestamp: number }>)
      .sort((a, b) => a.timestamp > b.timestamp ? 1 : a.timestamp < b.timestamp ? -1 : 0);
    return sortedData.length > 0 ? sortedData : [{ month: 'ยังไม่มีข้อมูล', income: 0, expense: 0, timestamp: 0 }];
  }, [transactions]);

  const categoryPieData = useMemo(() => {
    const filtered = transactions.filter(t => t.type === pieMode);
    const groups = filtered.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value > a.value ? 1 : b.value < a.value ? -1 : 0);
  }, [transactions, pieMode]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 md:pb-0 md:pl-64">
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 fixed left-0 top-0 h-full z-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-xl shadow-indigo-100 font-black">SR</div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight truncate w-32">{settings.resortName}</h1>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Finance Hub v2.7</p>
          </div>
        </div>
        <div className="space-y-1.5 flex-1">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><span>📊</span> แดชบอร์ด</button>
          <button onClick={() => setView('frontdesk')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'frontdesk' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><span>🛎️</span> หน้าเช็คอิน</button>
          <button onClick={() => setView('transactions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'transactions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><span>📝</span> รายการเดินบัญชี</button>
          <button onClick={() => setView('archive')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'archive' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><span>☁️</span> คลังหลักฐาน</button>
          <button onClick={() => setView('pms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'pms' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><span>🏨</span> ระบบจอง (PMS)</button>
          <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><span>⚙️</span> ตั้งค่าระบบ</button>
        </div>
      </nav>

      <main className="p-5 md:p-10 max-w-6xl mx-auto">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <OCRUpload onTransactionDetected={addTransaction} label="Scan Income Slip" subLabel="Room Payments & Deposits" intent="INCOME" />
              <OCRUpload onTransactionDetected={addTransaction} label="Scan Expense Receipt" subLabel="Bills, Supplies & Maintenance" intent="EXPENSE" colorClass="bg-rose-500 shadow-rose-100 hover:bg-rose-600" />
              <button 
                onClick={() => setView('frontdesk')}
                className="bg-white border-2 border-dashed border-indigo-200 rounded-[2rem] p-5 flex items-center justify-center gap-3 text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 transition-all group lg:col-span-1 md:col-span-2"
              >
                <span className="text-2xl group-hover:scale-125 transition-transform">🛎️</span>
                <span className="text-sm font-black uppercase tracking-widest">Check-in Guest</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-indigo-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl text-xs">🚀</span>
                      <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Next Arrival (รายถัดไป)</h4>
                    </div>
                    {occupancyInsights.nextArrival ? (
                      <div>
                        <p className="text-lg font-black text-slate-800">Room {occupancyInsights.nextArrival.roomNumber} - {occupancyInsights.nextArrival.guestName}</p>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          Check-in: {new Date(occupancyInsights.nextArrival.checkIn).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          {occupancyInsights.nextArrival.status === 'locked' && <span className="text-amber-500 ml-2">(Room Locked)</span>}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 italic font-bold">ยังไม่มีการจองถัดไป</p>
                    )}
                  </div>
                  <button onClick={() => setView('pms')} className="text-[10px] font-black text-indigo-600 uppercase mt-4 hover:underline">View PMS Calendar →</button>
               </div>

               <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-rose-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-rose-100 text-rose-600 p-2 rounded-xl text-xs">🏠</span>
                      <h4 className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Next Departure (จะออกรายถัดไป)</h4>
                    </div>
                    {occupancyInsights.nextDeparture ? (
                      <div>
                        <p className="text-lg font-black text-slate-800">Room {occupancyInsights.nextDeparture.roomNumber} - {occupancyInsights.nextDeparture.guestName}</p>
                        <p className="text-xs text-slate-400 font-bold mt-1">Check-out: {new Date(occupancyInsights.nextDeparture.checkOut).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 italic font-bold">ไม่มีแขกกำลังเข้าพัก</p>
                    )}
                  </div>
                  <button onClick={() => setView('frontdesk')} className="text-[10px] font-black text-rose-600 uppercase mt-4 hover:underline">Manage Front Desk →</button>
               </div>
            </div>

            <SystemReport transactions={transactions} onReconcile={toggleReconcile} />
          </div>
        )}

        {view === 'frontdesk' && (
          <FrontDesk onCheckIn={handleFrontDeskCheckIn} onQuickBooking={handleQuickBooking} resortInfo={settings} />
        )}

        {view === 'transactions' && (
          <TransactionList transactions={transactions} onDelete={deleteTransaction} onReconcile={toggleReconcile} onViewImage={(url) => setSelectedImage(url)} />
        )}

        {view === 'archive' && (
          <CloudArchive transactions={transactions} onViewImage={(url) => setSelectedImage(url)} />
        )}

        {view === 'pms' && <PMSIntegration bookings={bookings} transactions={transactions} onAddTransaction={addTransaction} />}
        
        {view === 'settings' && (
          <Settings settings={settings} onUpdate={setSettings} onClearData={handleClearData} />
        )}
      </main>

      {/* Fix: Added modal for viewing scanned evidence images */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-0 right-0 m-4 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={selectedImage} 
              alt="Evidence" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white/5"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
