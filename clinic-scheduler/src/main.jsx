// clinic-scheduler/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// --- Import the ErrorLoggingService ---
import { ErrorLoggingService } from "./services/ErrorLoggingService"; // Import the service

// --- Capture Global JavaScript Errors ---
window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error);
  ErrorLoggingService.logError(
    event.error.message,
    event.error.stack,
    "Global Window Error",
    "error",
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }
  );
});

// --- Capture Unhandled Promise Rejections ---
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection caught:", event.reason);
  let message = "Unhandled Promise Rejection";
  let stack = "No stack trace available";
  if (event.reason instanceof Error) {
    message = event.reason.message;
    stack = event.reason.stack;
  } else {
    message = String(event.reason); // Convert non-error objects to string
  }
  ErrorLoggingService.logError(
    message,
    stack,
    "Global Unhandled Rejection",
    "error",
    {
      promise: event.promise, // The rejected promise object
      reason: event.reason, // The rejection reason
    }
  );
  // Note: Preventing the default might suppress browser console logs.
  // event.preventDefault(); // Uncomment if you want to suppress browser logs
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
