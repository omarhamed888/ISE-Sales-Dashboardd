import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Course {
  id: string;
  name: string;
  shortCode: string;
  isActive: boolean;
  order: number;
}

export function useCourses(includeInactive = false) {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    const constraints: any[] = includeInactive
      ? [orderBy('order')]
      : [where('isActive', '==', true), orderBy('order')];

    const q = query(collection(db, 'courses'), ...constraints);
    return onSnapshot(q, snap => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Course[]);
    });
  }, [includeInactive]);
  return courses;
}
