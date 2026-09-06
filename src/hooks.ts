import { useEffect, useState } from 'react';
import { storage, subscribe } from './service';
import type { Student, Vehicle } from './types';
export function useEduRideData() {
  const [students, setStudents] = useState<Student[]>(storage.students);
  const [vehicles, setVehicles] = useState<Vehicle[]>(storage.vehicles);
  useEffect(() => {
    const a = subscribe<Student>('students', storage.students(), setStudents, (error) => {
      console.error('[EduRide] Students Firebase error:', error);
    });
    const b = subscribe<Vehicle>('vehicles', storage.vehicles(), setVehicles, (error) => {
      console.error('[EduRide] Vehicles Firebase error:', error);
    });
    return () => {
      a();
      b();
    };
  }, []);
  return { students, setStudents, vehicles, setVehicles };
}
