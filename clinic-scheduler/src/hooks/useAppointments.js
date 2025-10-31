// src/hooks/useAppointments.js

import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  where,
  orderBy,
} from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

export function useAppointments(calendarRange) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!calendarRange?.start || !calendarRange?.end) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("start", ">=", calendarRange.start),
      where("start", "<=", calendarRange.end),
      orderBy("start", "asc")
    );

    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (querySnapshot) => {
        const appointmentsData = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          start: d.data().start.toDate(),
          end: d.data().end.toDate(),
        }));
        setAppointments(appointmentsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching appointments: ", err);
        setError("Failed to load appointments.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [calendarRange]);

  const updateAppointmentStatus = async (appointmentId, status) => {
    /* Function unchanged */
  };
  const resizeAppointment = async ({ event, start, end }) => {
    /* Function unchanged */
  };
  const moveAppointment = async ({ event, start, end }) => {
    /* Function unchanged */
  };

  return {
    appointments,
    loading,
    error,
    updateAppointmentStatus,
    resizeAppointment,
    moveAppointment,
  };
}
