"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteEmployeeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string | undefined;
  employeeId: string | undefined;
  onSuccess: () => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
}

export function DeleteEmployeeConfirmDialog({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  onSuccess,
  onProcessingStateChange,
}: DeleteEmployeeConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Notify parent component about processing state
  useEffect(() => {
    onProcessingStateChange?.(isDeleting);
  }, [isDeleting, onProcessingStateChange]);

  const handleDelete = async () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Employee ID is missing.",
        variant: "destructive",
      });
      onClose();
      return;
    }

    setIsDeleting(true);

    try {
      // Optional: Add a small delay for better UX
      // so the user perceives that the system is doing work
      await new Promise((r) => setTimeout(r, 300));

      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (error) {
        console.error("Error deleting employee:", error);

        if (error.code === "PGRST301") {
          // Foreign key constraint error
          toast({
            title: "Cannot Delete Employee",
            description:
              "This employee has associated records (attendance, etc.) that must be deleted first.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error Deleting Employee",
            description: error.message || "Could not delete employee.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: `Employee "${employeeName || "Unknown"}" deleted successfully.`,
        });
        onSuccess();
      }
    } catch (e) {
      console.error("Unexpected error during employee deletion:", e);
      toast({
        title: "Error Deleting Employee",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="glass-effect">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete the employee "
            <strong>{employeeName || "this employee"}</strong>"? This action
            cannot be undone and will remove all associated data, including
            attendance records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || !employeeId}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Employee"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
