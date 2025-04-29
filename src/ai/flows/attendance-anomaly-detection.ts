'use server';
/**
 * @fileOverview AI-powered tool to detect and flag attendance irregularities.
 *
 * - attendanceAnomalyDetection - A function that handles the attendance anomaly detection process.
 * - AttendanceAnomalyDetectionInput - The input type for the attendanceAnomalyDetection function.
 * - AttendanceAnomalyDetectionOutput - The return type for the attendanceAnomalyDetection function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AttendanceAnomalyDetectionInputSchema = z.object({
  employeeId: z.string().describe('The ID of the employee.'),
  clockInTime: z.string().describe('The clock-in time of the employee (ISO format).'),
  clockOutTime: z.string().describe('The clock-out time of the employee (ISO format).'),
  expectedClockInTime: z.string().describe('The expected clock-in time of the employee (ISO format).'),
  expectedClockOutTime: z.string().describe('The expected clock-out time of the employee (ISO format).'),
});
export type AttendanceAnomalyDetectionInput = z.infer<typeof AttendanceAnomalyDetectionInputSchema>;

const AttendanceAnomalyDetectionOutputSchema = z.object({
  isAnomaly: z.boolean().describe('Whether the attendance record is an anomaly.'),
  anomalyExplanation: z.string().describe('The explanation of why the attendance record is an anomaly.'),
});
export type AttendanceAnomalyDetectionOutput = z.infer<typeof AttendanceAnomalyDetectionOutputSchema>;

export async function attendanceAnomalyDetection(input: AttendanceAnomalyDetectionInput): Promise<AttendanceAnomalyDetectionOutput> {
  return attendanceAnomalyDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'attendanceAnomalyDetectionPrompt',
  input: {
    schema: AttendanceAnomalyDetectionInputSchema, // Use the Zod schema directly
  },
  output: {
    schema: AttendanceAnomalyDetectionOutputSchema, // Use the Zod schema directly
  },
  prompt: `You are an AI expert in detecting anomalies in employee attendance records.

You will receive the employee ID, clock-in time, clock-out time, expected clock-in time, and expected clock-out time.

You will determine if the attendance record is an anomaly and provide an explanation.

Employee ID: {{{employeeId}}}
Clock-in time: {{{clockInTime}}}
Clock-out time: {{{clockOutTime}}}
Expected clock-in time: {{{expectedClockInTime}}}
Expected clock-out time: {{{expectedClockOutTime}}}

Is this attendance record an anomaly? Respond with a boolean (true/false) in the 'isAnomaly' field.
Explain why or why not this attendance record is an anomaly in the 'anomalyExplanation' field. Focus on the magnitude and reason for the anomaly (e.g., "Clocked in 1 hour 30 minutes late", "Clocked out 30 minutes early", "Times are within expected range").`,
});


const attendanceAnomalyDetectionFlow = ai.defineFlow<
  typeof AttendanceAnomalyDetectionInputSchema,
  typeof AttendanceAnomalyDetectionOutputSchema
>(
  {
    name: 'attendanceAnomalyDetectionFlow',
    inputSchema: AttendanceAnomalyDetectionInputSchema,
    outputSchema: AttendanceAnomalyDetectionOutputSchema,
  },
  async (input): Promise<AttendanceAnomalyDetectionOutput> => { // Explicit return type
    try {
      const result = await prompt(input);

      // Check if the response or the output property is missing or falsy
      if (!result?.output) {
        console.error("AI prompt response missing 'output' field or output is falsy.", result);
        // Return a structured error response matching the output schema
        return {
          isAnomaly: true, // Default to anomaly on error to ensure flagging
          anomalyExplanation: "Error: AI analysis failed to produce a valid output structure.",
        };
      }

      // Validate the output against the schema explicitly using safeParse for robustness
      const parseResult = AttendanceAnomalyDetectionOutputSchema.safeParse(result.output);
      if (!parseResult.success) {
          console.error("AI prompt output failed schema validation:", parseResult.error, "Raw output:", result.output);
           // Return a structured error response matching the output schema
           return {
              isAnomaly: true, // Default to anomaly on error
              anomalyExplanation: "Error: AI output format is invalid.",
           };
      }

      // If checks pass, parseResult.data contains the validated output
      return parseResult.data;

    } catch (error) {
        console.error("Error during attendanceAnomalyDetectionFlow execution:", error);
         // Return a structured error response matching the output schema
        return {
          isAnomaly: true, // Default to anomaly on error
          anomalyExplanation: `Error: An exception occurred during AI analysis. ${error instanceof Error ? error.message : String(error)}`,
        };
        // Alternatively, rethrow if the caller should handle exceptions differently:
        // throw new Error(`Anomaly detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
