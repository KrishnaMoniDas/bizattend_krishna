import { supabase } from '@/lib/supabaseClient';
import { format, differenceInMinutes, differenceInCalendarWeeks, startOfWeek, endOfWeek, addWeeks, eachWeekOfInterval } from 'date-fns';

export interface Payroll {
  employeeId: string;
  employeeName?: string;
  totalWorkHours: number;
  overtimeHours: number;
  totalSalary: number;
  payPeriod: string;
  hourlyRate: number;
  overtimeRate: number;
  regularHours: number; // Added for clarity
}

const DEFAULT_HOURLY_RATE = 20; // Example: Increased default rate
const OVERTIME_THRESHOLD_HOURS_PER_WEEK = 40;
const OVERTIME_MULTIPLIER = 1.5;

export async function calculatePayroll(
  employeeId: string,
  startDate: Date, // Start of the pay period
  endDate: Date   // End of the pay period
): Promise<Payroll> {
  
  const { data: employeeData, error: employeeError } = await supabase
    .from('employees')
    .select('name, hourly_rate')
    .eq('id', employeeId)
    .single();

  if (employeeError) {
    console.error('Error fetching employee details for payroll:', employeeError);
    throw new Error(`Failed to fetch employee details: ${employeeError.message}`);
  }
  
  const hourlyRate = employeeData?.hourly_rate || DEFAULT_HOURLY_RATE;
  const overtimeRate = hourlyRate * OVERTIME_MULTIPLIER;

  // Fetch all completed attendance records for the employee that overlap with the pay period
  // We fetch slightly broader and then filter, to correctly attribute hours to weeks.
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('clock_in_time, clock_out_time')
    .eq('employee_id', employeeId)
    .gte('clock_in_time', startOfWeek(startDate, { weekStartsOn: 1 }).toISOString()) // Start of the week of pay period start
    .lte('clock_in_time', endOfWeek(endDate, { weekStartsOn: 1 }).toISOString())   // End of the week of pay period end
    .eq('status', 'clocked_out') // Only consider completed shifts
    .order('clock_in_time', { ascending: true });

  if (attendanceError) {
    console.error('Error fetching attendance records for payroll:', attendanceError);
    throw new Error(`Failed to fetch attendance records: ${attendanceError.message}`);
  }

  let totalRegularMinutes = 0;
  let totalOvertimeMinutes = 0;

  // Determine weeks within the pay period for accurate weekly overtime calculation
  const weeksInPayPeriod = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 1 } // Monday as start of week, adjust if needed
  );

  for (const weekStart of weeksInPayPeriod) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    let weeklyMinutes = 0;

    attendanceRecords?.forEach(record => {
      if (record.clock_in_time && record.clock_out_time) {
        const clockIn = new Date(record.clock_in_time);
        const clockOut = new Date(record.clock_out_time);

        // Check if the shift falls within the current week being processed
        if (clockIn >= weekStart && clockIn <= weekEnd) {
          const minutesWorkedThisShift = differenceInMinutes(clockOut, clockIn);
          if (minutesWorkedThisShift > 0) {
            weeklyMinutes += minutesWorkedThisShift;
          }
        }
      }
    });
    
    const weeklyOvertimeThresholdMinutes = OVERTIME_THRESHOLD_HOURS_PER_WEEK * 60;
    if (weeklyMinutes > weeklyOvertimeThresholdMinutes) {
      totalOvertimeMinutes += (weeklyMinutes - weeklyOvertimeThresholdMinutes);
      totalRegularMinutes += weeklyOvertimeThresholdMinutes;
    } else {
      totalRegularMinutes += weeklyMinutes;
    }
  }

  const totalRegularHours = parseFloat((totalRegularMinutes / 60).toFixed(2));
  const totalOvertimeHours = parseFloat((totalOvertimeMinutes / 60).toFixed(2));
  const totalWorkHours = totalRegularHours + totalOvertimeHours;
  
  const regularPay = totalRegularHours * hourlyRate;
  const overtimePay = totalOvertimeHours * overtimeRate;
  const totalSalary = parseFloat((regularPay + overtimePay).toFixed(2));

  return {
    employeeId: employeeId,
    employeeName: employeeData?.name || 'Employee',
    totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
    regularHours: totalRegularHours,
    overtimeHours: totalOvertimeHours,
    totalSalary: totalSalary,
    payPeriod: `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`,
    hourlyRate: hourlyRate,
    overtimeRate: overtimeRate,
  };
}
