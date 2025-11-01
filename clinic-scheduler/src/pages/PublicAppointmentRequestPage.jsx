// src/pages/PublicAppointmentRequestPage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion"; // Import framer-motion
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  MessageCircle,
  CheckCircle,
} from "lucide-react";

// --- IMAGE CONFIGURATION ---
// Centralize image paths and settings for easy modification
const IMAGE_CONFIG = {
  // --- BACKGROUND IMAGES ---
  // Place these images in your `public/images/` folder
  // Example: public/images/bg_sports1.jpg
  backgroundImages: [
    "/images/bg_sports1.jpg", // <-- Replace with your actual image paths
    "/images/bg_nutrition1.jpg", // <-- Replace with your actual image paths
    // Add more background image paths here
    // "/images/bg_sports2.jpg",
    // "/images/bg_nutrition2.jpg",
  ],
  // Probability weights for background images (optional, for weighted random selection)
  // If not provided, images are selected uniformly at random
  backgroundImageWeights: [1, 1], // Example: 50% chance for each of the two images above

  // --- DECORATIVE ELEMENTS (Optional) ---
  // Place these images in your `public/images/` folder
  // Example: public/images/deco_leaf.png
  decorativeCornerImage: "/images/deco_leaf.png", // <-- Replace with your actual path or set to null
  decorativeCenterImage: null, // Example: "/images/logo_small.png" or null to disable

  // --- STYLING OPTIONS ---
  backgroundOpacity: 0.2, // Opacity of the background image (0.0 to 1.0)
  backgroundAnimationDuration: 10, // Duration of the background zoom/fade animation in seconds
  overlayDarkness: "bg-black/70", // Class for the dark overlay (adjust darkness with /10, /20, ..., /90)
};

// --- HELPER FUNCTION FOR WEIGHTED RANDOM SELECTION ---
function weightedRandomIndex(weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random < 0) {
      return i;
    }
  }
  return weights.length - 1; // Fallback
}

