// src/pages/ClientManagementPage.jsx

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "../components/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Edit, Trash, PlusCircle } from "lucide-react";

import ClientFormDialog from "@/components/Clients/ClientFormDialog";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";

function ClientManagementPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "clients"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching clients:", error);
        toast({
          title: "Error",
          description: "Failed to load clients. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleOpenForm = (client = null) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedClient(null);
  };

  const handleDeleteClient = async () => {
    if (clientToDelete) {
      try {
        await deleteDoc(doc(db, "clients", clientToDelete.id));
        toast({
          title: "Client Deleted",
          description: `${clientToDelete.name} has been successfully removed.`,
        });
        setIsDeleteDialogOpen(false);
        setClientToDelete(null);
      } catch (error) {
        console.error("Error deleting client:", error);
        toast({
          title: "Deletion Failed",
          description:
            "There was an error deleting the client. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full gradient-background min-h-screen p-2">
      <div className="container mx-auto bg-card rounded-xl shadow-lg p-6 min-h-[calc(100vh-48px)] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold">Client Management</h1>
          <div className="space-x-2">
            <Button onClick={() => handleOpenForm()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Client
            </Button>
            <Button asChild variant="secondary">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search clients by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4 flex-grow">
          {loading ? (
            <p>Loading clients...</p>
          ) : filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <Card
                key={client.id}
                className="relative flex flex-col justify-between"
              >
                <CardHeader>
                  <CardTitle>{client.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p>
                    Email:{" "}
                    {client.email && client.email.trim() ? client.email : "N/A"}
                  </p>
                  <p>
                    Phone:{" "}
                    {client.phoneNumber && client.phoneNumber.trim()
                      ? client.phoneNumber
                      : "N/A"}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleOpenForm(client)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      setClientToDelete(client);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p>No clients found.</p>
          )}
        </div>

        <ClientFormDialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          client={selectedClient}
        />

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteClient}
          title="Are you absolutely sure?"
          description={`This action cannot be undone. This will permanently delete the client "${clientToDelete?.name}" from your records.`}
        />
      </div>
    </div>
  );
}

export default ClientManagementPage;
