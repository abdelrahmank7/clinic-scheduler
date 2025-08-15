// src/components/Clients/ClientList.jsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Trophy, UserRound } from "lucide-react";

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function ClientList({ clients, onEdit, onDelete, onView }) {
  if (clients.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No clients found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => {
        // FIX: The hook was moved from inside the map loop.
        // We now just call the function directly.
        const age = calculateAge(client.birthDate);

        // IMPROVEMENT: Use default values for empty fields
        const email = client.email || "N/A";
        const phoneNumber = client.phoneNumber || "N/A";
        const sportAndClub =
          client.sport && client.club
            ? `${client.sport}, ${client.club}`
            : client.sport || client.club || "N/A";
        const relativeInfo =
          client.relativeName || client.relativePhoneNumber
            ? `Relative: ${client.relativeName || "N/A"} (${
                client.relativePhoneNumber || "N/A"
              })`
            : "N/A";

        return (
          <Card
            key={client.id}
            className="shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{client.name}</CardTitle>
              {age && (
                <p className="text-sm text-muted-foreground">
                  ({age} years old)
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{phoneNumber}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-gray-500" />
                <span>{sportAndClub}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground pt-2">
                <UserRound className="h-4 w-4 text-gray-500" />
                <span>{relativeInfo}</span>
              </div>
            </CardContent>
            <div className="flex justify-end p-4 pt-0 space-x-2">
              <Button variant="ghost" size="sm" onClick={() => onView(client)}>
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(client)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(client.id, client.name)}
              >
                Delete
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default ClientList;
