// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
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
import { setDoc } from "firebase/firestore";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/components/hooks/use-toast";

const SettingsPage = () => {
  const [user] = useAuthState(auth);
  const [clinics, setClinics] = useState([]);
  const [pricing, setPricing] = useState({});
  const [selectedClinic, setSelectedClinic] = useState("");
  const [loading, setLoading] = useState(false);
  const { selectedClinic: clinicContext } = useClinic();

  // Fetch clinics
  useEffect(() => {
    const clinicsQuery = query(collection(db, "clinics"), orderBy("name"));
    const unsubscribe = onSnapshot(clinicsQuery, (snapshot) => {
      const clinicsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClinics(clinicsData);

      // Set clinic from context or first clinic as default
      if (clinicsData.length > 0 && !selectedClinic) {
        setSelectedClinic(clinicContext || clinicsData[0].id);
      }
    });
    return () => unsubscribe();
  }, [clinicContext]);

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
            { id: "basic", sessions: 4, price: 350, name: "Basic Package" },
            { id: "premium", sessions: 8, price: 600, name: "Premium Package" },
          ],
        });
      }
    });
    return () => unsubscribe();
  }, [selectedClinic]);

  const savePricing = async () => {
    setLoading(true);
    try {
      const pricingDocRef = doc(db, "settings", `pricing_${selectedClinic}`);

      // Use setDoc with merge: true instead of updateDoc
      // This will create the document if it doesn't exist, or update it if it does
      await setDoc(
        pricingDocRef,
        {
          ...pricing,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      toast({
        title: "Success",
        description: "Pricing settings saved successfully!",
      });
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast({
        title: "Error",
        description: "Failed to save pricing settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Revenue Sharing Settings Component
  const RevenueSharingSettings = ({ clinicId }) => {
    const [revenueSharing, setRevenueSharing] = useState({
      clinicPercentage: 60,
      physicianPercentage: 40,
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

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

    const handleSaveRevenueSharing = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "settings", `revenue_${clinicId}`);

        // Use setDoc with merge: true
        await setDoc(
          docRef,
          {
            ...revenueSharing,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        toast({
          title: "Success",
          description: "Revenue sharing settings saved successfully!",
        });
      } catch (error) {
        console.error("Error saving revenue sharing:", error);
        toast({
          title: "Error",
          description: "Failed to save revenue sharing settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
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
        <Button onClick={handleSaveRevenueSharing} disabled={loading}>
          {loading ? "Saving..." : "Save Revenue Sharing"}
        </Button>
      </div>
    );
  };

  // Update the pricing settings section to be cleaner:
  const PricingSettings = () => {
    const [localLoading, setLocalLoading] = useState(false);

    const handleSavePricing = async () => {
      setLocalLoading(true);
      try {
        const pricingDocRef = doc(db, "settings", `pricing_${selectedClinic}`);

        await setDoc(
          pricingDocRef,
          {
            ...pricing,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        toast({
          title: "Success",
          description: "Pricing settings saved successfully!",
        });
      } catch (error) {
        console.error("Error saving pricing:", error);
        toast({
          title: "Error",
          description: "Failed to save pricing settings.",
          variant: "destructive",
        });
      } finally {
        setLocalLoading(false);
      }
    };

    const addPackage = () => {
      setPricing({
        ...pricing,
        packages: [
          ...(pricing.packages || []),
          {
            id: `pkg_${Date.now()}`,
            sessions: 4,
            price: 0,
            name: "New Package",
          },
        ],
      });
    };

    const updatePackage = (index, field, value) => {
      const newPackages = [...(pricing.packages || [])];
      newPackages[index] = { ...newPackages[index], [field]: value };
      setPricing({ ...pricing, packages: newPackages });
    };

    const removePackage = (index) => {
      const newPackages = [...(pricing.packages || [])];
      newPackages.splice(index, 1);
      setPricing({ ...pricing, packages: newPackages });
    };

    return (
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Single Session Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="singleSession">Price per Session ($)</Label>
                <Input
                  type="number"
                  id="singleSession"
                  value={pricing?.singleSession || 100}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      singleSession: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Package Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(pricing?.packages || []).map((pkg, index) => (
                  <div
                    key={pkg.id || index}
                    className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border rounded-lg"
                  >
                    <div className="md:col-span-2">
                      <Input
                        value={pkg.name || ""}
                        onChange={(e) =>
                          updatePackage(index, "name", e.target.value)
                        }
                        placeholder="Package name"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={pkg.sessions || ""}
                        onChange={(e) =>
                          updatePackage(
                            index,
                            "sessions",
                            parseInt(e.target.value) || 1
                          )
                        }
                        min="1"
                        placeholder="Sessions"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={pkg.price || ""}
                        onChange={(e) =>
                          updatePackage(
                            index,
                            "price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.01"
                        placeholder="Price"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePackage(index)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}

                <Button onClick={addPackage} variant="outline">
                  + Add Package Option
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button onClick={handleSavePricing} disabled={localLoading}>
          {localLoading ? "Saving..." : "Save Pricing Settings"}
        </Button>
      </CardContent>
    );
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
          <PricingSettings />
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

export default SettingsPage;
