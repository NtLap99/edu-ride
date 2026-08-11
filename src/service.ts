import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Student, Vehicle } from './types';
export const storage = {
  students: (): Student[] => [],
  vehicles: (): Vehicle[] => [],
};
const textValue = (value: unknown, fallback = 'Chưa cập nhật') =>
  typeof value === 'string' && value.trim() ? value : fallback;
const normalizeStudent = (row: Record<string, unknown> | null | undefined): Student => {
  const source = row && typeof row === 'object' ? row : {};
  return {
    id: textValue(source.id, ''),
    name: textValue(source.name),
    className: textValue(source.className),
    school: textValue(source.school),
    pickup: textValue(source.pickup),
    parentName: textValue(source.parentName),
    parentPhone: textValue(source.parentPhone),
    startDate: textValue(source.startDate, new Date().toISOString().slice(0, 10)),
    vehicleId:
      typeof source.vehicleId === 'string' && source.vehicleId ? source.vehicleId : undefined,
    status: source.status === 'paused' ? 'paused' : 'active',
    paymentHistory:
      source.paymentHistory && typeof source.paymentHistory === 'object'
        ? (source.paymentHistory as Record<string, 'paid' | 'unpaid'>)
        : {},
    paymentAmounts:
      source.paymentAmounts && typeof source.paymentAmounts === 'object'
        ? (source.paymentAmounts as Record<string, number>)
        : {},
  };
};
const normalizeVehicle = (row: Record<string, unknown> | null | undefined): Vehicle => {
  const source = row && typeof row === 'object' ? row : {};
  return {
    id: textValue(source.id, ''),
    name: textValue(source.name),
    plate: textValue(source.plate),
    driver: textValue(source.driver),
    driverPhone: textValue(source.driverPhone),
    route: textValue(source.route),
    capacity: typeof source.capacity === 'number' && source.capacity > 0 ? source.capacity : 29,
    status: source.status === 'maintenance' ? 'maintenance' : 'active',
  };
};
const cleanRecord = (value: object) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
export async function addRecord<T extends object>(kind: 'students' | 'vehicles', value: T) {
  if (!db) throw new Error('Firebase chưa được cấu hình');
  const id = 'id' in value && typeof value.id === 'string' ? value.id : '';
  if (!id) throw new Error('Bản ghi chưa có ID');
  await setDoc(doc(db, kind, id), cleanRecord(value));
}
export async function updateRecord(kind: 'students' | 'vehicles', id: string, value: object) {
  if (!db) throw new Error('Firebase chưa được cấu hình');
  const ref = doc(db, kind, id);
  const payload = cleanRecord(value);
  try {
    await updateDoc(ref, payload);
  } catch {
    await setDoc(ref, payload, { merge: true });
  }
}
export async function deleteRecord(kind: 'students' | 'vehicles', id: string) {
  if (!db) throw new Error('Firebase chưa được cấu hình');
  await deleteDoc(doc(db, kind, id));
}
export function subscribe<T>(
  kind: 'students' | 'vehicles',
  fallback: T[],
  onData: (v: T[]) => void,
) {
  if (!db) return () => undefined;
  return onSnapshot(
    collection(db, kind),
    (snap) => {
      const rows = snap.docs.map((d) => {
        const raw = { id: d.id, ...d.data() } as Record<string, unknown>;
        return kind === 'students' ? normalizeStudent(raw) : normalizeVehicle(raw);
      });
      onData((snap.empty ? fallback : rows) as T[]);
    },
    () => onData(fallback),
  );
}
