# Supabase Database Seeding Instructions

This document provides instructions on how to seed your Supabase database using the `supabase/seed.sql` script. This script initializes the necessary tables (`employees`, `attendance_records`) for the BizAttend application and can optionally insert sample data.

## Prerequisites

1.  **Supabase Project:** You need an active Supabase project.
2.  **Supabase CLI (Recommended for local development):** If you're working locally or want to integrate this into a CI/CD pipeline, install the [Supabase CLI](https://supabase.com/docs/guides/cli).
3.  **Environment Variables:** Ensure your Next.js application has the Supabase URL and Anon Key correctly set in your `.env` (or `.env.local`) file, as these are used by the application to connect to Supabase. The seed script itself is run directly against the database.

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    ```

## Methods to Run the Seed Script

There are two primary ways to run the `seed.sql` script:

### Method 1: Using Supabase Studio (Easiest for one-time setup)

This method is suitable for quick setup or if you prefer a GUI.

1.  **Navigate to Supabase Studio:**
    *   Go to [app.supabase.com](https://app.supabase.com).
    *   Select your project.

2.  **Open SQL Editor:**
    *   In the left sidebar, click on the "SQL Editor" icon (looks like a database symbol).

3.  **Run the Script:**
    *   Click on "+ New query".
    *   Copy the entire content of the `supabase/seed.sql` file from your project.
    *   Paste the content into the SQL editor.
    *   Click the "Run" button (or press `Ctrl+Enter` / `Cmd+Enter`).

    The script will execute, creating tables and inserting sample data. You should see a success message like "Database seeded successfully..." if the script completes without errors.

### Method 2: Using Supabase CLI (Recommended for local development & automation)

The Supabase CLI handles seeding automatically when you reset your local database or start your local development environment.

1.  **Install Supabase CLI:**
    If you haven't already, install the CLI following the instructions [here](https://supabase.com/docs/guides/cli/getting-started).

2.  **Initialize Supabase in your project (if not done):**
    ```bash
    supabase init
    ```
    This creates a `supabase` directory in your project. The `seed.sql` file should be placed at `supabase/seed.sql`.

3.  **Link to your Supabase project (if not done):**
    ```bash
    supabase login
    supabase link --project-ref YOUR_PROJECT_REF
    ```
    Replace `YOUR_PROJECT_REF` with your actual project reference ID from your Supabase project's settings (Settings > General > Project ID). You might be prompted for your database password.

4.  **Running the Seed Script:**

    *   **For Local Development (Automatic):**
        When you start your local Supabase services, the `supabase/seed.sql` file is automatically executed after migrations.
        ```bash
        supabase start
        ```
        If you want to reset your local database and re-apply migrations and the seed script:
        ```bash
        supabase db reset
        ```
        This command drops your local database, re-applies all migrations, and then runs `supabase/seed.sql`.

    *   **Applying to a Remote (Staging/Prod) Database (Manual Execution - Use with Caution):**
        If you need to run the seed script against a deployed Supabase instance and it's not part of an automated migration process, you can use the SQL Editor (Method 1) or pipe the SQL to `psql` using the database connection string.
        **Caution:** Running `DROP TABLE` commands (as present in the seed script for idempotency during development) on a production database can lead to data loss. Ensure you understand the script's impact. For production, schema changes should ideally be managed via migrations, and data seeding should be done carefully.

        To run manually via `psql` (obtain connection string from Supabase Dashboard > Settings > Database > Connection string):
        ```bash
        cat supabase/seed.sql | psql "YOUR_SUPABASE_CONNECTION_STRING"
        ```

## Important Notes

*   **Idempotency:** The provided `seed.sql` script includes `DROP TABLE IF EXISTS ... CASCADE;` commands. This means running the script multiple times will first delete the existing `employees` and `attendance_records` tables (and any data in them) before recreating them. This is useful for development to ensure a clean state but is destructive. Be cautious when running this on databases with important data.
*   **NextAuth Tables:** The `seed.sql` script **does not** create tables for NextAuth.js (`users`, `accounts`, `sessions`, `verification_tokens`). The Supabase Adapter for NextAuth.js, configured in `src/app/api/auth/[...nextauth]/route.ts`, will automatically create and manage these tables when it first connects to the database or when a user interacts with the authentication system.
*   **Admin User:** The admin user (defined by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your environment variables) is handled by the NextAuth.js credentials provider. Upon the first successful login with these credentials, the NextAuth Supabase adapter will create an entry for this user in its `users` table.
*   **Sample Data:** The script includes sample employee data. You can modify or remove this section as needed.
*   **Error Handling:** If you encounter errors, check the output in the Supabase Studio SQL Editor console or your terminal if using the CLI. Common issues include syntax errors in the SQL or permission problems.

By following these instructions, you can successfully set up the database schema for your BizAttend application.
