// src/pages/ClientsPage.jsx

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "../components/hooks/use-toast";

import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

import ClientForm from "../components/Clients/ClientForm";
import ClientList from "../components/Clients/ClientList";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [editingClient, setEditingClient] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingClient, setViewingClient] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const clientsCollectionRef = collection(db, "clients");

  useEffect(() => {
    const q = query(clientsCollectionRef, orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientsData = snapshot.docs.map((document) => ({
          ...document.data(),
          id: document.id,
        }));
        setClients(clientsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching clients:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSaveClient = async (clientData) => {
    try {
      if (editingClient) {
        await updateDoc(doc(db, "clients", clientData.id), clientData);
        toast({ title: "Client Updated" });
      } else {
        await addDoc(clientsCollectionRef, clientData);
        toast({ title: "Client Added" });
      }
      setIsDialogOpen(false);
      setEditingClient(null);
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleView = (client) => {
    setViewingClient(client);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (clientId, clientName) => {
    setClientToDelete({ id: clientId, name: clientName });
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      await deleteDoc(doc(db, "clients", clientToDelete.id));
      toast({
        title: "Client Deleted",
        description: `Client ${clientToDelete.name} has been removed.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting client:", error);
    } finally {
      setClientToDelete(null);
      setIsConfirmOpen(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phoneNumber && client.phoneNumber.includes(searchQuery)) ||
      (client.sport &&
        client.sport.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.club &&
        client.club.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full gradient-background min-h-screen p-6">
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <p className="text-foreground">Loading clients...</p>
        </div>
      ) : (
        <>
          <div className="container mx-auto bg-card rounded-xl shadow-lg p-6 min-h-[calc(100vh-48px)] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h1 className="text-3xl font-bold">Client Management</h1>
              <div className="flex items-center space-x-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingClient(null)}>
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingClient ? "Edit Client" : "Add Client"}
                      </DialogTitle>
                    </DialogHeader>
                    <ClientForm
                      clientToEdit={editingClient}
                      onSave={handleSaveClient}
                    />
                  </DialogContent>
                </Dialog>
                <Button asChild variant="secondary">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </div>

            <div className="relative mb-6">
              <Input
                placeholder="Search by name, phone, sport, or club..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-grow">
              <ClientList
                clients={filteredClients}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* 👇 THIS IS THE DIALOG THAT WAS FIXED                      */}
          {/* ========================================================= */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              {viewingClient && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {viewingClient.name}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Client Details
                    </p>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <p className="text-right text-muted-foreground">Email</p>
                      <p className="col-span-3 break-all">
                        {viewingClient.email || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <p className="text-right text-muted-foreground">Phone</p>
                      <p className="col-span-3">
                        {viewingClient.phoneNumber || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <p className="text-right text-muted-foreground">Sport</p>
                      <p className="col-span-3">
                        {viewingClient.sport || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <p className="text-right text-muted-foreground">Club</p>
                      <p className="col-span-3">
                        {viewingClient.club || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <p className="text-right text-muted-foreground">
                        Birth Date
                      </p>
                      <p className="col-span-3">
                        {viewingClient.birthDate || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <p className="text-right text-muted-foreground">
                        Relative
                      </p>
                      <p className="col-span-3">
                        {viewingClient.relativeName || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <p className="text-right text-muted-foreground">
                        Relative Phone
                      </p>
                      <p className="col-span-3">
                        {viewingClient.relativePhoneNumber || "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* This is the Confirmation Dialog for Deleting */}
          <ConfirmationDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            title="Are you absolutely sure?"
            description={
              clientToDelete
                ? `This will permanently delete the client "${clientToDelete.name}". This action cannot be undone.`
                : ""
            }
            onConfirm={handleConfirmDelete}
          />
        </>
      )}
    </div>
  );
}

export default ClientsPage;
