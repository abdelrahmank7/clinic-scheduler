// src/pages/SettingsPage.jsx

import React, { useState, useEffect, createContext, useContext } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setDoc, Timestamp } from "firebase/firestore";
import { useClinic } from "@/contexts/ClinicContext";

// --- START NEW CODE ---
// Create a new context for pricing
export const PricingContext = createContext(null);

// Create a custom hook to use the pricing data
export const usePricing = () => useContext(PricingContext);

// Create the pricing provider component
export const PricingProvider = ({ children }) => {
  const { selectedClinic } = useClinic();
  const [pricing, setPricing] = useState(null);

  // Fetch pricing settings based on the selected clinic
  useEffect(() => {
    if (!selectedClinic) {
      setPricing(null); // Reset pricing if no clinic is selected
      return;
    }

    const pricingDoc = doc(db, "settings", `pricing_${selectedClinic}`);
    const unsubscribe = onSnapshot(pricingDoc, (doc) => {
      if (doc.exists()) {
        setPricing(doc.data());
      } else {
        // Default pricing
        setPricing({
          singleSession: 100,
          packages: [
            { sessions: 4, price: 350, name: "Basic Package" },
            { sessions: 8, price: 600, name: "Premium Package" },
          ],
        });
      }
    });
    return () => unsubscribe();
  }, [selectedClinic]);

  return (
    <PricingContext.Provider value={pricing}>
      {children}
    </PricingContext.Provider>
  );
};
// --- END NEW CODE ---