const PublicAppointmentRequestPage = () => {
  const [formData, setFormData] = useState({
    requesterName: "",
    requesterPhone: "",
    requesterEmail: "",
    requestType: "create", // Default to new appointment
    appointmentTitle: "Nutrition Consultation", // Default title
    appointmentNotes: "",
    existingAppointmentId: "", // For reschedule/cancel
    otherRequestDetails: "", // For 'other' request type
    location: "",
  });
  const [availableLocations, setAvailableLocations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  // --- SELECT A RANDOM BACKGROUND IMAGE ON MOUNT ---
  const [randomBgImage] = useState(() => {
    const { backgroundImages, backgroundImageWeights } = IMAGE_CONFIG;
    if (backgroundImages.length === 0) return null;

    let index;
    if (
      backgroundImageWeights &&
      backgroundImageWeights.length === backgroundImages.length
    ) {
      index = weightedRandomIndex(backgroundImageWeights);
    } else {
      index = Math.floor(Math.random() * backgroundImages.length);
    }
    return backgroundImages[index];
  });

  // Fetch available locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Simple query assuming locations are public or accessible to unauthenticated users
        // Adjust if needed based on your security rules or data structure
        const locationsSnapshot = await getDocs(collection(db, "locations"));
        const locationsList = locationsSnapshot.docs.map((doc) => doc.id); // Assuming location ID is the name
        setAvailableLocations(locationsList);
        if (locationsList.length > 0) {
          setFormData((prev) => ({ ...prev, location: locationsList[0] })); // Default to first location
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
        toast({
          title: "Error Loading Locations",
          description: "Could not load clinic locations. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchLocations();
  }, [toast]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (valueOrEvent, name) => {
    let nameToUse = name;
    let valueToUse = valueOrEvent;
    if (typeof valueOrEvent === "object" && valueOrEvent.target) {
      nameToUse = valueOrEvent.target.name || valueOrEvent.target.id;
      valueToUse = valueOrEvent.target.value;
    }
    setFormData((prev) => ({ ...prev, [nameToUse]: valueToUse }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.requesterName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide your name.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.requesterPhone.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide your phone number.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for email if provided
    if (
      formData.requesterEmail &&
      !/\S+@\S+\.\S+/.test(formData.requesterEmail)
    ) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.requestType === "create" &&
      !formData.appointmentTitle.trim()
    ) {
      toast({
        title: "Validation Error",
        description: "Please provide an appointment title.",
        variant: "destructive",
      });
      return;
    }

    if (
      (formData.requestType === "reschedule" ||
        formData.requestType === "cancel") &&
      !formData.existingAppointmentId.trim()
    ) {
      toast({
        title: "Validation Error",
        description: "Please provide the ID of the appointment.",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.requestType === "other" &&
      !formData.otherRequestDetails.trim()
    ) {
      toast({
        title: "Validation Error",
        description: "Please provide details for your request.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setSuccess(false);

    try {
      let requestDataPayload = {};

      switch (formData.requestType) {
        case "create":
          requestDataPayload = {
            title: formData.appointmentTitle.trim(),
            notes: formData.appointmentNotes.trim(),
          };
          break;
        case "reschedule":
          requestDataPayload = {
            appointmentId: formData.existingAppointmentId.trim(),
            reason:
              formData.appointmentNotes.trim() || "Requested via public form",
          };
          break;
        case "cancel":
          requestDataPayload = {
            appointmentId: formData.existingAppointmentId.trim(),
            reason:
              formData.appointmentNotes.trim() || "Requested via public form",
          };
          break;
        case "other":
          requestDataPayload = { details: formData.otherRequestDetails.trim() };
          break;
        default:
          throw new Error("Invalid request type.");
      }

      const requestData = {
        requesterName: formData.requesterName.trim(),
        requesterPhone: formData.requesterPhone.trim(),
        requesterEmail: formData.requesterEmail.trim() || "",
        requestType: formData.requestType,
        status: "pending",
        requestData: requestDataPayload,
        location: formData.location || "",
        createdAt: new Date(),
      };

      await addDoc(collection(db, "appointment_requests"), requestData);

      setSuccess(true);
      toast({
        title: "Request Submitted",
        description:
          "Your appointment request has been submitted successfully. Our team will review it and contact you soon.",
      });

      // Optional: Reset form on success
      // setFormData({
      //   requesterName: "",
      //   requesterPhone: "",
      //   requesterEmail: "",
      //   requestType: "create",
      //   appointmentTitle: "Nutrition Consultation",
      //   appointmentNotes: "",
      //   existingAppointmentId: "",
      //   otherRequestDetails: "",
      //   location: availableLocations[0] || "",
      // });
    } catch (error) {
      console.error("Error submitting public appointment request:", error);
      toast({
        title: "Submission Failed",
        description:
          error.message ||
          "An error occurred while submitting your request. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Delay each child animation
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    // --- Outer Container with Background and Flex Centering ---
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* --- Background Image with Parallax/Motion Effect --- */}
      {randomBgImage && (
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: IMAGE_CONFIG.backgroundOpacity }} // Use configured opacity
          transition={{
            duration: IMAGE_CONFIG.backgroundAnimationDuration,
            ease: "easeOut",
          }} // Use configured duration
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${randomBgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      {/* --- Dark overlay for better text readability --- */}
      <div
        className={`absolute inset-0 z-10 ${IMAGE_CONFIG.overlayDarkness}`}
      ></div>{" "}
      {/* Use configured overlay darkness */}
      {/* --- Foreground Content --- */}
      <div className="relative z-20 w-full min-h-screen p-2 sm:p-4 md:p-6 flex items-center justify-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-2xl" // Max width for larger screens
        >
          {/* --- Hero/Header Section (Animated) --- */}
          <motion.div
            variants={fadeInUp}
            className="text-center mb-4 sm:mb-6 px-2 sm:px-4" // Responsive padding
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 p-2 sm:p-3 mb-2 sm:mb-3" // Responsive padding
            >
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />{" "}
              {/* Responsive icon size */}
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white" // Responsive text size and white for contrast
            >
              Request Your Appointment
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="mt-1 sm:mt-2 text-sm sm:text-base md:text-lg text-white/90" // Responsive text size and lighter white
            >
              We're here to help. Fill out the form and we'll get back to you
              soon.
            </motion.p>
            {/* --- ADD ADMIN LOGIN BUTTON --- */}
            <motion.div variants={itemVariants} className="mt-2 sm:mt-3">
              <Button
                variant="outline" // Use an outline button to make it less prominent
                size="sm" // Use a smaller size
                onClick={() => (window.location.href = "/admin-login")} // Navigate to the new admin login route
                className="text-xs sm:text-sm text-white/90 border-white/30 hover:bg-white/10" // Style for visibility on dark background
              >
                Admin Login
              </Button>
            </motion.div>
            {/* --- END ADD ADMIN LOGIN BUTTON --- */}
          </motion.div>

          {/* --- Main Card (Animated Entry) --- */}
          <motion.div
            variants={fadeInUp}
            className="w-full" // Full width on small screens, constrained by max-w-2xl on larger
          >
            <Card className="w-full shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm relative overflow-hidden">
              {" "}
              {/* Enhanced card style with blur */}
              {/* --- Decorative Image in Card Corner (Example) --- */}
              {IMAGE_CONFIG.decorativeCornerImage && (
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-10 sm:opacity-20 pointer-events-none">
                  {" "}
                  {/* Responsive size and opacity */}
                  <img
                    src={IMAGE_CONFIG.decorativeCornerImage}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              {/* --- Decorative Image in Card Center (Example, behind content) --- */}
              {IMAGE_CONFIG.decorativeCenterImage && (
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none z-0">
                  <img
                    src={IMAGE_CONFIG.decorativeCenterImage}
                    alt=""
                    className="w-1/3 h-auto object-contain"
                  />
                </div>
              )}
              <CardHeader className="text-center bg-primary/5 dark:bg-primary/10 rounded-t-lg pb-3 sm:pb-4 relative z-10">
                {" "}
                {/* z-10 to ensure it's above decor images */}
                <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center justify-center gap-2 text-primary">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />{" "}
                  {/* Responsive icon size */}
                  Let's Get Started
                </CardTitle>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
                  Please provide your details and request type.
                </p>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 relative z-10">
                {success ? (
                  // --- Success State with Animation ---
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-center py-6 sm:py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 300,
                      }}
                      className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 p-3 sm:p-4 mb-3 sm:mb-4"
                    >
                      <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-600 dark:text-green-400" />{" "}
                      {/* Responsive icon size */}
                    </motion.div>
                    <motion.h3
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-xl sm:text-2xl font-semibold mb-2 text-foreground"
                    >
                      Request Received!
                    </motion.h3>
                    <motion.p
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4"
                    >
                      Thank you for your submission. We will review your request
                      and get back to you as soon as possible.
                    </motion.p>
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        onClick={() => setSuccess(false)}
                        className="mt-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base"
                      >
                        Submit Another Request
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  // --- Form (Animated) --- */}
                  <motion.form
                    onSubmit={handleSubmit}
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="space-y-4 sm:space-y-5 md:space-y-6" // Responsive vertical spacing
                  >
                    {/* --- Client Identification --- */}
                    <motion.div
                      variants={itemVariants}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
                    >
                      {" "}
                      {/* Responsive grid and gap */}
                      <div className="space-y-1.5 sm:space-y-2">
                        {" "}
                        {/* Responsive vertical spacing */}
                        <Label
                          htmlFor="requesterName"
                          className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                        >
                          {" "}
                          {/* Responsive label size and gap */}
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />{" "}
                          {/* Responsive icon size */}
                          Full Name *
                        </Label>
                        <Input
                          id="requesterName"
                          value={formData.requesterName}
                          onChange={handleChange}
                          placeholder="Enter your full name"
                          required
                          className="bg-background text-xs sm:text-sm" // Responsive input text size
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label
                          htmlFor="requesterPhone"
                          className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                        >
                          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          Phone Number *
                        </Label>
                        <Input
                          id="requesterPhone"
                          type="tel"
                          value={formData.requesterPhone}
                          onChange={handleChange}
                          placeholder="e.g., +1234567890"
                          required
                          className="bg-background text-xs sm:text-sm"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="space-y-1.5 sm:space-y-2"
                    >
                      <Label
                        htmlFor="requesterEmail"
                        className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                      >
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        Email Address (Optional)
                      </Label>
                      <Input
                        id="requesterEmail"
                        type="email"
                        value={formData.requesterEmail}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                        className="bg-background text-xs sm:text-sm"
                      />
                    </motion.div>

                    {/* --- Location Selection --- */}
                    {availableLocations.length > 0 && (
                      <motion.div
                        variants={itemVariants}
                        className="space-y-1.5 sm:space-y-2"
                      >
                        <Label
                          htmlFor="location"
                          className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                        >
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          Preferred Clinic Location
                        </Label>
                        <Select
                          value={formData.location}
                          onValueChange={(value) =>
                            handleSelectChange(value, "location")
                          }
                        >
                          <SelectTrigger
                            id="location"
                            className="bg-background text-xs sm:text-sm"
                          >
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLocations.map((loc) => (
                              <SelectItem
                                key={loc}
                                value={loc}
                                className="text-xs sm:text-sm"
                              >
                                {loc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}

                    {/* --- Request Type Selection --- */}
                    <motion.div
                      variants={itemVariants}
                      className="space-y-1.5 sm:space-y-2"
                    >
                      <Label
                        htmlFor="requestType"
                        className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        Request Type *
                      </Label>
                      <Select
                        value={formData.requestType}
                        onValueChange={(value) =>
                          handleSelectChange(value, "requestType")
                        }
                      >
                        <SelectTrigger
                          id="requestType"
                          className="bg-background text-xs sm:text-sm"
                        >
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="create"
                            className="text-xs sm:text-sm"
                          >
                            New Appointment
                          </SelectItem>
                          <SelectItem
                            value="reschedule"
                            className="text-xs sm:text-sm"
                          >
                            Reschedule Existing Appointment
                          </SelectItem>
                          <SelectItem
                            value="cancel"
                            className="text-xs sm:text-sm"
                          >
                            Cancel Existing Appointment
                          </SelectItem>
                          <SelectItem
                            value="other"
                            className="text-xs sm:text-sm"
                          >
                            Other Request/Inquiry
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </motion.div>

                    {/* --- Conditional Fields Based on Request Type --- */}

                    {/* New Appointment Fields */}
                    {formData.requestType === "create" && (
                      <>
                        <motion.div
                          variants={itemVariants}
                          className="space-y-1.5 sm:space-y-2"
                        >
                          <Label
                            htmlFor="appointmentTitle"
                            className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                          >
                            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                            Appointment Title *
                          </Label>
                          <Input
                            id="appointmentTitle"
                            value={formData.appointmentTitle}
                            onChange={handleChange}
                            placeholder="e.g., Nutrition Consultation, Follow-up"
                            required
                            className="bg-background text-xs sm:text-sm"
                          />
                        </motion.div>
                        <motion.div
                          variants={itemVariants}
                          className="space-y-1.5 sm:space-y-2"
                        >
                          <Label
                            htmlFor="appointmentNotes_create"
                            className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                          >
                            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                            Notes (Optional)
                          </Label>
                          <Textarea
                            id="appointmentNotes_create"
                            value={formData.appointmentNotes}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                appointmentNotes: e.target.value,
                              }))
                            }
                            placeholder="Any specific requests, symptoms, or information..."
                            rows={3}
                            className="bg-background text-xs sm:text-sm"
                          />
                        </motion.div>
                      </>
                    )}

                    {/* Reschedule/CANCEL Fields */}
                    {(formData.requestType === "reschedule" ||
                      formData.requestType === "cancel") && (
                      <motion.div
                        variants={itemVariants}
                        className="space-y-3 sm:space-y-4"
                      >
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label
                            htmlFor="existingAppointmentId"
                            className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                          >
                            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                            {formData.requestType === "reschedule"
                              ? "Appointment ID to Reschedule *"
                              : "Appointment ID to Cancel *"}
                          </Label>
                          <Input
                            id="existingAppointmentId"
                            value={formData.existingAppointmentId}
                            onChange={handleChange}
                            placeholder="Enter the ID of your existing appointment"
                            required
                            className="bg-background text-xs sm:text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            You can find the Appointment ID in your confirmation
                            message or by contacting us.
                          </p>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label
                            htmlFor={`appointmentNotes_${formData.requestType}`}
                            className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                          >
                            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                            {formData.requestType === "reschedule"
                              ? "Reason for Rescheduling (Optional)"
                              : "Reason for Cancellation (Optional)"}
                          </Label>
                          <Textarea
                            id={`appointmentNotes_${formData.requestType}`}
                            value={formData.appointmentNotes}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                appointmentNotes: e.target.value,
                              }))
                            }
                            placeholder={
                              formData.requestType === "reschedule"
                                ? "Briefly explain why you need to reschedule..."
                                : "Briefly explain why you need to cancel..."
                            }
                            rows={2}
                            className="bg-background text-xs sm:text-sm"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Other Request Fields */}
                    {formData.requestType === "other" && (
                      <motion.div
                        variants={itemVariants}
                        className="space-y-1.5 sm:space-y-2"
                      >
                        <Label
                          htmlFor="otherRequestDetails"
                          className="flex items-center gap-1.5 sm:gap-2 text-foreground text-xs sm:text-sm"
                        >
                          <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          Request Details *
                        </Label>
                        <Textarea
                          id="otherRequestDetails"
                          value={formData.otherRequestDetails}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              otherRequestDetails: e.target.value,
                            }))
                          }
                          placeholder="Please describe your request or inquiry in detail..."
                          rows={4}
                          required
                          className="bg-background text-xs sm:text-sm"
                        />
                      </motion.div>
                    )}

                    {/* --- Submit Button (Animated) --- */}
                    <motion.div variants={itemVariants} className="pt-2">
                      <Button
                        type="submit"
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                        disabled={submitting}
                      >
                        {" "}
                        {/* Responsive button size */}
                        {submitting ? (
                          <>
                            <Loader2 className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5 animate-spin" />{" "}
                            {/* Responsive spinner size */}
                            Submitting Request...
                          </>
                        ) : (
                          "Submit Request"
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicAppointmentRequestPage;
