# heyPal!

**heyPal!** is a private, mobile-first event photo platform built with **Next.js 16**, **Google Sign-In**, and an embedded **SQLite / Local File Engine**. It is designed to run 100% independently on standard web hosting (specifically **Namecheap Hosting** via cPanel Node.js Application Manager / Phusion Passenger).

*Bawal Epal; use heyPal!*

It includes organizer event management, print-ready QR materials, attendee photo uploads with compression, real-time photo walls, interactive raffle wheel draws, and in-app ZIP photo exports.

---

## Architecture Overview

**heyPal!** is completely self-contained with **zero Azure cloud dependencies**:

* **Hosting**: Next.js Standalone server running on Namecheap cPanel via Phusion Passenger (`app.js`).
* **Authentication**: Native **Google Sign-In** (OAuth 2.0 / OpenID Connect) with cryptographic HMAC-SHA256 session management and Next.js Proxy route protection.
  * **Default Administrator**: `lloyd.miguel@gmail.com`.
  * **Domain Access**: Optional domain filtering via `HEYPAL_ALLOWED_EMAIL_DOMAINS` (or `*` for open access).
* **File Storage**: Local filesystem engine storing all assets within the `Events/` folder in the project directory:
  * `Events/covers/` — Event cover banners.
  * `Events/photos/<eventId>/` — Attendee submitted photos.
  * `Events/exports/<eventId>/` — Generated ZIP photo exports.
  * `Events/database/` — Embedded SQLite database (`heypal.db`).
* **Database**: Embedded SQLite (`node:sqlite`) with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and foreign key constraints for fast, non-blocking reads and concurrency.
* **Export Engine**: In-app streaming and background ZIP archive generator using Node.js streams and `archiver`, eliminating external queue/function workers.

---

## Directory Structure

```text
heypal/
├── Events/                         <-- Local media & data storage (gitignored)
│   ├── covers/                     <-- Event cover images
│   ├── photos/<eventId>/           <-- Attendee photos organized by event ID
│   ├── exports/<eventId>/          <-- Generated ZIP archives
│   └── database/                   <-- Embedded SQLite database (heypal.db)
├── src/
│   ├── app/
│   │   ├── admin/                  <-- Organizer event management, photo wall & raffle
│   │   ├── api/
│   │   │   ├── auth/               <-- Google OAuth & session endpoints
│   │   │   ├── media/[...path]/    <-- Authenticated media streaming route
│   │   │   ├── upload/             <-- Direct multipart photo upload
│   │   │   └── ...
│   │   ├── events/                 <-- Attendee album & live upload experience
│   │   ├── layout.tsx
│   │   └── page.tsx                <-- Landing page with Google Sign-in
│   ├── lib/
│   │   ├── db.ts                   <-- SQLite connection & schema initialization
│   │   ├── event-auth.ts           <-- Google Auth & session helpers
│   │   ├── event-models.ts         <-- Shared TypeScript models
│   │   ├── event-repository.ts     <-- SQLite data access repository
│   │   ├── export-jobs.ts          <-- In-process ZIP export worker
│   │   ├── local-storage.ts        <-- 'Events' directory file manager
│   │   └── session.ts              <-- Cryptographic HMAC-SHA256 session engine
│   └── proxy.ts                    <-- Next.js 16 route protection proxy
├── app.js                          <-- Phusion Passenger entrypoint for Namecheap
├── next.config.ts                  <-- Next.js config (output: 'standalone')
└── package.json
```

---

## Local Development

### Requirements
* Node.js 22.12.0 or newer (built-in `node:sqlite` support).

### Getting Started

1. Clone repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure local environment variables in `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   SESSION_SECRET=a-secure-random-secret-string-at-least-32-chars-long
   HEYPAL_ADMIN_EMAILS=lloyd.miguel@gmail.com
   HEYPAL_ALLOWED_EMAIL_DOMAINS=*
   HEYPAL_PUBLIC_ORIGIN=http://localhost:3000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`:
   * **Landing Page**: `http://localhost:3000`
   * **Organizer Admin**: `http://localhost:3000/admin`
   * **Attendee Events**: `http://localhost:3000/events`