const SettingsPage = () => {
  const [user] = useAuthState(auth);
  const [clinics, setClinics] = useState([]);
  const [pricing, setPricing] = useState({});
  const [selectedClinic, setSelectedClinic] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch clinics
  useEffect(() => {
    const clinicsQuery = query(collection(db, "clinics"), orderBy("name"));
    const unsubscribe = onSnapshot(clinicsQuery, (snapshot) => {
      const clinicsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClinics(clinicData);

      // Set first clinic as default if none selected
      if (clinicsData.length > 0 && !selectedClinic) {
        setSelectedClinic(clinicsData[0].id);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch pricing settings
  useEffect(() => {
    if (!selectedClinic) return;

    const pricingDoc = doc(db, "settings", `pricing_${selectedClinic}`);
    const unsubscribe = onSnapshot(pricingDoc, (doc) => {
      if (doc.exists()) {
        setPricing(doc.data());
      } else {
        // Default pricing
        setPricing({
          singleSession: 100,
          packages: [
            { sessions: 4, price: 350, name: "Basic Package" },
            { sessions: 8, price: 600, name: "Premium Package" },
          ],
        });
      }
    });
    return () => unsubscribe();
  }, [selectedClinic]);

  const savePricing = async (pricingPayload) => {
    try {
      // Defensive: avoid sending DOM events to Firestore
      if (pricingPayload && pricingPayload.nativeEvent) {
        console.error(
          "savePricing called with event instead of payload",
          pricingPayload
        );
        toast({
          title: "Save failed",
          description:
            "Internal error: save handler received an event. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const docId = `pricing_${selectedClinic || "default"}`;
      const docRef = doc(db, "settings", docId);

      await setDoc(
        docRef,
        { ...pricingPayload, updatedAt: Timestamp.now() },
        { merge: true }
      );

      toast({ title: "Pricing saved", description: "Changes were saved." });
    } catch (err) {
      console.error("Error saving pricing:", err);
      toast({
        title: "Error saving pricing",
        description: err.message || "Failed to save pricing",
        variant: "destructive",
      });
    }
  };

  const addClinic = async (clinicData) => {
    try {
      await addDoc(collection(db, "clinics"), {
        ...clinicData,
        createdAt: new Date(),
      });
      toast({
        title: "Success",
        description: "Clinic added successfully!",
      });
    } catch (error) {
      console.error("Error adding clinic:", error);
      toast({
        title: "Error",
        description: "Failed to add clinic.",
        variant: "destructive",
      });
    }
  };

  const saveRevenueSharing = async (sharingPayload) => {
    try {
      // Defensive: avoid sending DOM events to Firestore
      if (sharingPayload && sharingPayload.nativeEvent) {
        console.error(
          "saveRevenueSharing called with event instead of payload",
          sharingPayload
        );
        toast({
          title: "Save failed",
          description:
            "Internal error: save handler received an event. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const docId = `revenue_${selectedClinic || "default"}`;
      const docRef = doc(db, "settings", docId);

      await setDoc(
        docRef,
        { ...sharingPayload, updatedAt: Timestamp.now() },
        { merge: true }
      );

      toast({ title: "Revenue saved", description: "Changes were saved." });
    } catch (err) {
      console.error("Error saving revenue sharing:", err);
      toast({
        title: "Error saving revenue sharing",
        description: err.message || "Failed to save revenue sharing",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Clinic Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Clinic Selection</CardTitle>
          <CardDescription>
            Select the clinic you want to manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a clinic" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddClinicDialog onAddClinic={addClinic} />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      {selectedClinic && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Settings</CardTitle>
            <CardDescription>
              Set prices for single sessions and packages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="singleSession">Single Session Price ($)</Label>
                <Input
                  type="number"
                  id="singleSession"
                  value={pricing.singleSession || ""}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      singleSession: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Package Pricing</Label>
              {pricing.packages?.map((pkg, index) => (
                <div key={index} className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Package Name</Label>
                    <Input
                      value={pkg.name || ""}
                      onChange={(e) => {
                        const newPackages = [...pricing.packages];
                        newPackages[index].name = e.target.value;
                        setPricing({ ...pricing, packages: newPackages });
                      }}
                      placeholder="Package name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sessions</Label>
                    <Input
                      type="number"
                      value={pkg.sessions || ""}
                      onChange={(e) => {
                        const newPackages = [...pricing.packages];
                        newPackages[index].sessions = parseInt(e.target.value);
                        setPricing({ ...pricing, packages: newPackages });
                      }}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      value={pkg.price || ""}
                      onChange={(e) => {
                        const newPackages = [...pricing.packages];
                        newPackages[index].price = parseFloat(e.target.value);
                        setPricing({ ...pricing, packages: newPackages });
                      }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}

              <Button
                onClick={() => {
                  setPricing({
                    ...pricing,
                    packages: [
                      ...(pricing.packages || []),
                      { sessions: 4, price: 0, name: "" },
                    ],
                  });
                }}
                variant="outline"
              >
                Add Package
              </Button>
            </div>

            <Button onClick={savePricing} disabled={loading}>
              {loading ? "Saving..." : "Save Pricing"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revenue Sharing */}
      {selectedClinic && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Sharing</CardTitle>
            <CardDescription>
              Set revenue sharing percentages between clinic and physicians
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueSharingSettings clinicId={selectedClinic} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Add Clinic Dialog Component
const AddClinicDialog = ({ onAddClinic }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAddClinic({ name, address, phone });
      setIsOpen(false);
      setName("");
      setAddress("");
      setPhone("");
    } catch (error) {
      console.error("Error adding clinic:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add New Clinic</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Clinic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinicName">Clinic Name</Label>
            <Input
              id="clinicName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicAddress">Address</Label>
            <Input
              id="clinicAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicPhone">Phone</Label>
            <Input
              id="clinicPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Clinic"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Revenue Sharing Settings Component
const RevenueSharingSettings = ({ clinicId }) => {
  const [revenueSharing, setRevenueSharing] = useState({
    clinicPercentage: 60,
    physicianPercentage: 40,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) return;

    const revenueDoc = doc(db, "settings", `revenue_${clinicId}`);
    const unsubscribe = onSnapshot(revenueDoc, (doc) => {
      if (doc.exists()) {
        setRevenueSharing(doc.data());
      }
    });
    return () => unsubscribe();
  }, [clinicId]);

  const saveRevenueSharing = async (sharingPayload) => {
    try {
      const docId = `revenue_${selectedClinic}`;
      const docRef = doc(db, "settings", docId);

      await setDoc(
        docRef,
        { ...sharingPayload, updatedAt: Timestamp.now() },
        { merge: true }
      );

      toast({ title: "Revenue saved", description: "Changes were saved." });
    } catch (err) {
      console.error("Error saving revenue sharing:", err);
      toast({
        title: "Error saving revenue sharing",
        description: err.message || "Failed to save revenue sharing",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clinicPercentage">Clinic Percentage</Label>
          <Input
            type="number"
            id="clinicPercentage"
            value={revenueSharing.clinicPercentage}
            onChange={(e) =>
              setRevenueSharing({
                ...revenueSharing,
                clinicPercentage: parseInt(e.target.value),
                physicianPercentage: 100 - parseInt(e.target.value),
              })
            }
            min="0"
            max="100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="physicianPercentage">Physician Percentage</Label>
          <Input
            type="number"
            id="physicianPercentage"
            value={revenueSharing.physicianPercentage}
            onChange={(e) =>
              setRevenueSharing({
                ...revenueSharing,
                physicianPercentage: parseInt(e.target.value),
                clinicPercentage: 100 - parseInt(e.target.value),
              })
            }
            min="0"
            max="100"
          />
        </div>
      </div>
      <Button onClick={saveRevenueSharing} disabled={loading}>
        {loading ? "Saving..." : "Save Revenue Sharing"}
      </Button>
    </div>
  );
};

export default SettingsPage;
