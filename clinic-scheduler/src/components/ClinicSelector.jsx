import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "../firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useClinic } from "@/contexts/ClinicContext";

const ClinicSelector = () => {
  const { selectedClinic, updateClinicPreference, clinics, setClinics } =
    useClinic();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clinicsQuery = query(collection(db, "clinics"));
    const unsubscribe = onSnapshot(clinicsQuery, (snapshot) => {
      const clinicsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClinics(clinicsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClinicChange = (clinicId) => {
    updateClinicPreference(clinicId);
  };

  if (loading) {
    return (
      <div className="w-[200px] h-9 bg-gray-200 rounded-md animate-pulse"></div>
    );
  }

  return (
    <Select value={selectedClinic || ""} onValueChange={handleClinicChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select clinic" />
      </SelectTrigger>
      <SelectContent>
        {clinics.map((clinic) => (
          <SelectItem key={clinic.id} value={clinic.id}>
            {clinic.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ClinicSelector;
