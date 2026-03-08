# Vyahe App

A ride-hailing and delivery application built with React, Vite, Tailwind CSS, and Supabase.

## Features

- **PWA Support**: Installable on mobile and desktop.
- **Tailwind CSS**: Modern styling.
- **Supabase Integration**: Real authentication and database.
- **Role-based Access**: Customer, Rider, and Admin roles.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Ensure you have a `.env` file in the root directory with the following keys:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

4.  **Build for Production**:
    ```bash
    npm run build
    ```

5.  **Preview Production Build**:
    ```bash
    npm run preview
    ```

## PWA

The app is configured as a Progressive Web App. It will cache assets for offline use and can be installed on supported devices.
- Manifest configuration is in `vite.config.ts`.
- Service worker is handled by `vite-plugin-pwa`.

## Database Schema

Ensure your Supabase database has the following table:

- `VYAHE_ridercustomer_users`
    - `id` (uuid, primary key, references auth.users)
    - `name` (text)
    - `email` (text)
    - `phone` (text)
    - `role` (text)
    - `is_online` (boolean, default false)
    - `latitude` (float8, nullable)
    - `longitude` (float8, nullable)
    - `created_at` (timestamptz, default now())

And appropriate RLS policies to allow users to read/write their own data.
