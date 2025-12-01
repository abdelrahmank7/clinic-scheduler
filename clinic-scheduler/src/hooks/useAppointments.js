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

/**
 * Custom hook to fetch and manage appointments with filtering.
 *
 * @param {Object} calendarRange - Object with `start` and `end` Date properties for the date range.
 * @param {Array<string>} [selectedLocations=[]] - Optional array of location names to filter by.
 * @returns {Object} - Contains appointments array, loading state, error state, and helper functions.
 */
// The hook logic is centralized here. We can assume the passed calendarRange is correct for the mode.
export function useAppointments(calendarRange, selectedLocations = []) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Basic validation
    if (!calendarRange?.start || !calendarRange?.end) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Initial query structure
    let appointmentsQuery = query(
      collection(db, "appointments"),
      orderBy("start", "asc")
    );

    // Apply the date range filters.
    // This correctly handles the 'all' mode because DashboardPage.jsx
    // passes a very wide date range for start/end in that mode.
    appointmentsQuery = query(
      appointmentsQuery,
      where("start", ">=", calendarRange.start),
      where("start", "<=", calendarRange.end)
    );

    // Add location filtering if specific locations are provided
    if (selectedLocations.length > 0) {
      appointmentsQuery = query(
        appointmentsQuery,
        where("location", "in", selectedLocations) // Apply location filter
      );
    }

    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (querySnapshot) => {
        const appointmentsData = querySnapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            // Convert Firestore Timestamp to JS Date (safer check added)
            start: data.start?.toDate ? data.start.toDate() : data.start,
            end: data.end?.toDate ? data.end.toDate() : data.end,
          };
        });
        setAppointments(appointmentsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching appointments: ", err);
        setError("Failed to load appointments.");
        setLoading(false);
        setAppointments([]);
      }
    );
    return () => {
      unsubscribe(); // Clean up the listener
    };
  }, [calendarRange, selectedLocations]); // Depend on the range and locations

  // --- Helper Functions (Moved back to DashboardPage's useAppointments) ---
  // To avoid circular dependency and keep the hook focused on fetching/state,
  // we'll keep the update functions here, but they are simpler now.

  const updateAppointmentStatus = async (appointmentId, status) => {
    // ... (unchanged logic)
    if (!appointmentId) {
      console.error("Appointment ID is required to update status.");
      toast({
        title: "Update Failed",
        description: "Appointment ID is missing.",
        variant: "destructive",
      });
      return;
    }
    try {
      const appointmentDoc = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentDoc, { status });
      toast({
        title: "Appointment Status Updated",
        description: `Appointment marked as ${status}.`,
      });
    } catch (error) {
      console.error("Error updating appointment status: ", error);
      toast({
        title: "Update Failed",
        description: "Could not update appointment status.",
        variant: "destructive",
      });
    }
  };

  const resizeAppointment = async ({ event, start, end }) => {
    // ... (unchanged logic)
    if (!event?.id) {
      console.error("Valid event object with ID is required to resize.");
      toast({
        title: "Resize Failed",
        description: "Appointment data is invalid.",
        variant: "destructive",
      });
      return;
    }
    try {
      const appointmentDoc = doc(db, "appointments", event.id);
      await updateDoc(appointmentDoc, { start, end });
      toast({
        title: "Appointment Resized",
        description: "The appointment time has been updated.",
      });
    } catch (error) {
      console.error("Error resizing appointment: ", error);
      toast({
        title: "Update Failed",
        description: "Could not save the new appointment time.",
        variant: "destructive",
      });
    }
  };

  const moveAppointment = async ({ event, start, end }) => {
    // ... (unchanged logic)
    if (!event?.id) {
      console.error("Valid event object with ID is required to move.");
      toast({
        title: "Move Failed",
        description: "Appointment data is invalid.",
        variant: "destructive",
      });
      return;
    }
    try {
      const appointmentDoc = doc(db, "appointments", event.id);
      await updateDoc(appointmentDoc, { start, end });
      toast({
        title: "Appointment Moved",
        description: "The appointment has been moved successfully.",
      });
    } catch (error) {
      console.error("Error moving appointment: ", error);
      toast({
        title: "Update Failed",
        description: "Could not save the new appointment time.",
        variant: "destructive",
      });
    }
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

// // src/hooks/useAppointments.js
// import { useState, useEffect } from "react";
// import { db } from "../firebase";
// import {
//   collection,
//   query,
//   onSnapshot,
//   updateDoc,
//   doc,
//   where,
//   orderBy,
// } from "firebase/firestore";
// import { toast } from "@/components/ui/use-toast";
// // Remove the import for ClinicContext as it's no longer used directly here
// // import { useClinic } from "@/contexts/ClinicContext";

// /**
//  * Custom hook to fetch and manage appointments with filtering.
//  *
//  * @param {Object} calendarRange - Object with `start` and `end` Date properties for the date range.
//  * @param {Array<string>} [selectedLocations=[]] - Optional array of location names to filter by.
//  * @returns {Object} - Contains appointments array, loading state, error state, and helper functions.
//  */
// export function useAppointments(calendarRange, selectedLocations = []) {
//   const [appointments, setAppointments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   // Remove destructuring useClinic here as filtering is done via arguments

//   useEffect(() => {
//     // Check for required dependencies
//     if (!calendarRange?.start || !calendarRange?.end) {
//       setAppointments([]);
//       setError(null); // Clear previous errors if inputs are invalid
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null); // Clear previous errors before fetching

