import { useEffect, useState } from 'react';
import { seedDefaultVehicles, seedProvidedStudents, storage, subscribe } from './service';
import type { Student, Vehicle } from './types';
export function useEduRideData() {
  const [students, setStudents] = useState<Student[]>(storage.students);
  const [vehicles, setVehicles] = useState<Vehicle[]>(storage.vehicles);
  useEffect(() => {
    void seedProvidedStudents();
    void seedDefaultVehicles();
    const a = subscribe<Student>('students', storage.students(), setStudents);
    const b = subscribe<Vehicle>('vehicles', storage.vehicles(), setVehicles);
    return () => {
      a();
      b();
    };
  }, []);
  return { students, setStudents, vehicles, setVehicles };
}
