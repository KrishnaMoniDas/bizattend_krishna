'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus, Edit3, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddEmployeeDialog } from './AddEmployeeDialog';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { DeleteEmployeeConfirmDialog } from './DeleteEmployeeConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export interface Employee {
  id: string; 
  created_at: string;
  name: string;
  email: string;
  rfid_tag: string | null;
  department?: string | null; 
  position?: string | null; 
  hourly_rate?: number | null;
}

const ITEMS_PER_PAGE = 10;

export function EmployeeManagementTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const fetchEmployees = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true }) // Sort by name
      .range(from, to);

    if (debouncedSearchTerm) {
      query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,rfid_tag.ilike.%${debouncedSearchTerm}%`);
    }
    
    if (signal) {
        query.abortSignal(signal);
    }

    const { data, error: dbError, count } = await query;

    if (dbError) {
      if (dbError.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error('Error fetching employees:', dbError);
      setError('Failed to load employees. ' + dbError.message);
      toast({ title: 'Error', description: 'Could not fetch employee data.', variant: 'destructive' });
      setEmployees([]); // Clear employees on error
      setTotalEmployees(0);
    } else {
      setEmployees(data || []);
      setTotalEmployees(count || 0);
    }
    setIsLoading(false);
  }, [currentPage, debouncedSearchTerm, toast]);

  useEffect(() => {
    const abortController = new AbortController();
    startTransition(() => {
        fetchEmployees(abortController.signal);
    });
    return () => abortController.abort();
  }, [fetchEmployees]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce for search term
    return () => clearTimeout(handler);
  }, [searchTerm]);


  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsAddDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };
  
  const totalPages = Math.ceil(totalEmployees / ITEMS_PER_PAGE);

  const paginationControls = useMemo(() => (
    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-2">
      <span className="text-sm text-muted-foreground order-2 sm:order-1">
        Page {currentPage} of {totalPages > 0 ? totalPages : 1} ({totalEmployees} employees)
      </span>
      <div className="flex gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1 || isLoading || isPending}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages || totalPages === 0 || isLoading || isPending}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  ), [currentPage, totalPages, totalEmployees, isLoading, isPending]);


  if (error && !isLoading) { // Show error only if not also loading initial data
    return (
      <div className="text-destructive p-4 border border-destructive/50 bg-destructive/10 rounded-md flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                type="search"
                placeholder="Search by name, email, RFID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                disabled={isPending}
            />
        </div>
        <Button onClick={handleAddEmployee} disabled={isPending} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>RFID Tag</TableHead>
              <TableHead className="hidden lg:table-cell">Department</TableHead>
              <TableHead className="hidden lg:table-cell">Position</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || isPending) && employees.length === 0 ? (
              [...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-24 sm:w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32 sm:w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 sm:w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16 sm:w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16 sm:w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
              ))
            ) : !isLoading && !isPending && employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <Search className="mx-auto h-10 w-10 opacity-50 mb-2" />
                  No employees found.
                  {debouncedSearchTerm && <p className="text-sm">Try adjusting your search or add a new employee.</p>}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium py-3">{employee.name}</TableCell>
                  <TableCell className="hidden md:table-cell py-3">{employee.email}</TableCell>
                  <TableCell className="py-3">
                    {employee.rfid_tag ? (
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">{employee.rfid_tag}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-3">{employee.department || 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell py-3">{employee.position || 'N/A'}</TableCell>
                  <TableCell className="text-right py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalEmployees > 0 && paginationControls}

      <AddEmployeeDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => {
          fetchEmployees(); // Re-fetch on success
          setIsAddDialogOpen(false);
        }}
      />
      {selectedEmployee && (
        <>
          <EditEmployeeDialog
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            onSuccess={() => {
              fetchEmployees(); // Re-fetch on success
              setIsEditDialogOpen(false);
              setSelectedEmployee(null);
            }}
          />
          <DeleteEmployeeConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setSelectedEmployee(null);
            }}
            employeeName={selectedEmployee.name}
            employeeId={selectedEmployee.id}
            onSuccess={() => {
              fetchEmployees(); // Re-fetch on success
              setIsDeleteDialogOpen(false);
              setSelectedEmployee(null);
            }}
          />
        </>
      )}
    </div>
  );
}
