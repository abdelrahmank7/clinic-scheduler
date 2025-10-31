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
  setDoc,
  where,
  getDocs,
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
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/components/ui/use-toast";
// Import the new hook for location-specific pricing
import { useLocationPricing } from "@/hooks/useLocationPricing";
import { MapPin, Package, DollarSign } from "lucide-react";

const SettingsPage = () => {
  const [user] = useAuthState(auth);
  const { allLocations } = useClinic(); // Get all locations for this instance

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Location Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Management
          </CardTitle>
          <CardDescription>
            Add or remove locations for this clinic instance
          </CardDescription>
        </CardHeader>
        <LocationManagement allLocations={allLocations} />
      </Card>

      {/* Location-Specific Package Pricing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Location-Specific Package Pricing
          </CardTitle>
          <CardDescription>
            Set prices for your packages at each location
          </CardDescription>
        </CardHeader>
        <LocationSpecificPricingSettings allLocations={allLocations} />
      </Card>

      {/* Location-Specific Revenue Sharing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Location-Specific Revenue Sharing
          </CardTitle>
          <CardDescription>
            Set revenue sharing percentages for each location
          </CardDescription>
        </CardHeader>
        <LocationSpecificRevenueSharingSettings allLocations={allLocations} />
      </Card>
    </div>
  );
};

export default SettingsPage;

// --- LOCATION MANAGEMENT COMPONENT (FOR SINGLE INSTANCE) ---
const LocationManagement = ({ allLocations }) => {
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");

  const handleAddLocation = async (e) => {
    e.preventDefault();

    const nameToSave = newLocationName.trim();
    const addressToSave = newLocationAddress.trim();

    if (!nameToSave) {
      toast({
        title: "Error",
        description: "Location name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    // Optional: Check if location name already exists
    if (allLocations.includes(nameToSave)) {
      toast({
        title: "Error",
        description: `A location named "${nameToSave}" already exists.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const locationData = {
        name: nameToSave,
        address: addressToSave,
        isActive: true,
        createdAt: new Date(),
      };

      console.log("Attempting to add location:", locationData);
      await addDoc(collection(db, "locations"), locationData);

      toast({
        title: "Success",
        description: `Location "${nameToSave}" added successfully!`,
      });
      setNewLocationName("");
      setNewLocationAddress("");
      // The ClinicContext will automatically update allLocations via its listener
    } catch (error) {
      console.error("Error adding location:", error);
      let errorMessage = "Failed to add location.";
      if (error.code) {
        errorMessage += ` Firestore Error: ${error.code}.`;
      }
      if (error.message) {
        errorMessage += ` Details: ${error.message}.`;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRemoveLocation = async (locationNameToRemove) => {
    if (
      !window.confirm(
        `Are you sure you want to remove the location "${locationNameToRemove}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Find the document ID for the location name to delete
      // This requires a query because we only have the name
      const locationsQuery = query(
        collection(db, "locations"),
        where("name", "==", locationNameToRemove)
      );
      const querySnapshot = await getDocs(locationsQuery);

      if (querySnapshot.empty) {
        toast({
          title: "Error",
          description: `Location "${locationNameToRemove}" not found.`,
          variant: "destructive",
        });
        return;
      }

      const locationDoc = querySnapshot.docs[0]; // Assuming unique names
      console.log(
        "Attempting to delete location:",
        locationNameToRemove,
        locationDoc.id
      );
      await deleteDoc(doc(db, "locations", locationDoc.id));

      toast({
        title: "Success",
        description: "Location removed successfully!",
      });
      // The ClinicContext will automatically update allLocations via its listener
    } catch (error) {
      console.error("Error removing location:", error);
      let errorMessage = "Failed to remove location.";
      if (error.code) {
        errorMessage += ` Firestore Error: ${error.code}.`;
      }
      if (error.message) {
        errorMessage += ` Details: ${error.message}.`;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <CardContent className="space-y-4">
      <form
        onSubmit={handleAddLocation}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
      >
        <div className="space-y-2">
          <Label htmlFor="newLocationName">New Location Name</Label>
          <Input
            id="newLocationName"
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            placeholder="e.g., Downtown Branch"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newLocationAddress">Address (Optional)</Label>
          <Input
            id="newLocationAddress"
            value={newLocationAddress}
            onChange={(e) => setNewLocationAddress(e.target.value)}
            placeholder="e.g., 123 Main St"
          />
        </div>
        <Button type="submit">Add Location</Button>
      </form>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Existing Locations:</h4>
        <ul className="space-y-1">
          {allLocations.map((locationName) => (
            <li
              key={locationName}
              className="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <span>{locationName}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveLocation(locationName)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </CardContent>
  );
};

// --- LOCATION-SPECIFIC PRICING SETTINGS COMPONENT ---
const LocationSpecificPricingSettings = ({ allLocations }) => {
  const [selectedLocationForPricing, setSelectedLocationForPricing] =
    useState("");
  // Use the new hook to fetch pricing for the selected location
  const {
    pricing: locationPricing,
    loading: pricingLoading,
    error: pricingError,
    saveLocationPricing, // Get the save function from the hook
  } = useLocationPricing(selectedLocationForPricing);
  const [localPackages, setLocalPackages] = useState([]);
  const [saving, setSaving] = useState(false);

  // Initialize local packages when location pricing loads
  useEffect(() => {
    if (locationPricing && !pricingLoading) {
      setLocalPackages(locationPricing.packages || []);
    } else if (!selectedLocationForPricing) {
      setLocalPackages([]);
    }
  }, [locationPricing, pricingLoading, selectedLocationForPricing]);

  const handleSavePricing = async () => {
    if (!selectedLocationForPricing) {
      toast({
        title: "Error",
        description: "Please select a location first.",
        variant: "destructive",
      });
      return;
    }

    if (!saveLocationPricing) {
      toast({
        title: "Error",
        description: "Save functionality is not available.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await saveLocationPricing({ packages: localPackages });
      toast({
        title: "Success",
        description: `Pricing settings saved for ${selectedLocationForPricing}!`,
      });
    } catch (error) {
      console.error("Error saving location pricing:", error);
      toast({
        title: "Error",
        description: "Failed to save pricing settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addPackage = () => {
    setLocalPackages([
      ...localPackages,
      {
        id: `pkg_${Date.now()}`,
        sessions: 4,
        price: 0,
        name: "New Package",
      },
    ]);
  };

  const updatePackage = (index, field, value) => {
    const newPackages = [...localPackages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setLocalPackages(newPackages);
  };

  const removePackage = (index) => {
    const newPackages = [...localPackages];
    newPackages.splice(index, 1);
    setLocalPackages(newPackages);
  };

  // Conditional rendering based on location selection
  if (allLocations.length === 0) {
    return (
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">
          No locations found. Please add locations first.
        </p>
      </CardContent>
    );
  }

  return (
    <CardContent className="space-y-6">
      {/* Location Selector for Pricing */}
      <div className="space-y-2">
        <Label htmlFor="pricing-location-select">
          Select Location for Pricing:
        </Label>
        <Select
          value={selectedLocationForPricing}
          onValueChange={setSelectedLocationForPricing}
        >
          <SelectTrigger id="pricing-location-select">
            <SelectValue placeholder="Select a location..." />
          </SelectTrigger>
          <SelectContent>
            {allLocations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedLocationForPricing ? (
        <>
          {pricingLoading && (
            <p>Loading pricing for {selectedLocationForPricing}...</p>
          )}
          {pricingError && (
            <p className="text-destructive">
              Error loading pricing: {pricingError.message}
            </p>
          )}
          {!pricingLoading && !pricingError && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Package Options for {selectedLocationForPricing}
                </CardTitle>
                <CardDescription>
                  Configure your pricing packages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(localPackages || []).map((pkg, index) => (
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
          )}
          <Button
            onClick={handleSavePricing}
            disabled={saving || pricingLoading || pricingError}
          >
            {saving ? "Saving..." : "Save Package Settings"}
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground">
          Please select a location to configure its pricing.
        </p>
      )}
    </CardContent>
  );
};

