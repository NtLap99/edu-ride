import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { initialStudents, mockVehicles } from './data';
import type { Student, Vehicle } from './types';
const read = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};
const STUDENT_DATA_VERSION = 'eduride-students-v2';
export const storage = {
  students: () => {
    const isCurrent = localStorage.getItem(STUDENT_DATA_VERSION) === 'ready';
    if (!isCurrent) {
      localStorage.setItem(STUDENT_DATA_VERSION, 'ready');
      localStorage.removeItem('eduride_students');
      return initialStudents.map((item) =>
        normalizeStudent(item as unknown as Record<string, unknown>),
      );
    }
    const value = read<unknown>('eduride_students', initialStudents);
    return (Array.isArray(value) ? value : initialStudents).map((item) =>
      normalizeStudent(item as Record<string, unknown>),
    );
  },
  vehicles: () => {
    const value = read<unknown>('eduride_vehicles', mockVehicles);
    return (Array.isArray(value) ? value : mockVehicles).map((item) =>
      normalizeVehicle(item as Record<string, unknown>),
    );
  },
  saveStudents: (v: Student[]) => localStorage.setItem('eduride_students', JSON.stringify(v)),
  saveVehicles: (v: Vehicle[]) => localStorage.setItem('eduride_vehicles', JSON.stringify(v)),
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
  if (db)
    try {
      await addDoc(collection(db, kind), cleanRecord(value));
      return;
    } catch {
      /* fallback */
    }
}
export async function updateRecord(kind: 'students' | 'vehicles', id: string, value: object) {
  if (!db) return;
  const ref = doc(db, kind, id);
  const payload = cleanRecord(value);
  try {
    await updateDoc(ref, payload);
  } catch {
    try {
      await setDoc(ref, payload, { merge: true });
    } catch {
      // Firestore update fallback failed; localStorage remains the local fallback.
    }
  }
}
export async function deleteRecord(kind: 'students' | 'vehicles', id: string) {
  if (db)
    try {
      await deleteDoc(doc(db, kind, id));
      return;
    } catch {
      // Ignore delete errors when Firestore is unavailable.
    }
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
export async function seedDefaultVehicles() {
  const firestore = db;
  if (!firestore) return false;
  try {
    const snapshot = await getDocs(collection(firestore, 'vehicles'));
    if (!snapshot.empty) return false;
    const batch = writeBatch(firestore);
    mockVehicles.forEach((vehicle) => batch.set(doc(firestore, 'vehicles', vehicle.id), vehicle));
    await batch.commit();
    return true;
  } catch {
    return false;
  }
}
export async function seedProvidedStudents() {
  const firestore = db;
  if (!firestore || localStorage.getItem('eduride-firestore-students-v2') === 'ready') return false;
  try {
    const snapshot = await getDocs(collection(firestore, 'students'));
    const batch = writeBatch(firestore);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    initialStudents.forEach((student) =>
      batch.set(doc(firestore, 'students', student.id), student),
    );
    await batch.commit();
    localStorage.setItem('eduride-firestore-students-v2', 'ready');
    storage.saveStudents(initialStudents);
    return true;
  } catch {
    return false;
  }
}
