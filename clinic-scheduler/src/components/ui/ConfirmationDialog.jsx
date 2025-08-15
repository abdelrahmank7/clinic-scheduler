// src/components/ui/ConfirmationDialog.jsx

import React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";

const ConfirmationDialog = ({
  isOpen,

  onOpenChange,

  title,

  description,

  onConfirm,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {" "}
      <AlertDialogContent>
        {" "}
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>{" "}
          <AlertDialogDescription>{description}</AlertDialogDescription>{" "}
        </AlertDialogHeader>{" "}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>{" "}
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600"
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;
