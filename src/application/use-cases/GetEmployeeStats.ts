import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../infrastructure/firebase/config";

// 1. Tipado estricto libre de "any"
export interface ActivityItem {
  id: string;
  type: "ATTENDANCE" | "ABSENCE";
  date: string;
  isLate?: boolean;
  status?: string;
  reason?: string;
  notes?: string;
}

export class GetEmployeeStats {
  async execute(userId: string) {
    let totalAttendances = 0;
    let totalLates = 0;
    let totalAbsences = 0;
    const activities: ActivityItem[] = [];

    try {
      // Asistencias
      const attQ = query(
        collection(db, "attendance"),
        where("userId", "==", userId),
      );
      const attSnap = await getDocs(attQ);

      attSnap.forEach((doc) => {
        const data = doc.data();
        totalAttendances++;
        const hasLate = (data.periods || []).some(
          (p: { isLate?: boolean }) => p.isLate,
        );
        if (hasLate) totalLates++;

        activities.push({
          id: doc.id,
          type: "ATTENDANCE",
          date: data.date,
          isLate: hasLate,
          status: data.status,
        });
      });

      // Faltas / Permisos
      const absQ = query(
        collection(db, "absences"),
        where("userId", "==", userId),
      );
      const absSnap = await getDocs(absQ);

      absSnap.forEach((doc) => {
        const data = doc.data();
        totalAbsences++;
        activities.push({
          id: doc.id,
          type: "ABSENCE",
          date: data.startDate,
          reason: data.type,
          notes: data.notes,
        });
      });

      activities.sort((a, b) => b.date.localeCompare(a.date));

      return {
        stats: { totalAttendances, totalLates, totalAbsences },
        recentActivity: activities.slice(0, 5),
      };
    } catch (error) {
      console.error("Error al obtener estadísticas del empleado:", error);
      throw error;
    }
  }
}
