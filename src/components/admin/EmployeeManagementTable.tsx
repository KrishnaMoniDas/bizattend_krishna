"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  UserPlus,
  Edit3,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { DeleteEmployeeConfirmDialog } from "./DeleteEmployeeConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
const DEBOUNCE_DELAY = 300; // ms

export function EmployeeManagementTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isCrudInProgress, setIsCrudInProgress] = useState(false);

  const { toast } = useToast();

  // Handle search term changes with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch employees from Supabase
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("employees")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to);

      if (debouncedSearchTerm) {
        query = query.or(
          `name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,rfid_tag.ilike.%${debouncedSearchTerm}%`,
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching employees:", error.message);
        setError(`Failed to load employees. ${error.message}`);
        toast({
          title: "Error",
          description: "Could not fetch employee data.",
          variant: "destructive",
        });
        setEmployees([]);
        setTotalEmployees(0);
      } else {
        setEmployees(data || []);
        setTotalEmployees(count || 0);
      }
    } catch (err: any) {
      console.error("Unexpected error in fetchEmployees:", err);
      setError("An unexpected error occurred while fetching employees.");
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      setEmployees([]);
      setTotalEmployees(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, toast]);

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle employee actions
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

  const handleAddSuccess = (newEmployee: Employee) => {
    // If we're on the first page or there are no employees yet, refresh to show the new employee
    if (currentPage === 1 || totalEmployees === 0) {
      fetchEmployees();
    } else {
      // Otherwise, just update the count
      setTotalEmployees((prev) => prev + 1);
      toast({
        title: "Success",
        description: `${newEmployee.name} added successfully.`,
      });
    }
    setIsAddDialogOpen(false);
  };

  const handleEditSuccess = (updatedEmployee: Employee) => {
    // Update the employee in the local state for immediate UI update
    setEmployees((prevEmployees) =>
      prevEmployees.map((emp) =>
        emp.id === updatedEmployee.id ? updatedEmployee : emp,
      ),
    );
    toast({
      title: "Success",
      description: `${updatedEmployee.name}'s details updated.`,
    });
    setIsEditDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleDeleteSuccess = () => {
    if (selectedEmployee) {
      // Update local state
      setEmployees((prevEmployees) =>
        prevEmployees.filter((emp) => emp.id !== selectedEmployee.id),
      );
      setTotalEmployees((prev) => prev - 1);

      toast({
        title: "Success",
        description: `Employee deleted successfully.`,
      });
    }
    setIsDeleteDialogOpen(false);
    setSelectedEmployee(null);
  };

  // Calculate total pages for pagination
  const totalPages = Math.max(1, Math.ceil(totalEmployees / ITEMS_PER_PAGE));

  // Memoized pagination controls
  const paginationControls = useMemo(
    () => (
      <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-2">
        <span className="text-sm text-muted-foreground order-2 sm:order-1">
          Page {currentPage} of {totalPages} ({totalEmployees} employees)
        </span>
        <div className="flex gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isLoading || isCrudInProgress}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={
              currentPage === totalPages ||
              totalPages === 0 ||
              isLoading ||
              isCrudInProgress
            }
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    ),
    [currentPage, totalPages, totalEmployees, isLoading, isCrudInProgress],
  );

  // Show error if not also loading
  if (error && !isLoading) {
    return (
      <div className="text-destructive p-4 border border-destructive/50 bg-destructive/10 rounded-md flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by name, email, RFID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
            disabled={isLoading || isCrudInProgress}
          />
        </div>
        <Button
          onClick={handleAddEmployee}
          disabled={isLoading || isCrudInProgress}
          className="w-full sm:w-auto"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* Employees Table */}
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
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-24 sm:w-32" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-32 sm:w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 sm:w-24" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-5 w-16 sm:w-20" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-5 w-16 sm:w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto rounded-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : !isLoading && employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  <Search className="mx-auto h-10 w-10 opacity-50 mb-2" />
                  No employees found.
                  {debouncedSearchTerm && (
                    <p className="text-sm">
                      Try adjusting your search or add a new employee.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id} className="group">
                  <TableCell className="font-medium py-3">
                    {employee.name}
                    {employee.hourly_rate && (
                      <span className="ml-2 hidden group-hover:inline-flex md:group-hover:hidden items-center text-muted-foreground text-xs">
                        <DollarSign className="h-3 w-3 mr-0.5" />
                        {employee.hourly_rate}/hr
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-3">
                    {employee.email}
                  </TableCell>
                  <TableCell className="py-3">
                    {employee.rfid_tag ? (
                      <Badge
                        variant="secondary"
                        className="text-xs whitespace-nowrap"
                      >
                        {employee.rfid_tag}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        N/A
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-3">
                    {employee.department || "N/A"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-3">
                    {employee.position || "N/A"}
                  </TableCell>
                  <TableCell className="text-right py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={isCrudInProgress}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditEmployee(employee)}
                        >
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

      {/* Pagination */}
      {totalEmployees > 0 && paginationControls}

      {/* CRUD Dialogs */}
      <AddEmployeeDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
        onProcessingStateChange={setIsCrudInProgress}
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
            onSuccess={handleEditSuccess}
            onProcessingStateChange={setIsCrudInProgress}
          />

          <DeleteEmployeeConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setSelectedEmployee(null);
            }}
            employeeName={selectedEmployee.name}
            employeeId={selectedEmployee.id}
            onSuccess={handleDeleteSuccess}
            onProcessingStateChange={setIsCrudInProgress}
          />
        </>
      )}
    </div>
  );
}
