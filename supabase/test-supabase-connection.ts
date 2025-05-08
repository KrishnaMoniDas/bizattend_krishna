import { supabase } from "@/lib/supabaseClient";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testSupabaseConnection() {
  console.log("Attempting to connect to Supabase and fetch data...");
  console.log(
    `Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + "..." : "Not set"}`,
  );

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error("Supabase connection test FAILED.");
    console.error(
      "Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are not set.",
    );
    console.error(
      "Please ensure these variables are defined in your environment or .env file and loaded correctly.",
    );
    process.exit(1);
  }

  try {
    // Attempt to fetch the count and a single record from the 'employees' table
    const { data, error, count } = await supabase
      .from("employees")
      .select("id, name", { count: "exact" }) // request count along with data
      .limit(1); // limit to 1 record for efficiency

    if (error) {
      console.error("Supabase connection test FAILED. Error fetching data:");
      console.error(`Message: ${error.message}`);
      if (error.details) console.error(`Details: ${error.details}`);
      if (error.hint) console.error(`Hint: ${error.hint}`);
      if (error.code) console.error(`Code: ${error.code}`);

      if (error.message.includes('relation "employees" does not exist')) {
        console.warn(
          "\nHint: The 'employees' table was not found. This might mean the database schema has not been initialized. Please ensure you have run the seed script (see SEEDING_INSTRUCTIONS.md).",
        );
      } else if (
        error.message.includes("new row violates row-level security policy")
      ) {
        console.warn(
          "\nHint: Row Level Security (RLS) might be preventing access. Check your RLS policies for the 'employees' table for SELECT operations with the anon key.",
        );
      } else if (
        error.code === "PGRST000" ||
        error.message.includes("failed to fetch")
      ) {
        console.warn(
          "\nHint: This could be a network issue, incorrect Supabase URL, or the Supabase instance is not reachable.",
        );
      } else if (error.message.includes("Invalid API key")) {
        console.warn(
          "\nHint: The Supabase Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY) might be incorrect or expired.",
        );
      }

      process.exit(1); // Exit with error code
    } else {
      console.log("Supabase connection test SUCCESSFUL!");
      console.log(
        `Total employees count from 'employees' table: ${count === null ? "Not available" : count}`,
      );
      if (data && data.length > 0) {
        console.log(
          `Successfully fetched ${data.length} record(s). Example: ID=${data[0].id}, Name=${data[0].name}`,
        );
      } else if (count === 0) {
        console.log("The 'employees' table is accessible but currently empty.");
      } else {
        console.log(
          "Connected, but no sample data fetched (table might be empty or an issue with the query structure for fetching sample).",
        );
      }
      process.exit(0); // Exit with success code
    }
  } catch (e: any) {
    console.error(
      "Supabase connection test FAILED. An unexpected error occurred:",
    );
    console.error(e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1); // Exit with error code
  }
}

// Self-invoking function to run the test
(async () => {
  await testSupabaseConnection();
})();
