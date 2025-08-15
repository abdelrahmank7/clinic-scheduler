// src/lib/appointment-validation.js

import { z } from "zod";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Zod schema for validating the appointment form.
 * This replaces all manual validation checks.
 */
export const appointmentSchema = z
  .object({
    clientId: z.string().min(1, { message: "Client is required." }),
    clientName: z.string(), // We'll add this manually, not from the form
    title: z.string({ required_error: "Please select a title." }),
    start: z
      .string()
      .min(1, { message: "Start time is required." })
      .transform((date) => new Date(date)),
    end: z
      .string()
      .min(1, { message: "End time is required." })
      .transform((date) => new Date(date)),
    notes: z.string().optional(),
    userId: z.string(), // Passed in for validation and saving
  })
  .refine(
    (data) => {
      // Ensure start time is not in the past (allowing a 1-minute grace period)
      const now = new Date();
      now.setMinutes(now.getMinutes() - 1);
      return data.start >= now;
    },
    {
      message: "Start time cannot be in the past.",
      path: ["start"], // Attach the error to the 'start' field
    }
  )
  .refine((data) => data.end > data.start, {
    message: "End time must be after start time.",
    path: ["end"],
  })
  .refine(
    (data) => {
      // Check for minimum appointment duration (e.g., 15 minutes)
      const durationMinutes = (data.end - data.start) / (1000 * 60);
      return durationMinutes >= 15;
    },
    {
      message: "Appointment must be at least 15 minutes.",
      path: ["end"],
    }
  );

/**
 * Checks for overlapping appointments for a specific client.
 * @param {object} data - The validated form data from Zod.
 * @param {string | null} appointmentId - The ID of the appointment being edited, if any.
 * @returns {Promise<boolean>} - True if a conflict exists, false otherwise.
 */
export const checkForConflicts = async (data, appointmentId = null) => {
  const { clientId, start, end, userId } = data;
  if (!userId) return false; // Cannot check without userId

  try {
    const appointmentsRef = collection(db, "appointments");
    const q = query(
      appointmentsRef,
      where("clientId", "==", clientId),
      where("userId", "==", userId),
      // Optimization: Fetch only potentially conflicting appointments
      where("start", "<", end)
    );

    const querySnapshot = await getDocs(q);
    const hasConflict = querySnapshot.docs.some((docSnapshot) => {
      // Skip checking against itself if editing
      if (appointmentId && docSnapshot.id === appointmentId) return false;

      const existingAppt = docSnapshot.data();
      const docEnd = existingAppt.end.toDate();

      // Check for overlap: (StartA < EndB) and (EndA > StartB)
      // We already checked start < end in the query, so we just need to check the other half.
      return docEnd > start;
    });

    return hasConflict;
  } catch (error) {
    console.error("Error checking for appointment conflicts:", error);
    // Fail gracefully, don't prevent saving due to a check error
    return false;
  }
};
