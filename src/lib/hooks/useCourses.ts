import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
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
    // Fetch all courses without compound query (avoids composite index requirement)
    return onSnapshot(collection(db, 'courses'), snap => {
      let all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Course[];
      // Filter & sort client-side
      if (!includeInactive) all = all.filter(c => c.isActive);
      all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setCourses(all);
    });
  }, [includeInactive]);
  return courses;
}

