import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Course {
  id: string;
  name: string;
  shortCode: string;
  isActive: boolean;
  order: number;
  /** Share of a deal's value this course actually earns the company (0–100). Absent ⇒ 100%. */
  profitPercentage?: number;
}

let coursesCache: Course[] | null = null;

export function useCourses(includeInactive = false) {
  const [courses, setCourses] = useState<Course[]>(coursesCache ?? []);
  useEffect(() => {
    // Fetch all courses without compound query (avoids composite index requirement)
    return onSnapshot(
      collection(db, 'courses'),
      snap => {
        let all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Course[];
        // Filter & sort client-side
        if (!includeInactive) all = all.filter(c => c.isActive);
        all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        coursesCache = all;
        setCourses(all);
      },
      err => {
        console.error("courses listener:", err);
        setCourses([]);
      }
    );
  }, [includeInactive]);
  return courses;
}

