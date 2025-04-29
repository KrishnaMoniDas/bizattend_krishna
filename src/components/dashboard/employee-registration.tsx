'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Import DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Pencil, Trash2, Nfc, ScanLine, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

// Mock Employee Data Structure
interface Employee {
  id: string;
  name: string;
  email: string;
  rfidTag: string | null;
}

// Mock API functions (replace with actual API calls to your backend)
async function fetchEmployees(): Promise<Employee[]> {
  console.log('Fetching employees...');
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
  // Replace with actual fetch
  const mockData: Employee[] = [
    { id: 'EMP001', name: 'Alice Smith', email: 'alice@example.com', rfidTag: 'A1B2C3D4' },
    { id: 'EMP002', name: 'Bob Johnson', email: 'bob@example.com', rfidTag: null },
    { id: 'EMP003', name: 'Charlie Brown', email: 'charlie@example.com', rfidTag: 'E5F6G7H8' },
  ];
   // Retrieve from localStorage if available (for demo persistence)
   const storedEmployees = localStorage.getItem('bizattend_employees');
   return storedEmployees ? JSON.parse(storedEmployees) : mockData;
}

async function saveEmployee(employee: Omit<Employee, 'id'> & { id?: string }): Promise<Employee> {
  console.log('Saving employee:', employee);
  await new Promise(resolve => setTimeout(resolve, 500));
  const newId = employee.id || `EMP${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const savedEmployee = { ...employee, id: newId };

   // Update localStorage for demo
   const employees = await fetchEmployees();
   const index = employees.findIndex(e => e.id === savedEmployee.id);
   if (index > -1) {
     employees[index] = savedEmployee;
   } else {
     employees.push(savedEmployee);
   }
   localStorage.setItem('bizattend_employees', JSON.stringify(employees));

  return savedEmployee;
}

async function deleteEmployee(employeeId: string): Promise<void> {
    console.log('Deleting employee:', employeeId);
    await new Promise(resolve => setTimeout(resolve, 400));

    // Update localStorage for demo
    let employees = await fetchEmployees();
    employees = employees.filter(e => e.id !== employeeId);
    localStorage.setItem('bizattend_employees', JSON.stringify(employees));
}


// Mock function to simulate scanning RFID/NFC via ESP32
// In a real app, this would involve WebSockets, MQTT, or polling an API endpoint
// that the ESP32 updates.
async function scanRfidTag(): Promise<string | null> {
  console.log('Initiating RFID scan...');
  // Simulate waiting for a scan
  await new Promise(resolve => setTimeout(resolve, 2500));
  // Simulate success or failure/timeout
  if (Math.random() > 0.2) {
    const randomTag = Math.random().toString(16).substring(2, 10).toUpperCase();
    console.log('RFID tag scanned:', randomTag);
    return randomTag;
  } else {
    console.log('RFID scan timed out or failed.');
    return null;
  }
}

export function EmployeeRegistration() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false); // Fixed: Added '='
  const [isScanning, setIsScanning] = useState<boolean>(false); // Fixed: Added '='
  const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
   const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError('Could not load employee data.');
      toast({ title: 'Error', description: 'Failed to load employees.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentEmployee({});
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setCurrentEmployee({ ...employee });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

   const handleDelete = async (employeeId: string) => {
      // Use confirm for simplicity; consider a confirmation dialog for better UX
      const confirmed = window.confirm('Are you sure you want to delete this employee?');
      if (!confirmed) return;
      try {
         await deleteEmployee(employeeId);
         toast({ title: 'Success', description: 'Employee deleted.' });
         loadEmployees(); // Refresh list
      } catch (err) {
          console.error('Failed to delete employee:', err);
          toast({ title: 'Error', description: 'Could not delete employee.', variant: 'destructive' });
      }
   };

  const handleScanRfid = async () => {
    setIsScanning(true);
    try {
      const tagId = await scanRfidTag();
      if (tagId) {
        setCurrentEmployee(prev => ({ ...prev, rfidTag: tagId }));
        toast({ title: 'RFID Scanned', description: `Tag ID: ${tagId}` });
      } else {
        toast({ title: 'Scan Failed', description: 'No RFID tag detected.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('RFID scan error:', err);
      toast({ title: 'Scan Error', description: 'Could not complete scan.', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentEmployee.name || !currentEmployee.email) {
      toast({ title: 'Missing Information', description: 'Please fill in name and email.', variant: 'destructive' });
      return;
    }

    try {
      // Type assertion is okay here after validation checks
      await saveEmployee(currentEmployee as Omit<Employee, 'id'> & { id?: string });
      toast({ title: 'Success', description: `Employee ${isEditMode ? 'updated' : 'added'}.` });
      setIsDialogOpen(false);
      loadEmployees(); // Refresh the list
    } catch (err) {
      console.error('Failed to save employee:', err);
      toast({ title: 'Error', description: 'Could not save employee.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center">
         <p className="text-sm text-muted-foreground">Register new employees and assign RFID tags.</p>
         <Button onClick={handleAddNew} size="sm">
           <UserPlus className="mr-2 h-4 w-4" /> Add New
         </Button>
       </div>

       {isLoading ? (
         <div className="space-y-2">
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-10 w-full" />
         </div>
       ) : error ? (
           <Alert variant="destructive">
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
           </Alert>
       ) : (
        <ScrollArea className="h-[250px] pr-4"> {/* Adjust height as needed */}
         <div className="space-y-2">
           {employees.length === 0 ? (
             <p className="text-center text-muted-foreground py-4">No employees found.</p>
           ) : (
             employees.map(emp => (
               <div key={emp.id} className="flex items-center justify-between p-2 border rounded-md bg-background/50 hover:bg-accent/10 transition-colors">
                 <div>
                   <p className="font-medium">{emp.name}</p>
                   <p className="text-xs text-muted-foreground">{emp.email}</p>
                   <p className={`text-xs ${emp.rfidTag ? 'text-primary' : 'text-muted-foreground'}`}>
                     RFID: {emp.rfidTag || 'Not Assigned'}
                   </p>
                 </div>
                 <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(emp)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                    </Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(emp.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                     </Button>
                 </div>
               </div>
             ))
           )}
         </div>
         </ScrollArea>
       )}


      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the employee details and RFID tag.' : 'Enter details for the new employee and assign an RFID tag.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={currentEmployee.name || ''}
                  onChange={(e) => setCurrentEmployee(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={currentEmployee.email || ''}
                  onChange={(e) => setCurrentEmployee(prev => ({ ...prev, email: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rfid" className="text-right">
                  RFID Tag
                </Label>
                <Input
                  id="rfid"
                  value={currentEmployee.rfidTag || ''}
                  onChange={(e) => setCurrentEmployee(prev => ({ ...prev, rfidTag: e.target.value }))}
                  className="col-span-2"
                  placeholder="Scan or enter manually"
                />
                <Button type="button" variant="outline" onClick={handleScanRfid} disabled={isScanning} className="col-span-1">
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                  <span className="sr-only">Scan RFID</span>
                </Button>
              </div>
              {isScanning && (
                 <p className="col-span-4 text-center text-sm text-primary flex items-center justify-center gap-2">
                   <Loader2 className="h-4 w-4 animate-spin" /> Waiting for RFID scan from device...
                 </p>
              )}
            </div>
            <DialogFooter>
               <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{isEditMode ? 'Save Changes' : 'Add Employee'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
