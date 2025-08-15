// src/components/Clients/ClientSelector.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { toast } from "../hooks/use-toast";
import {
  Pencil,
  Trash2,
  CalendarPlus,
  History,
  MessageCircle,
} from "lucide-react";
import ClientForm from "./ClientForm";
import ClientAppointmentsDialog from "./ClientAppointmentsDialog";
import WhatsAppMessageDialog from "./WhatsAppMessageDialog";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";

import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";

// The ContextMenu component remains the same...
function ContextMenu({
  x,
  y,
  isVisible,
  onClose,
  onEdit,
  onDelete,
  onMakeAppointment,
  onViewAppointments,
  onWhatsApp,
}) {
  const menuRef = React.useRef(null);
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isVisible) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isVisible, onClose]);
  if (!isVisible) return null;
  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white shadow-lg border rounded-md p-1 transition-opacity duration-150 flex flex-col"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        className="justify-start text-sm"
        onClick={onWhatsApp}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Send WhatsApp
      </Button>
      <Button
        variant="ghost"
        className="justify-start text-sm"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4 mr-2" />
        Edit Client
      </Button>
      <Button
        variant="ghost"
        className="justify-start text-sm"
        onClick={onMakeAppointment}
      >
        <CalendarPlus className="h-4 w-4 mr-2" />
        Make Appointment
      </Button>
      <Button
        variant="ghost"
        className="justify-start text-sm"
        onClick={onViewAppointments}
      >
        <History className="h-4 w-4 mr-2" />
        View Appointments
      </Button>
      {/* <Button
        variant="ghost"
        className="justify-start text-sm text-red-500"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Client
      </Button> */}
    </div>
  );
}

// 👇 UPDATED: Added showAddButton prop, defaulting to true
function ClientSelector({ onSelectClient, showAddButton = true }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    clientId: null,
  });
  const [activeDialog, setActiveDialog] = useState({
    type: null,
    client: null,
  });

  const clientsCollectionRef = collection(db, "clients");

  useEffect(() => {
    const q = query(clientsCollectionRef, orderBy("name", "asc")); // Order by name for better usability
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClients = snapshot.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      }));
      setClients(fetchedClients);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const visibleClients = useMemo(() => {
    if (!searchQuery) {
      // 👇 FIX: Removed .slice(0, 5) to show all clients
      return clients;
    }
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phoneNumber?.includes(searchQuery)
    );
  }, [searchQuery, clients]);

  const handleRightClick = (e, client) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      clientId: client.id,
    });
  };

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === contextMenu.clientId);
  }, [clients, contextMenu.clientId]);

  const handleSaveClient = async (clientData) => {
    try {
      if (activeDialog.client) {
        await updateDoc(doc(db, "clients", clientData.id), clientData);
      } else {
        await addDoc(clientsCollectionRef, {
          ...clientData,
          createdAt: new Date(),
        });
      }
      toast({ title: "Client saved successfully." });
      setActiveDialog({ type: null, client: null });
    } catch (error) {
      console.error("Failed to save client:", error);
      toast({
        title: "Error",
        description: "Failed to save client.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;
    try {
      await deleteDoc(doc(db, "clients", selectedClient.id));
      toast({ title: "Client deleted successfully." });
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client.",
        variant: "destructive",
      });
    } finally {
      setActiveDialog({ type: null, client: null });
      setContextMenu({ visible: false, x: 0, y: 0, clientId: null });
    }
  };

  const openDialog = useCallback((type, client = null) => {
    setActiveDialog({ type, client });
    setContextMenu({ visible: false, x: 0, y: 0, clientId: null });
  }, []);

  return (
    <div className="relative p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Clients</h2>
        {/* 👇 FIX: Conditionally render the button based on the new prop */}
        {showAddButton && (
          <Button size="sm" onClick={() => openDialog("form")}>
            Add Client
          </Button>
        )}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <p>Loading...</p>
        ) : visibleClients.length > 0 ? (
          visibleClients.map((client) => (
            <Card
              key={client.id}
              className="p-3 cursor-pointer hover:bg-muted transition-colors"
              onContextMenu={(e) => handleRightClick(e, client)}
              onClick={() => onSelectClient(client)}
            >
              <p className="font-medium">{client.name}</p>
              <p className="text-sm text-muted-foreground">
                {client.email || client.phoneNumber}
              </p>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground text-center pt-4">
            No clients found.
          </p>
        )}
      </div>

      {/* All dialogs and context menu logic remains the same... */}
      <ContextMenu
        isVisible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        onEdit={() => openDialog("form", selectedClient)}
        onDelete={() => openDialog("confirm-delete", selectedClient)}
        onMakeAppointment={() => {
          onSelectClient(selectedClient);
          toast({
            title: "Client selected",
            description: "Click on the calendar to schedule.",
          });
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onViewAppointments={() => openDialog("history", selectedClient)}
        onWhatsApp={() => openDialog("whatsapp", selectedClient)}
      />
      <Dialog
        open={activeDialog.type === "form"}
        onOpenChange={() => setActiveDialog({ type: null, client: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeDialog.client ? "Edit Client" : "Add Client"}
            </DialogTitle>
          </DialogHeader>
          <ClientForm
            clientToEdit={activeDialog.client}
            onSave={handleSaveClient}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={activeDialog.type === "history"}
        onOpenChange={() => setActiveDialog({ type: null, client: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeDialog.client?.name}'s Appointment History
            </DialogTitle>
          </DialogHeader>
          <ClientAppointmentsDialog clientId={activeDialog.client?.id} />
        </DialogContent>
      </Dialog>
      <WhatsAppMessageDialog
        client={activeDialog.client}
        isOpen={activeDialog.type === "whatsapp"}
        onClose={() => setActiveDialog({ type: null, client: null })}
      />
      <ConfirmationDialog
        isOpen={activeDialog.type === "confirm-delete"}
        onOpenChange={() => setActiveDialog({ type: null, client: null })}
        title="Are you sure?"
        description={`This will permanently delete ${selectedClient?.name}.`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default ClientSelector;
