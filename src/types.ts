export type PaymentStatus = 'paid' | 'unpaid';
export type StudentStatus = 'active' | 'paused';
export interface Student {
  id: string;
  name: string;
  className: string;
  school: string;
  pickup: string;
  parentName?: string;
  parentPhone: string;
  startDate: string;
  vehicleId?: string;
  status: StudentStatus;
  paymentHistory: Record<string, PaymentStatus>;
  paymentAmounts?: Record<string, number>;
}
export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  driver: string;
  driverPhone: string;
  route: string;
  capacity: number;
  status: 'active' | 'maintenance';
}
export const schools = [
  'Trường Tam Phước',
  'Trường Trấn Biên',
  'Trường Hòa Bình - Sáng',
  'Trường Hòa Bình - Chiều',
  'Trường Thực Hành Sư Phạm',
  'Trường Bình Đa',
];
export const quarters = [
  {
    key: 'q1',
    label: 'Quý 1',
    months: ['2026-09', '2026-10', '2026-11'],
    display: 'T9 · T10 · T11',
  },
  {
    key: 'q2',
    label: 'Quý 2',
    months: ['2026-12', '2027-01', '2027-02'],
    display: 'T12 · T1 · T2',
  },
  { key: 'q3', label: 'Quý 3', months: ['2027-03', '2027-04', '2027-05'], display: 'T3 · T4 · T5' },
];