// --- LOCATION-SPECIFIC REVENUE SHARING SETTINGS COMPONENT ---
const LocationSpecificRevenueSharingSettings = ({ allLocations }) => {
  const [selectedLocationForRevenue, setSelectedLocationForRevenue] =
    useState("");
  const [revenueSharing, setRevenueSharing] = useState({
    clinicPercentage: 60,
    physicianPercentage: 40,
  });
  const [localLoading, setLocalLoading] = useState(false);
  const { toast } = useToast();

  // Fetch revenue sharing settings for the selected location
  useEffect(() => {
    if (!selectedLocationForRevenue) {
      setRevenueSharing({ clinicPercentage: 60, physicianPercentage: 40 });
      return;
    }

    const revenueDoc = doc(
      db,
      "settings",
      `revenue_${selectedLocationForRevenue}`
    );
    const unsubscribe = onSnapshot(
      revenueDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          setRevenueSharing(docSnap.data());
        } else {
          // Default or reset to a base state if no document
          setRevenueSharing({ clinicPercentage: 60, physicianPercentage: 40 });
        }
      },
      (error) => {
        console.error(
          `Error fetching revenue sharing for ${selectedLocationForRevenue}:`,
          error
        );
        toast({
          title: "Error",
          description: `Could not load revenue sharing for ${selectedLocationForRevenue}.`,
          variant: "destructive",
        });
      }
    );
    return () => unsubscribe();
  }, [selectedLocationForRevenue, toast]); // Add toast to deps if needed

  const handleSaveRevenueSharing = async () => {
    if (!selectedLocationForRevenue) {
      toast({
        title: "Error",
        description: "Please select a location first.",
        variant: "destructive",
      });
      return;
    }

    setLocalLoading(true);
    try {
      const docRef = doc(
        db,
        "settings",
        `revenue_${selectedLocationForRevenue}`
      );
      await setDoc(
        docRef,
        {
          ...revenueSharing,
          updatedAt: new Date(),
          locationId: selectedLocationForRevenue, // Associate with location
        },
        { merge: true }
      );

      toast({
        title: "Success",
        description: `Revenue sharing settings saved for ${selectedLocationForRevenue}!`,
      });
    } catch (error) {
      console.error("Error saving location revenue sharing:", error);
      toast({
        title: "Error",
        description: "Failed to save revenue sharing settings.",
        variant: "destructive",
      });
    } finally {
      setLocalLoading(false);
    }
  };

  // Conditional rendering based on location selection
  if (allLocations.length === 0) {
    return (
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          No locations found. Please add locations first.
        </p>
      </CardContent>
    );
  }

  return (
    <CardContent className="space-y-4">
      {/* Location Selector for Revenue Sharing */}
      <div className="space-y-2">
        <Label htmlFor="revenue-location-select">
          Select Location for Revenue Sharing:
        </Label>
        <Select
          value={selectedLocationForRevenue}
          onValueChange={setSelectedLocationForRevenue}
        >
          <SelectTrigger id="revenue-location-select">
            <SelectValue placeholder="Select a location..." />
          </SelectTrigger>
          <SelectContent>
            {allLocations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedLocationForRevenue ? (
        <>
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
                    clinicPercentage: parseInt(e.target.value) || 0,
                    physicianPercentage: 100 - (parseInt(e.target.value) || 0),
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
                    physicianPercentage: parseInt(e.target.value) || 0,
                    clinicPercentage: 100 - (parseInt(e.target.value) || 0),
                  })
                }
                min="0"
                max="100"
              />
            </div>
          </div>
          <Button onClick={handleSaveRevenueSharing} disabled={localLoading}>
            {localLoading ? "Saving..." : "Save Revenue Sharing"}
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground">
          Please select a location to configure its revenue sharing.
        </p>
      )}
    </CardContent>
  );
};
