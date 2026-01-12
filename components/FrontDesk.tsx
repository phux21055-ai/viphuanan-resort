
import React, { useState, useRef, useEffect } from 'react';
import { processIDCardOCR } from '../services/geminiService';
import { GuestData, TransactionType, Category, CustomerType, Booking } from '../types';
import PrintableDocument from './PrintableDocument';
import CameraCapture from './CameraCapture';

interface FrontDeskProps {
  onCheckIn: (data: { 
    guest: GuestData, 
    amount: number, 
    room: string, 
    description: string, 
    customerType: CustomerType,
    checkIn: string,
    checkOut: string
  }) => void;
  onQuickBooking: (booking: Omit<Booking, 'id' | 'status'>) => void;
  resortInfo: any;
}

const FrontDesk: React.FC<FrontDeskProps> = ({ onCheckIn, onQuickBooking, resortInfo }) => {
  const [mode, setMode] = useState<'CHECKIN' | 'QUICKBOOK'>('CHECKIN');
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showDoc, setShowDoc] = useState<'NONE' | 'RR3' | 'RECEIPT' | 'TAX_INVOICE'>('NONE');
  
  // Form fields
  const [roomNumber, setRoomNumber] = useState('');
  const [amount, setAmount] = useState('1500');
  const [description, setDescription] = useState('ค่าบริการห้องพัก Standard');
  const [customerType, setCustomerType] = useState<CustomerType>(CustomerType.CHECK_IN);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState('');

  // Quick Book Fields
  const [qbGuestName, setQbGuestName] = useState('');
  const [qbPhone, setQbPhone] = useState('');

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCheckOutDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOCRResult = async (base64Data: string) => {
    setIsScanning(true);
    try {
      const result = await processIDCardOCR(base64Data);
      setGuest(result);
    } catch (err: any) {
      alert(err.message || "สแกนไม่สำเร็จ กรุณาลองใหม่หรือพิมพ์ข้อมูลเอง");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    await handleOCRResult(base64Data);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCompleteCheckIn = () => {
    if (!guest || !roomNumber || !amount || !checkInDate || !checkOutDate) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนก่อนเช็คอิน");
      return;
    }
    onCheckIn({
      guest,
      room: roomNumber,
      amount: parseFloat(amount),
      description: `${description} - ห้อง ${roomNumber}`,
      customerType,
      checkIn: checkInDate,
      checkOut: checkOutDate
    });
    alert("เช็คอินสำเร็จ!");
    resetForm();
  };

  const handleSaveQuickBooking = () => {
    if (!qbGuestName || !roomNumber || !amount) {
      alert("กรุณากรอกชื่อและห้องพัก");
      return;
    }
    onQuickBooking({
      guestName: qbGuestName,
      roomNumber,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalAmount: parseFloat(amount),
      guestDetails: { firstNameTH: qbGuestName, lastNameTH: '', phone: qbPhone } as any
    });
    alert("ล็อคห้องสำเร็จ! ระบบจะล็อคห้องไว้เป็นเวลา 1 ชั่วโมงเพื่อรอแขกเข้าพักหรือโอนเงิน");
    resetForm();
  };

  const resetForm = () => {
    setGuest(null);
    setRoomNumber('');
    setAmount('1500');
    setQbGuestName('');
    setQbPhone('');
    setCustomerType(CustomerType.CHECK_IN);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Front Desk Hub</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Check-in & Quick Reservations</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setMode('CHECKIN')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'CHECKIN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              🛎️ เช็คอินแขก
            </button>
            <button 
              onClick={() => setMode('QUICKBOOK')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'QUICKBOOK' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              📞 จองด่วน (ล็อคห้อง)
            </button>
          </div>
        </div>

        {mode === 'CHECKIN' ? (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setIsCameraOpen(true)} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-xs font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3"><span className="text-lg">📸</span> สแกนบัตรประชาชน</button>
              <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all flex items-center gap-3"><span className="text-lg">📁</span> อัปโหลดรูป</button>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            </div>

            {isScanning ? (
               <div className="py-20 text-center bg-indigo-50/50 rounded-[3rem] animate-pulse">
                  <p className="text-indigo-600 font-black">AI กำลังอ่านข้อมูล...</p>
               </div>
            ) : guest ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-50 p-8 rounded-[2.5rem] space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">รายละเอียดจากบัตร</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input value={`${guest.title}${guest.firstNameTH} ${guest.lastNameTH}`} className="col-span-2 p-4 bg-white rounded-2xl font-bold border-none shadow-sm" readOnly />
                    <input value={guest.idNumber} className="p-4 bg-white rounded-2xl font-bold border-none shadow-sm" readOnly />
                    <input value={guest.dob} className="p-4 bg-white rounded-2xl font-bold border-none shadow-sm" readOnly />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button onClick={() => setShowDoc('RR3')} className="bg-slate-900 text-white p-3 rounded-xl text-[10px] font-black uppercase">ร.ร. 3</button>
                    <button onClick={() => setShowDoc('RECEIPT')} className="bg-emerald-500 text-white p-3 rounded-xl text-[10px] font-black uppercase">ใบมัดจำ</button>
                    <button onClick={() => setShowDoc('TAX_INVOICE')} className="bg-indigo-600 text-white p-3 rounded-xl text-[10px] font-black uppercase">ใบกำกับภาษี</button>
                  </div>
                </div>
                <div className="lg:col-span-2 bg-indigo-600 rounded-[3rem] p-8 text-white flex flex-col gap-6">
                   <h4 className="font-black text-xl">เช็คอินเข้าพัก</h4>
                   <div className="space-y-4">
                      <input type="date" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} className="w-full bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                      <input type="date" value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} className="w-full bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="เลขห้อง" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                        <input placeholder="ราคา" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="bg-white/10 p-4 rounded-2xl text-xs font-bold border border-white/20" />
                      </div>
                      <button onClick={handleCompleteCheckIn} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">ยืนยันเช็คอิน</button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                <p className="text-slate-300 font-bold">รอรับแขกเข้าพักรายใหม่</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-8 rounded-[3rem] space-y-6">
              <h4 className="font-black text-slate-800">กรอกข้อมูลจองด่วน</h4>
              <div className="space-y-4">
                <input placeholder="ชื่อแขกที่จอง..." value={qbGuestName} onChange={e => setQbGuestName(e.target.value)} className="w-full p-4 bg-white rounded-2xl font-bold shadow-sm border-none" />
                <input placeholder="เบอร์โทรติดต่อ..." value={qbPhone} onChange={e => setQbPhone(e.target.value)} className="w-full p-4 bg-white rounded-2xl font-bold shadow-sm border-none" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">วันที่เข้าพัก</label>
                    <input type="date" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} className="w-full p-4 bg-white rounded-2xl font-bold shadow-sm border-none text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">วันที่ออก</label>
                    <input type="date" value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} className="w-full p-4 bg-white rounded-2xl font-bold shadow-sm border-none text-xs" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-amber-500 rounded-[3rem] p-8 text-white flex flex-col justify-between shadow-2xl shadow-amber-100">
               <div>
                 <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-6">🔒</div>
                 <h4 className="font-black text-xl mb-2">Room Locking Policy</h4>
                 <p className="text-[11px] font-bold opacity-80 leading-relaxed uppercase tracking-wide">
                   ระบบจะทำการล็อคห้องพักนี้ไว้ 1 ชั่วโมง หากไม่มีการชำระเงินมัดจำหรือเช็คอิน ระบบจะยกเลิกการจองและปลดล็อคห้องโดยอัตโนมัติ
                 </p>
                 <div className="grid grid-cols-2 gap-3 mt-8">
                    <input placeholder="เลขห้อง" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="bg-white/20 p-4 rounded-2xl text-xs font-bold border-none placeholder:text-white/50" />
                    <input placeholder="ยอดรวม" value={amount} onChange={e => setAmount(e.target.value)} className="bg-white/20 p-4 rounded-2xl text-xs font-bold border-none placeholder:text-white/50" />
                 </div>
               </div>
               <button onClick={handleSaveQuickBooking} className="w-full bg-white text-amber-600 py-4 rounded-2xl font-black mt-8 shadow-xl hover:bg-slate-50 transition-all active:scale-95">ล็อคห้องทันที (1 ชม.)</button>
            </div>
          </div>
        )}
      </div>

      {isCameraOpen && <CameraCapture onCapture={handleOCRResult} onClose={() => setIsCameraOpen(false)} />}
      
      {showDoc !== 'NONE' && guest && (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                 <h3 className="font-black text-slate-800 uppercase tracking-tight">Document Preview</h3>
                 <button onClick={() => setShowDoc('NONE')} className="text-slate-400 font-bold hover:text-slate-600 px-4 transition-colors">✕ ปิด</button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100/50 p-10 flex justify-center">
                 <PrintableDocument guest={{ ...guest, customerType }} type={showDoc} amount={parseFloat(amount) || 0} roomNumber={roomNumber} description={description} resortInfo={resortInfo} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FrontDesk;
