// src/services/appointment-request-service.js
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp, // Import Timestamp
} from "firebase/firestore";

export class AppointmentRequestService {
  static REQUEST_COLLECTION = "appointment_requests";

  // --- Client Side: Create Request ---
  static async createRequest(
    clientId,
    requestType,
    requestData,
    location = ""
  ) {
    try {
      const requestDoc = {
        clientId,
        requestType,
        status: "pending", // Default to pending
        requestData,
        location, // Store location as a top-level field
        createdAt: Timestamp.now(), // Use Firestore Timestamp
        // Optionally, include requester details here if not stored in 'clientId' ref
        // requesterName: ...,
        // requesterEmail: ...,
        // requesterPhone: ...,
      };

      const docRef = await addDoc(
        collection(db, this.REQUEST_COLLECTION),
        requestDoc
      );
      console.log("Appointment request created with ID: ", docRef.id);
      return { success: true, requestId: docRef.id };
    } catch (error) {
      console.error("Error creating appointment request: ", error);
      return { success: false, error: error.message };
    }
  }

  // --- Admin Side: Fetch Requests ---
  static async fetchRequests(statusFilter = null) {
    let q = query(
      collection(db, this.REQUEST_COLLECTION),
      orderBy("createdAt", "desc")
    ); // Order by creation time, newest first

    if (statusFilter && statusFilter !== "all") {
      q = query(q, where("status", "==", statusFilter));
    }
    // Optionally, add a filter for clientId if needed in the future
    // if (clientIdFilter) {
    //   q = query(q, where("clientId", "==", clientIdFilter));
    // }

    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate
          ? doc.data().createdAt.toDate()
          : doc.data().createdAt, // Convert Timestamp
        processedAt: doc.data().processedAt?.toDate
          ? doc.data().processedAt.toDate()
          : doc.data().processedAt, // Convert Timestamp
      }));
    } catch (error) {
      console.error("Error fetching appointment requests: ", error);
      throw error; // Re-throw to handle in the calling component
    }
  }

  // --- Admin Side: Approve/Reject Request (Keep existing logic) ---
  static async processRequest(requestId, action, adminUid, adminNotes = "") {
    // action should be 'approve' or 'reject'
    if (action !== "approve" && action !== "reject") {
      throw new Error("Invalid action. Use 'approve' or 'reject'.");
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const requestDocRef = doc(db, this.REQUEST_COLLECTION, requestId);

    try {
      await updateDoc(requestDocRef, {
        status: newStatus,
        processedAt: Timestamp.now(),
        processedBy: adminUid,
        adminNotes: adminNotes || "", // Ensure it's a string
      });

      // Note: The actual appointment action (create/reschedule/cancel) is not performed here
      // as per the new requirement. The admin handles it manually.

      console.log(`Request ${requestId} ${action}d.`);
      return { success: true };
    } catch (error) {
      console.error(`Error ${action}ing appointment request: `, error);
      return { success: false, error: error.message };
    }
  }

  // --- Admin Side: Mark Request as Completed (New) ---
  static async markRequestAsCompleted(requestId, adminUid, adminNotes = "") {
    const newStatus = "completed"; // Define the completed status
    const requestDocRef = doc(db, this.REQUEST_COLLECTION, requestId);

    try {
      await updateDoc(requestDocRef, {
        status: newStatus,
        processedAt: Timestamp.now(), // Use the same field for when it was completed
        processedBy: adminUid,
        adminNotes: adminNotes || "", // Allow notes for completion
      });

      console.log(`Request ${requestId} marked as completed.`);
      return { success: true };
    } catch (error) {
      console.error(`Error marking appointment request as completed: `, error);
      return { success: false, error: error.message };
    }
  }
}
