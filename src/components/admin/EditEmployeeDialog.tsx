"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ScanLine, DollarSign } from "lucide-react";
import type { Employee } from "./EmployeeManagementTable";

interface EditEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: (updatedEmployee: Employee) => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
}

// Simulated RFID scan with reduced delay
async function scanRfidTag(): Promise<string | null> {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 500 + 300),
  );

  if (Math.random() > 0.1) {
    const randomTag = `RFID_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return randomTag;
  }
  return null;
}

export function EditEmployeeDialog({
  isOpen,
  onClose,
  employee,
  onSuccess,
  onProcessingStateChange,
}: EditEmployeeDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rfidTag, setRfidTag] = useState<string | null>(null);
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [hourlyRate, setHourlyRate] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const { toast } = useToast();

  // Load employee data when opened or when employee changes
  useEffect(() => {
    if (employee && isOpen) {
      setName(employee.name);
      setEmail(employee.email);
      setRfidTag(employee.rfid_tag);
      setDepartment(employee.department || "");
      setPosition(employee.position || "");
      setHourlyRate(employee.hourly_rate?.toString() || "");
      setValidationErrors({});
    }
  }, [employee, isOpen]);

  // Notify parent component about processing state
  useEffect(() => {
    onProcessingStateChange?.(isSaving || isScanning);
  }, [isSaving, isScanning, onProcessingStateChange]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    if (hourlyRate && isNaN(parseFloat(hourlyRate))) {
      errors.hourlyRate = "Hourly rate must be a valid number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleScanRfid = async () => {
    setIsScanning(true);
    try {
      const tagId = await scanRfidTag();
      if (tagId) {
        setRfidTag(tagId);
        toast({
          title: "RFID Scanned",
          description: `Tag ID: ${tagId}`,
        });
      } else {
        toast({
          title: "Scan Failed",
          description: "No RFID tag detected. You can enter it manually.",
          variant: "default",
        });
      }
    } catch (err) {
      console.error("RFID scan error:", err);
      toast({
        title: "Scan Error",
        description: "An error occurred during scanning.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employee) return;

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    const updatedEmployeeData = {
      name: name.trim(),
      email: email.trim(),
      rfid_tag: rfidTag ? rfidTag.trim() : null,
      department: department.trim() || null,
      position: position.trim() || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
    };

    try {
      const { data, error } = await supabase
        .from("employees")
        .update(updatedEmployeeData)
        .eq("id", employee.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating employee:", error);

        if (error.code === "23505") {
          // Unique constraint violation
          if (error.message.includes("email")) {
            setValidationErrors({
              email: "This email is already used by another employee",
            });
          } else if (error.message.includes("rfid_tag")) {
            setValidationErrors({
              rfidTag: "This RFID tag is already assigned to another employee",
            });
          } else {
            toast({
              title: "Error Updating Employee",
              description: "A duplicate record exists.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Error Updating Employee",
            description: error.message || "Could not update employee details.",
            variant: "destructive",
          });
        }
      } else if (data) {
        toast({
          title: "Success",
          description: `${data.name}'s details updated.`,
        });
        onSuccess(data as Employee);
      }
    } catch (e) {
      console.error("Unexpected error during employee update:", e);
      toast({
        title: "Error Updating Employee",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-effect">
        <DialogHeader>
          <DialogTitle>Edit Employee: {employee.name}</DialogTitle>
          <DialogDescription>
            Update the employee's details. Fields marked with{" "}
            <span className="text-destructive">*</span> are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-3">
            <div className="space-y-1">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving || isScanning}
                className={validationErrors.name ? "border-destructive" : ""}
              />
              {validationErrors.name && (
                <p className="text-xs text-destructive mt-1">
                  {validationErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSaving || isScanning}
                className={validationErrors.email ? "border-destructive" : ""}
              />
              {validationErrors.email && (
                <p className="text-xs text-destructive mt-1">
                  {validationErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-rfid">RFID Tag</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-rfid"
                  value={rfidTag || ""}
                  onChange={(e) => setRfidTag(e.target.value)}
                  className={`flex-grow ${validationErrors.rfidTag ? "border-destructive" : ""}`}
                  placeholder="Scan or enter tag ID"
                  disabled={isSaving || isScanning}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleScanRfid}
                  disabled={isScanning || isSaving}
                  className="px-3 shrink-0"
                >
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Scan</span>
                </Button>
              </div>
              {validationErrors.rfidTag && (
                <p className="text-xs text-destructive mt-1">
                  {validationErrors.rfidTag}
                </p>
              )}
              {isScanning && (
                <p className="text-xs text-primary flex items-center justify-center gap-1 mt-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Waiting for RFID
                  scan...
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isSaving || isScanning}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-position">Position</Label>
              <Input
                id="edit-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={isSaving || isScanning}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-hourlyRate">Hourly Rate</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className={`pl-8 ${validationErrors.hourlyRate ? "border-destructive" : ""}`}
                  placeholder="e.g., 15.50"
                  disabled={isSaving || isScanning}
                />
              </div>
              {validationErrors.hourlyRate && (
                <p className="text-xs text-destructive mt-1">
                  {validationErrors.hourlyRate}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving || isScanning}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
