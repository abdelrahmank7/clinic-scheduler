// src/components/LocationSelector.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useClinic } from "@/contexts/ClinicContext";
import { MapPin } from "lucide-react";

const LocationSelector = () => {
  const {
    allLocations,
    selectedLocations,
    updateSelectedLocations,
    selectAllLocations,
    clearLocationFilter,
    loading: clinicLoading,
  } = useClinic();

  // Hide if no locations found or context is still loading
  if (clinicLoading || allLocations.length === 0) {
    return null; // Or return a placeholder if preferred
  }

  const allSelected =
    allLocations.length > 0 && selectedLocations.length === allLocations.length;

  const handleSelectAll = () => {
    selectAllLocations();
  };

  const handleClear = () => {
    clearLocationFilter();
  };

  // Toggle a specific location
  const toggleLocation = (location) => {
    if (selectedLocations.includes(location)) {
      updateSelectedLocations(
        selectedLocations.filter((loc) => loc !== location)
      );
    } else {
      updateSelectedLocations([...selectedLocations, location]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MapPin className="mr-2 h-4 w-4" />
          {selectedLocations.length === 0
            ? "All Locations"
            : selectedLocations.length === 1
            ? selectedLocations[0]
            : `${selectedLocations.length} Locations`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Select Locations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-60 overflow-y-auto p-1">
          {" "}
          {/* Add scrollable area if list is long */}
          {allLocations.map((location) => (
            <DropdownMenuCheckboxItem
              key={location}
              checked={selectedLocations.includes(location)}
              onCheckedChange={() => toggleLocation(location)}
            >
              {location}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="flex p-1 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allSelected}
            className="flex-1 text-xs"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={selectedLocations.length === 0}
            className="flex-1 text-xs"
          >
            Clear
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LocationSelector;