//     // Initial query structure - Filter by date range and locations if specified
//     let appointmentsQuery = query(
//       collection(db, "appointments"),
//       where("start", ">=", calendarRange.start),
//       where("start", "<=", calendarRange.end),
//       orderBy("start", "asc")
//     );

//     // Add location filtering if specific locations are provided
//     if (selectedLocations.length > 0) {
//       appointmentsQuery = query(
//         appointmentsQuery,
//         where("location", "in", selectedLocations) // Apply location filter
//       );
//     }
//     // If selectedLocations is empty, the query fetches all locations for the clinic

//     const unsubscribe = onSnapshot(
//       appointmentsQuery,
//       (querySnapshot) => {
//         const appointmentsData = querySnapshot.docs.map((d) => {
//           const data = d.data();
//           return {
//             id: d.id,
//             ...data,
//             start: data.start.toDate(), // Convert Firestore Timestamp
//             end: data.end.toDate(), // Convert Firestore Timestamp
//           };
//         });
//         setAppointments(appointmentsData);
//         setLoading(false);
//         setError(null); // Clear error state on successful fetch
//       },
//       (err) => {
//         console.error("Error fetching appointments: ", err);
//         setError("Failed to load appointments."); // Set a user-friendly error message
//         setLoading(false);
//         setAppointments([]); // Clear appointments on error
//       }
//     );
//     return () => {
//       unsubscribe(); // Clean up the listener
//     };
//   }, [calendarRange, selectedLocations]); // Dependencies for filtering

//   // --- Helper Functions (Remain Largely Unchanged) ---

//   const updateAppointmentStatus = async (appointmentId, status) => {
//     if (!appointmentId) {
//       console.error("Appointment ID is required to update status.");
//       toast({
//         title: "Update Failed",
//         description: "Appointment ID is missing.",
//         variant: "destructive",
//       });
//       return;
//     }
//     try {
//       const appointmentDoc = doc(db, "appointments", appointmentId);
//       await updateDoc(appointmentDoc, { status });
//       toast({
//         title: "Appointment Status Updated",
//         description: `Appointment marked as ${status}.`,
//       });
//     } catch (error) {
//       console.error("Error updating appointment status: ", error);
//       toast({
//         title: "Update Failed",
//         description: "Could not update appointment status.",
//         variant: "destructive",
//       });
//     }
//   };

//   const resizeAppointment = async ({ event, start, end }) => {
//     if (!event?.id) {
//       console.error("Valid event object with ID is required to resize.");
//       toast({
//         title: "Resize Failed",
//         description: "Appointment data is invalid.",
//         variant: "destructive",
//       });
//       return;
//     }
//     try {
//       const appointmentDoc = doc(db, "appointments", event.id);
//       await updateDoc(appointmentDoc, { start, end });
//       toast({
//         title: "Appointment Resized",
//         description: "The appointment time has been updated.",
//       });
//     } catch (error) {
//       console.error("Error resizing appointment: ", error);
//       toast({
//         title: "Update Failed",
//         description: "Could not save the new appointment time.",
//         variant: "destructive",
//       });
//     }
//   };

//   const moveAppointment = async ({ event, start, end }) => {
//     if (!event?.id) {
//       console.error("Valid event object with ID is required to move.");
//       toast({
//         title: "Move Failed",
//         description: "Appointment data is invalid.",
//         variant: "destructive",
//       });
//       return;
//     }
//     try {
//       const appointmentDoc = doc(db, "appointments", event.id);
//       await updateDoc(appointmentDoc, { start, end });
//       toast({
//         title: "Appointment Moved",
//         description: "The appointment has been moved successfully.",
//       });
//     } catch (error) {
//       console.error("Error moving appointment: ", error);
//       toast({
//         title: "Update Failed",
//         description: "Could not save the new appointment time.",
//         variant: "destructive",
//       });
//     }
//   };

//   return {
//     appointments,
//     loading,
//     error,
//     updateAppointmentStatus,
//     resizeAppointment,
//     moveAppointment,
//   };
// }
