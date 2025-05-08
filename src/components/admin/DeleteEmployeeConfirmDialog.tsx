'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteEmployeeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string | undefined; // Can be undefined if employee not loaded
  employeeId: string | undefined; // Can be undefined
  onSuccess: () => void;
}

export function DeleteEmployeeConfirmDialog({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  onSuccess,
}: DeleteEmployeeConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!employeeId) {
        toast({ title: 'Error', description: 'Employee ID is missing.', variant: 'destructive'});
        onClose();
        return;
    }
    setIsDeleting(true);
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId);

    setIsDeleting(false);

    if (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: 'Error Deleting Employee',
        description: error.message || 'Could not delete employee.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Success', description: `Employee "${employeeName || 'Unknown'}" deleted successfully.` });
      onSuccess(); // This should trigger a re-fetch in the parent component
    }
    onClose(); // Close dialog regardless of success/failure
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="glass-effect">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete the employee "<strong>{employeeName || 'this employee'}</strong>"? 
            This action cannot be undone and will remove all associated data, including attendance records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || !employeeId}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete Employee
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
