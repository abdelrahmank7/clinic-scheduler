// // src/components/Clients/WhatsAppMessageDialog.jsx

// import React, { useState, useEffect } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import { toast } from "@/components/ui/use-toast";
// import { MessageCircle } from "lucide-react";
// import TemplateManager from "./TemplateManager"; // Import the new component

// function WhatsAppMessageDialog({ client, isOpen, onClose }) {
//   const [message, setMessage] = useState("");

//   // When the dialog opens with a client, clear the previous message
//   useEffect(() => {
//     if (isOpen) {
//       setMessage("");
//     }
//   }, [isOpen]);

//   const handleSendMessage = () => {
//     if (!client?.phoneNumber) {
//       toast({
//         title: "Client phone number is missing.",
//         variant: "destructive",
//       });
//       return;
//     }
//     const finalMessage = message.trim().replace(/\[ClientName\]/g, client.name);
//     if (!finalMessage) {
//       toast({
//         title: "Please write or select a message.",
//         variant: "destructive",
//       });
//       return;
//     }

//     const cleanedPhoneNumber = client.phoneNumber.replace(/\D/g, "");
//     const whatsappUrl = `https://wa.me/${cleanedPhoneNumber}?text=${encodeURIComponent(
//       finalMessage
//     )}`;

//     window.open(whatsappUrl, "_blank");
//     onClose();
//   };

//   if (!client) return null;

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-lg">
//         <DialogHeader>
//           <DialogTitle className="flex items-center">
//             <MessageCircle className="h-6 w-6 mr-2 text-[#25D366]" />
//             Send WhatsApp to {client.name}
//           </DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4 py-4">
//           <TemplateManager
//             onTemplateSelect={(templateText) => setMessage(templateText)}
//           />
//           <div>
//             <Label htmlFor="custom-message">Message</Label>
//             <Textarea
//               id="custom-message"
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               placeholder="Or write a custom message..."
//               rows={5}
//             />
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={onClose}>
//             Cancel
//           </Button>
//           <Button
//             onClick={handleSendMessage}
//             disabled={!message.trim()}
//             className="bg-[#25D366] text-white hover:bg-[#1DA851]"
//           >
//             <MessageCircle className="h-4 w-4 mr-2" />
//             Send Message
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// export default WhatsAppMessageDialog;
