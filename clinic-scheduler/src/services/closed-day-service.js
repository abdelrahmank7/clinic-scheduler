// src/services/closed-day-service.js

import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc, // Keep if you still need to remove old closed days concept
  doc,
  query,
  where,
  Timestamp,
  orderBy, // Add for sorting closures
  limit,
  startAt,
  endAt,
} from "firebase/firestore";

// ... keep existing addClosedDay, getClosedDays, deleteClosedDay if still needed for the original 'closed days' concept ...

// NEW: Functions for the revenue closure feature
const DAILY_CLOSURES_COLLECTION = "dailyClosures"; // New collection name

export async function recordDailyClosure(
  date,
  expectedRevenue,
  confirmedRevenue,
  notes = ""
) {
  // date: JS Date object representing the day closed
  // expectedRevenue: Calculated amount
  // confirmedRevenue: User-entered amount
  // notes: Optional user notes

  const closureRecord = {
    date: Timestamp.fromDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate())
    ), // Store date only
    expectedRevenue: Number(expectedRevenue) || 0,
    confirmedRevenue: Number(confirmedRevenue) || 0,
    notes: notes || "",
    closedAt: Timestamp.now(),
    // closedBy: auth.currentUser?.uid // Add if tracking user
  };

  try {
    const docRef = await addDoc(
      collection(db, DAILY_CLOSURES_COLLECTION),
      closureRecord
    );
    console.log("Daily closure recorded with ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error recording daily closure: ", error);
    return { success: false, error: error.message };
  }
}

export async function getDailyClosures({ start, end, limit: lim } = {}) {
  // Optionally filter by date range and limit results
  let q = query(
    collection(db, DAILY_CLOSURES_COLLECTION),
    orderBy("date", "desc")
  ); // Order by date descending by default

  if (start && end) {
    // Ensure we query for the start of the start date and end of the end date
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    q = query(
      q,
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate))
    );
  }

  if (lim && lim > 0) {
    q = query(q, limit(lim));
  }

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(), // Convert Firestore Timestamp back to JS Date
      closedAt: doc.data().closedAt.toDate(), // Convert if needed
    }));
  } catch (error) {
    console.error("Error fetching daily closures: ", error);
    throw error; // Re-throw to handle in the calling component
  }
}

// Optional: Add a function to check if a specific day is already closed
export async function checkIfDayClosed(date) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  const nextDay = new Date(dateOnly);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, DAILY_CLOSURES_COLLECTION),
    where("date", ">=", Timestamp.fromDate(dateOnly)),
    where("date", "<", Timestamp.fromDate(nextDay))
  );

  try {
    const snapshot = await getDocs(q);
    return !snapshot.empty; // Returns true if a closure record exists for the date
  } catch (error) {
    console.error("Error checking if day is closed: ", error);
    return false; // Assume not closed if there's an error
  }
}

// Optional: Add a function to get the latest closure record
export async function getLatestClosure() {
  const q = query(
    collection(db, DAILY_CLOSURES_COLLECTION),
    orderBy("date", "desc"),
    limit(1) // Get the most recent one
  );

  try {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        closedAt: doc.data().closedAt.toDate(), // Convert if needed
      };
    }
    return null; // No closures found
  } catch (error) {
    console.error("Error fetching latest closure: ", error);
    throw error;
  }
}
