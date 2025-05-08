'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ScanLine, DollarSign } from 'lucide-react';
import type { Employee } from './EmployeeManagementTable';

interface AddEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmployee: Employee) => void;
}

async function scanRfidTag(): Promise<string | null> {
  console.log('Initiating RFID scan for new employee...');
  // Simulate network delay and hardware interaction
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
  if (Math.random() > 0.2) { // 80% chance of "successful" scan
    const randomTag = `RFID_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    console.log('RFID tag scanned:', randomTag);
    return randomTag;
  }
  console.log('RFID scan timed out or failed.');
  return null;
}


export function AddEmployeeDialog({ isOpen, onClose, onSuccess }: AddEmployeeDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rfidTag, setRfidTag] = useState<string | null>(null);
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes or when isOpen changes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setRfidTag(null);
      setDepartment('');
      setPosition('');
      setHourlyRate('');
    }
    setIsSaving(false);
    setIsScanning(false);
  }, [isOpen]);

  const handleScanRfid = async () => {
    setIsScanning(true);
    try {
      const tagId = await scanRfidTag();
      if (tagId) {
        setRfidTag(tagId);
        toast({ title: 'RFID Scanned', description: `Tag ID: ${tagId}`, variant: "default" });
      } else {
        toast({ title: 'Scan Failed', description: 'No RFID tag detected. You can enter it manually.', variant: 'default' });
      }
    } catch (err) {
      console.error('RFID scan error:', err);
      toast({ title: 'Scan Error', description: 'An error occurred during scanning.', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Missing Information', description: 'Employee Name and Email are required.', variant: 'destructive' });
      return;
    }
    // Optional: email format validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
        return;
    }

    setIsSaving(true);

    const newEmployeeData = {
      name: name.trim(),
      email: email.trim(),
      rfid_tag: rfidTag ? rfidTag.trim() : null,
      department: department.trim() || null,
      position: position.trim() || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
    };

    const { data, error } = await supabase
      .from('employees')
      .insert([newEmployeeData])
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.error('Error adding employee:', error);
      toast({
        title: 'Error Adding Employee',
        description: error.code === '23505' // unique_violation
            ? `An employee with this ${error.message.includes('email') ? 'email' : 'RFID tag'} already exists.`
            : error.message || 'Could not save employee details.',
        variant: 'destructive',
      });
    } else if (data) {
      toast({ title: 'Success', description: `${data.name} added successfully.` });
      onSuccess(data as Employee);
      onClose(); // Close dialog on success
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-effect">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Enter the details for the new employee. Fields marked with <span className="text-destructive">*</span> are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-3 space-y-3">
            <div>
              <Label htmlFor="add-name">Name <span className="text-destructive">*</span></Label>
              <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving || isScanning} className="mt-1"/>
            </div>
            <div>
              <Label htmlFor="add-email">Email <span className="text-destructive">*</span></Label>
              <Input id="add-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSaving || isScanning} className="mt-1"/>
            </div>
            <div>
              <Label htmlFor="add-rfid">RFID Tag</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input id="add-rfid" value={rfidTag || ''} onChange={(e) => setRfidTag(e.target.value)} className="flex-grow" placeholder="Scan or enter tag ID" disabled={isSaving || isScanning}/>
                <Button type="button" variant="outline" onClick={handleScanRfid} disabled={isScanning || isSaving} className="px-3 shrink-0">
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Scan</span>
                </Button>
              </div>
              {isScanning && (
                 <p className="text-xs text-primary flex items-center justify-center gap-1 mt-1">
                   <Loader2 className="h-3 w-3 animate-spin" /> Waiting for RFID scan from device...
                 </p>
              )}
            </div>
            <div>
              <Label htmlFor="add-department">Department</Label>
              <Input id="add-department" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={isSaving || isScanning} className="mt-1"/>
            </div>
            <div>
              <Label htmlFor="add-position">Position</Label>
              <Input id="add-position" value={position} onChange={(e) => setPosition(e.target.value)} disabled={isSaving || isScanning} className="mt-1"/>
            </div>
             <div>
              <Label htmlFor="add-hourlyRate">Hourly Rate</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="add-hourlyRate" type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="pl-8" placeholder="e.g., 15.50" disabled={isSaving || isScanning}/>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving || isScanning}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Employee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
