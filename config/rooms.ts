// Room Configuration
export interface RoomType {
  id: string;
  name: string;
  pricePerNight: number;
  rooms: string[]; // Room numbers
  description?: string;
  capacity?: number;
}

export const DEFAULT_ROOM_TYPES: RoomType[] = [
  {
    id: 'standard',
    name: 'Standard',
    pricePerNight: 1500,
    rooms: ['101', '102', '103', '104', '105'],
    description: 'ห้องพักมาตรฐาน',
    capacity: 2
  },
  {
    id: 'deluxe',
    name: 'Deluxe',
    pricePerNight: 2500,
    rooms: ['201', '202', '203', '204'],
    description: 'ห้องพักระดับดีลักซ์',
    capacity: 2
  },
  {
    id: 'suite',
    name: 'Suite',
    pricePerNight: 4000,
    rooms: ['301', '302'],
    description: 'ห้องสวีท',
    capacity: 4
  },
  {
    id: 'villa',
    name: 'Villa',
    pricePerNight: 6000,
    rooms: ['V1', 'V2', 'V3'],
    description: 'วิลล่าส่วนตัว',
    capacity: 6
  }
];

// Helper function to get room type by room number
export function getRoomTypeByNumber(roomNumber: string): RoomType | undefined {
  return DEFAULT_ROOM_TYPES.find(type =>
    type.rooms.includes(roomNumber)
  );
}

// Helper function to calculate nights between dates
export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper function to calculate total amount
export function calculateTotalAmount(roomNumber: string, checkIn: string, checkOut: string): number {
  const roomType = getRoomTypeByNumber(roomNumber);
  if (!roomType) return 0;

  const nights = calculateNights(checkIn, checkOut);
  return roomType.pricePerNight * nights;
}

// Helper function to calculate deposit (30% of total)
export function calculateDeposit(totalAmount: number): number {
  return Math.round(totalAmount * 0.3);
}