---

## Google Cloud OAuth 2.0 Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   * Set User Type to **External**.
   * App name: **heyPal!**.
   * User support email: `lloyd.miguel@gmail.com`.
   * Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
4. Navigate to **Credentials** > **Create Credentials** > **OAuth client ID**:
   * Application type: **Web application**.
   * Name: `heyPal! Web`.
   * **Authorized JavaScript origins**:
     * `http://localhost:3000` (development)
     * `https://yourdomain.com` (production Namecheap domain)
   * **Authorized redirect URIs**:
     * `http://localhost:3000/api/auth/callback/google` (development)
     * `https://yourdomain.com/api/auth/callback/google` (production)
5. Copy the **Client ID** and **Client Secret** into your `.env` settings.

---

## Namecheap Hosting Deployment Guide

### Option A: Namecheap cPanel ("Setup Node.js App")

1. Log into your **Namecheap cPanel**.
2. Click **Setup Node.js App** (CloudLinux NodeJS Selector / Phusion Passenger).
3. Click **Create Application**:
   * **Node.js version**: Select `22.x`.
   * **Application mode**: `Production`.
   * **Application root**: `heypal` (or the folder path under your home directory).
   * **Application URL**: Select your domain or subdomain.
   * **Application startup file**: `app.js`.
4. In the **Environment variables** section, add:
   * `NODE_ENV` = `production`
   * `PORT` = `3000`
   * `HEYPAL_PUBLIC_ORIGIN` = `https://yourdomain.com`
   * `GOOGLE_CLIENT_ID` = `<your-google-client-id>`
   * `GOOGLE_CLIENT_SECRET` = `<your-google-client-secret>`
   * `SESSION_SECRET` = `<your-random-32-char-secret>`
   * `HEYPAL_ADMIN_EMAILS` = `lloyd.miguel@gmail.com`
   * `HEYPAL_ALLOWED_EMAIL_DOMAINS` = `*`
   * `HEYPAL_STORAGE_DIR` = `/home/username/heypal/Events`
   * `HEYPAL_DB_PATH` = `/home/username/heypal/Events/database/heypal.db`
5. Build and package your standalone deployment bundle:
   ```bash
   npm run build
   npm run bundle:deploy
   ```
   *This automatically generates `heypal-deploy.zip` with static assets, public folder, and Passenger startup script.*
6. Upload `heypal-deploy.zip` via FTP to `/home/username/heypal/` and extract it via cPanel File Manager.
7. Click **Restart** in the cPanel Node.js App Manager.
8. Enable HTTPS / SSL via Namecheap **AutoSSL**.

> For a complete, step-by-step guide with screenshots and FTP instructions, read the [Namecheap Deployment Guide](NAMECHEAP_DEPLOYMENT_GUIDE.md).

---

### Automated Deployment via GitHub Actions

A pre-configured GitHub Actions workflow is provided at `.github/workflows/deploy-namecheap.yml`.

Configure the following secrets in your GitHub repository (**Settings** > **Secrets and variables** > **Actions**):
* `NAMECHEAP_HOST`: Your Namecheap server IP or hostname.
* `NAMECHEAP_USER`: Your cPanel SSH username.
* `NAMECHEAP_SSH_KEY`: Your private SSH key.
* `NAMECHEAP_TARGET_DIR`: Path to the application folder (e.g. `/home/username/heypal`).

Every push to `main` builds the Next.js standalone package, syncs the assets, and restarts Passenger zero-downtime.

---

### Backups

To back up all event data, attendee photos, and the database, create a daily cPanel Cron Job:
```bash
tar -czf /home/username/backups/heypal_$(date +\%F).tar.gz /home/username/heypal/Events
```

---

## License

Private / Proprietary. All rights reserved.
