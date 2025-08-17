// src/components/Clients/WhatsAppMessageDialog.jsx

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "../hooks/use-toast";
import { MessageCircle } from "lucide-react";

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

function WhatsAppMessageDialog({ client, isOpen, onClose }) {
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState("default");
  const [editMessageText, setEditMessageText] = useState("");

  const templatesCollectionRef = collection(db, "whatsapp_templates");

  // Fetch templates from Firebase using a real-time listener
  useEffect(() => {
    if (!isOpen) return;
    const q = query(templatesCollectionRef, orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTemplates = snapshot.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      }));
      setSavedTemplates(fetchedTemplates);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleCloseDialog = () => {
    setSelectedTemplateId("");
    setMessage("");
    setViewMode("default");
    setEditMessageText("");
    onClose();
  };

  const handleSendMessage = () => {
    if (!client?.phoneNumber) {
      toast({
        title: "Error",
        description: "Client phone number is missing.",
        variant: "destructive",
      });
      return;
    }

    const messageToSend = message.trim();

    if (!messageToSend) {
      toast({
        title: "Validation Error",
        description: "Please write or select a message.",
        variant: "destructive",
      });
      return;
    }

    const finalMessage = messageToSend.replace(/\[ClientName\]/g, client.name);
    const cleanedPhoneNumber = client.phoneNumber.replace(/\D/g, "");

    const encodedMessage = encodeURIComponent(finalMessage);
    const whatsappUrl = `https://wa.me/${cleanedPhoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    handleCloseDialog();
  };

  const handleAddOrUpdateTemplate = async () => {
    if (!editMessageText) return;

    try {
      if (viewMode === "edit") {
        const templateDoc = doc(db, "whatsapp_templates", selectedTemplateId);
        await updateDoc(templateDoc, { text: editMessageText });
        toast({ title: "Template updated." });
      } else {
        await addDoc(templatesCollectionRef, {
          text: editMessageText,
          createdAt: new Date(),
        });
        toast({ title: "Template added." });
      }
      setEditMessageText("");
      setViewMode("default");
      setSelectedTemplateId("");
    } catch (error) {
      console.error("Failed to save template:", error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      const templateDoc = doc(db, "whatsapp_templates", selectedTemplateId);
      await deleteDoc(templateDoc);
      toast({ title: "Template deleted." });
      setSelectedTemplateId("");
      setEditMessageText("");
      setViewMode("default");
      setMessage(""); // Reset the message after deletion
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectTemplate = (id) => {
    setSelectedTemplateId(id);
    const template = savedTemplates.find((msg) => msg.id === id);
    if (template) {
      setMessage(template.text.replace(/\[ClientName\]/g, client.name));
    }
  };

  // Sync message with selected template whenever it changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = savedTemplates.find(
        (msg) => msg.id === selectedTemplateId
      );
      if (template) {
        setMessage(template.text.replace(/\[ClientName\]/g, client?.name));
      }
    }
  }, [selectedTemplateId, savedTemplates, client]);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    if (selectedTemplateId) {
      setSelectedTemplateId("");
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="min-w-[400px] max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-bold">
            <MessageCircle className="h-6 w-6 mr-2 text-[#25D366]" />
            Send WhatsApp to {client.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2">Saved Templates</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={handleSelectTemplate}
                value={selectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a saved template" />
                </SelectTrigger>
                <SelectContent>
                  {savedTemplates.map((msg) => (
                    <SelectItem key={msg.id} value={msg.id}>
                      {msg.text.substring(0, 50)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {viewMode === "default" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedTemplateId) {
                      const template = savedTemplates.find(
                        (msg) => msg.id === selectedTemplateId
                      );
                      setEditMessageText(template.text);
                      setViewMode("edit");
                    } else {
                      setEditMessageText("");
                      setViewMode("add");
                    }
                  }}
                >
                  Edit/Add
                </Button>
              )}
            </div>
          </div>

          {viewMode !== "default" && (
            <div className="space-y-2">
              <Label htmlFor="edit-message" className="mb-2">
                {viewMode === "add" ? "Add New Template" : "Edit Template"}
              </Label>
              <Textarea
                id="edit-message"
                value={editMessageText}
                onChange={(e) => setEditMessageText(e.target.value)}
                placeholder="Write your template here. Use [ClientName] as a placeholder."
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                {viewMode === "edit" && (
                  <Button variant="destructive" onClick={handleDeleteTemplate}>
                    Delete
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewMode("default");
                    setEditMessageText("");
                    setSelectedTemplateId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddOrUpdateTemplate}
                  disabled={!editMessageText}
                >
                  {viewMode === "edit" ? "Save Changes" : "Add New"}
                </Button>
              </div>
            </div>
          )}

          {viewMode === "default" && (
            <div>
              <Label htmlFor="custom-message" className="mb-2">
                Or write a custom message
              </Label>
              <Textarea
                id="custom-message"
                value={message}
                onChange={handleMessageChange}
                placeholder="Start typing your new message here..."
                rows={4}
              />
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-[#25D366] text-white hover:bg-[#1DA851] flex items-center"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

WhatsAppMessageDialog.propTypes = {
  client: PropTypes.shape({
    name: PropTypes.string,
    phoneNumber: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default WhatsAppMessageDialog;
