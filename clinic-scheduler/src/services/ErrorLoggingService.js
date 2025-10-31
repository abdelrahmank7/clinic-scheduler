// src/services/ErrorLoggingService.js
import { db } from "../firebase"; // Import your Firebase instance
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const ERROR_LOG_COLLECTION = "error_logs"; // Name of the Firestore collection

export class ErrorLoggingService {
  /**
   * Logs an error to Firestore.
   * @param {string} message - The error message.
   * @param {string} stack - The error stack trace.
   * @param {string} location - Where the error occurred (e.g., component name, function name).
   * @param {string} level - Severity level (e.g., 'error', 'warning', 'info').
   * @param {object} extraInfo - Additional context (e.g., user ID, state, props).
   */
  static async logError(
    message,
    stack,
    location = "Unknown",
    level = "error",
    extraInfo = {}
  ) {
    try {
      console.log("Attempting to log error to Firestore:", {
        message,
        stack,
        location,
        level,
        extraInfo,
      }); // Debug log

      // Prepare the error document data
      const errorData = {
        message: message || "No message provided",
        stack: stack || "No stack trace provided",
        location: location,
        level: level,
        extraInfo: extraInfo, // Store additional context
        timestamp: serverTimestamp(), // Use Firestore server timestamp for accuracy
        userAgent: navigator.userAgent, // Capture browser info
        url: window.location.href, // Capture the current URL
        // Optionally, add user info if available
        // userId: user?.uid, // Requires access to user context
      };

      // Add the error document to Firestore
      const docRef = await addDoc(
        collection(db, ERROR_LOG_COLLECTION),
        errorData
      );
      console.log(
        "Error successfully logged to Firestore with ID: ",
        docRef.id
      ); // Success log
    } catch (err) {
      console.error("Failed to log error to Firestore:", err); // Error log
      // Optional: Try a fallback logging method here if Firestore fails
      // For example, send to console.error or a different service
      console.error("Original error data that failed to log:", {
        message,
        stack,
        location,
        level,
        extraInfo,
      });
    }
  }
}
