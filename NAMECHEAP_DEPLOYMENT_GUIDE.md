# heyPal! Namecheap cPanel & FTP Deployment Guide

A step-by-step production deployment guide for deploying **heyPal!** to **Namecheap Shared / Business Hosting** using **FTP** and **cPanel's "Setup Node.js App"** (CloudLinux / Phusion Passenger).

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Local Build & Standalone Packaging](#3-step-1-local-build--standalone-packaging)
4. [Step 2: Connecting via FTP & Uploading to Namecheap](#4-step-2-connecting-via-ftp--uploading-to-namecheap)
5. [Step 3: Extracting Files in cPanel File Manager](#5-step-3-extracting-files-in-cpanel-file-manager)
6. [Step 4: Configuring "Setup Node.js App" in cPanel](#6-step-4-configuring-setup-nodejs-app-in-cpanel)
7. [Step 5: Configuring Environment Variables](#7-step-5-configuring-environment-variables)
8. [Step 6: Configuring Google Cloud OAuth Credentials](#8-step-6-configuring-google-cloud-oauth-credentials)
9. [Step 7: Enforcing HTTPS / SSL Certificate](#9-step-7-enforcing-https--ssl-certificate)
10. [Step 8: Starting and Verifying the Application](#10-step-8-starting-and-verifying-the-application)
11. [Step 9: Future Updates & CI/CD Workflow](#11-step-9-future-updates--cicd-workflow)
12. [Step 10: Troubleshooting & Diagnostic Logs](#12-step-10-troubleshooting--diagnostic-logs)

---

## 1. Architecture Overview

**heyPal!** is designed to run self-contained on Namecheap hosting:
- **Server Runtime**: Next.js 16 Standalone Server wrapped by Phusion Passenger (`app.js`).
- **Database**: Embedded SQLite (`node:sqlite`) with Write-Ahead Logging (`WAL`). No external MySQL/Postgres required.
- **File Storage**: Local filesystem storage stored under the `Events/` directory (`Events/covers/`, `Events/photos/`, `Events/exports/`, `Events/database/`).
- **Authentication**: Native Google Sign-In (OAuth 2.0 / OpenID Connect) with cryptographic HMAC-SHA256 session cookies.

```
/home/<cpanel_username>/
└── heypal/                               <-- Recommended Application Root (outside public_html)
    ├── .next/
    │   ├── standalone/                   <-- Next.js server runtime
    │   └── static/                       <-- Optimized CSS, JS, and font chunks
    ├── public/                           <-- Static assets (logos, icons, illustrations)
    ├── Events/                           <-- Persistent user data & SQLite database
    │   ├── covers/
    │   ├── photos/<eventId>/
    │   ├── exports/<eventId>/
    │   └── database/heypal.db
    ├── tmp/
    │   └── restart.txt                   <-- Passenger touch file to restart app
    ├── app.js                            <-- Namecheap Phusion Passenger entrypoint
    ├── server.js                         <-- Next.js standalone server
    └── package.json
```

> [!IMPORTANT]
> **Why deploy in `/home/<username>/heypal` instead of `/public_html`?**  
> Placing your app folder outside `public_html` ensures that visitors cannot directly download your SQLite database (`heypal.db`) or raw files by guessing URLs. Passenger routes all web traffic directly into the Node.js application process.

---

## 2. Prerequisites

Before starting, ensure you have:
1. **Namecheap Hosting Account** (Shared Hosting Stellar, Stellar Plus, or Business) with cPanel access.
2. **Node.js 22.x** (or 20.x LTS) enabled in cPanel's **Setup Node.js App**.
3. **An FTP Client** installed locally:
   - [FileZilla](https://filezilla-project.org/) (Windows/Mac/Linux)
   - Or [WinSCP](https://winscp.net/) (Windows)
   - Or direct access to **cPanel File Manager**.
4. **Google Cloud Console Account** for OAuth 2.0 client credentials.
5. **A Domain or Subdomain** pointed to your Namecheap account (e.g. `heypal.yourdomain.com` or `yourdomain.com`).

---

## 3. Step 1: Local Build & Standalone Packaging

Shared hosting servers have strict CPU, memory, and timeout limits. **Never run `npm install` or `npm run build` directly on Namecheap cPanel.** Instead, build locally on your machine and generate the pre-bundled deployment ZIP.

### 1. Run the Production Build
Open PowerShell or your terminal in the project root:
```bash
npm run build
```
*Verify that the build succeeds with 0 errors and creates the `.next/standalone` folder.*

### 2. Run the Deployment Bundler
Run the automated deployment packager:
```bash
npm run bundle:deploy
```

This automated script performs the following tasks:
- Copies `.next/static` into the standalone bundle (so CSS/JS assets load).
- Copies the `public/` directory (logos, icons, images).
- Copies the Phusion Passenger entrypoint (`app.js`).
- Pre-creates the `Events/` directories (`covers/`, `photos/`, `exports/`, `database/`).
- Creates `tmp/restart.txt` for Phusion Passenger application reloading.
- Compresses everything into a single, datestamped archive: **`heypal-deploy_YYYYMMDD.zip` (e.g., `heypal-deploy_20261027.zip`, ~9MB)**.

---

## 4. Step 2: Connecting via FTP & Uploading to Namecheap

Uploading thousands of loose files over raw FTP can cause timeouts and file corruption. **Uploading the single `heypal-deploy_YYYYMMDD.zip` archive takes less than 30 seconds.**

### A. Locate Your Namecheap FTP Credentials
1. Log into your **Namecheap Account** -> Go to **Hosting List** -> Click **Go to cPanel**.
2. In cPanel, find your **cPanel Username** and **Server Hostname** (shown in the right sidebar under "General Information").
3. Your primary FTP credentials are the same as your cPanel login:
   - **Host**: `ftp.yourdomain.com` (or your server name, e.g., `premiumXXX.web-hosting.com`, or your server IP).
   - **Username**: Your cPanel username.
   - **Password**: Your cPanel password.
   - **Port**: `21` (FTP with TLS) or `22` (SFTP).

### B. Configure FileZilla / WinSCP
1. Open FileZilla.
2. Go to **File -> Site Manager -> New Site**.
3. Settings:
   - **Protocol**: `FTP - File Transfer Protocol`
   - **Host**: `ftp.yourdomain.com` (or server IP)
   - **Encryption**: `Require explicit FTP over TLS`
   - **Logon Type**: `Normal`
   - **User**: `<your_cpanel_username>`
   - **Password**: `<your_cpanel_password>`
4. Click **Connect**.

### C. Create the Remote Directory and Upload
1. In the **Remote Site** panel (server side), navigate to your home directory:
   `/home/<your_cpanel_username>/`
2. Right-click and choose **Create directory** -> Name it:
   `heypal`
3. Double-click to open `/home/<your_cpanel_username>/heypal/`.
4. In your **Local Site** panel (computer side), locate `heypal-deploy_YYYYMMDD.zip` (e.g. `heypal-deploy_20261027.zip`).
5. Drag and drop **`heypal-deploy_YYYYMMDD.zip`** into the remote `/home/<your_cpanel_username>/heypal/` folder.
6. Wait for the upload to complete (100% transfer status).

---

## 5. Step 3: Extracting Files in cPanel File Manager

1. In your browser, open **cPanel** -> Under the **Files** section, click **File Manager**.
2. In the left folder tree, navigate to `/home/<your_cpanel_username>/heypal`.
3. You will see `heypal-deploy_YYYYMMDD.zip`.
4. Click on `heypal-deploy_YYYYMMDD.zip` to select it, then click **Extract** in the top toolbar (or right-click -> **Extract**).
5. In the confirmation dialog, ensure the extract directory is `/home/<your_cpanel_username>/heypal`, then click **Extract File(s)**.
6. Once extraction finishes, click **Close**.
7. *(Optional)* Select `heypal-deploy_YYYYMMDD.zip` and click **Delete** (check "Skip the trash and permanently delete") to reclaim disk space.
8. Verify that the following files and folders are present directly inside `heypal/`:
   - `app.js`
   - `server.js`
   - `package.json`
   - `.next/`
   - `public/`
   - `Events/`
   - `standalone_modules/` (CloudLinux safe standalone dependencies)
   - `tmp/`

---

## 6. Step 4: Configuring "Setup Node.js App" in cPanel

Namecheap uses CloudLinux's **Node.js Selector** powered by Phusion Passenger to serve Node applications.

1. In cPanel, navigate to the **Software** section and click **Setup Node.js App**.
2. Click the blue **Create Application** button in the top right.
3. Configure the fields as follows:

| Field | Value | Notes |
| :--- | :--- | :--- |
| **Node.js version** | **22.x** (or **20.x**) | Node 22 includes built-in `node:sqlite` for peak performance. |
| **Application mode** | **Production** | Runs Next.js with production optimizations. |
| **Application root** | `heypal` | Relative path to `/home/<user>/heypal`. |
| **Application URL** | `yourdomain.com` or `heypal.yourdomain.com` | Select your desired domain or subdomain from the dropdown. |
| **Application startup file** | `app.js` | **Important:** Point this to `app.js` (our Phusion Passenger bridge). |

4. Leave other options as default, then click **CREATE** (or **SAVE**) at the top right.
5. The application will initialize and status will change to **STARTED**.

---

## 7. Step 5: Configuring Environment Variables

In the same **Setup Node.js App** screen for `heypal`:
1. Scroll down to the **Environment variables** section.
2. Click **Add Variable** for each of the following configurations:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production caching and optimizations. |
| `PORT` | `3000` | Port for the internal HTTP listener. |
| `NODE_OPTIONS` | `--v8-pool-size=1 --max-old-space-size=384` | **Critical for CloudLinux:** Limits V8 background worker threads and RAM to prevent `pthread_create: Resource temporarily unavailable` thread quota crashes. |
| `UV_THREADPOOL_SIZE` | `1` | **Critical for CloudLinux:** Limits libuv I/O thread pool to prevent hitting shared hosting thread limits. |
| `HEYPAL_PUBLIC_ORIGIN` | `https://heypal.yourdomain.com` | Your live HTTPS domain (no trailing slash). Used for OAuth and media URLs. |
| `GOOGLE_CLIENT_ID` | `12345-xxx.apps.googleusercontent.com` | Google OAuth 2.0 Web Client ID. |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxxxxxx` | Google OAuth 2.0 Client Secret. |
| `SESSION_SECRET` | *(64-character random string)* | Secret key used to sign HMAC-SHA256 session tokens. Generate with `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`. |
| `HEYPAL_ADMIN_EMAILS` | `lloyd.miguel@gmail.com` | Comma-separated list of organizer/admin emails granted dashboard access. |
| `HEYPAL_ALLOWED_EMAIL_DOMAINS` | `*` | Allowed Google domains (e.g. `*` for public access, or `yourcompany.com`). |
| `HEYPAL_STORAGE_DIR` | `/home/<user>/heypal.yourdomain.com/Events` | Absolute path to the persistent media storage folder. Replace `<user>` with your cPanel username. |
| `HEYPAL_DB_PATH` | `/home/<user>/heypal.yourdomain.com/Events/database/heypal.db` | Absolute path to the persistent SQLite database file. Replace `<user>` with your cPanel username. |

3. Click **SAVE** at the top right of the page to apply the environment variables.

> [!IMPORTANT]
> **Why `NODE_OPTIONS` and `UV_THREADPOOL_SIZE` are essential:**
> CloudLinux shared hosting restricts process and thread limits (`nproc`) per cPanel user. By default, Node 22 attempts to spawn V8 thread pool workers equal to the host server's CPU cores (often 32–64 cores). Without these two variables, Node exceeds the user quota upon startup, resulting in `node: pthread_create: Resource temporarily unavailable` and `uv_thread_create Assertion failed`. Setting `--v8-pool-size=1` and `UV_THREADPOOL_SIZE=1` keeps the application lightweight and completely within CloudLinux resource limits.

---

## 8. Step 6: Configuring Google Cloud OAuth Credentials

For Google Sign-In to function on your live Namecheap domain:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Google Cloud Project.
3. In the navigation menu, go to **APIs & Services -> Credentials**.
4. Click on your **OAuth 2.0 Client ID** (Application type: *Web application*).
5. Under **Authorized JavaScript origins**, click **ADD URI**:
   - `https://heypal.yourdomain.com` (or `https://yourdomain.com`)
6. Under **Authorized redirect URIs**, click **ADD URI**:
   - `https://heypal.yourdomain.com/api/auth/callback/google` (or `https://yourdomain.com/api/auth/callback/google`)
7. Click **SAVE** at the bottom of the page.

> [!NOTE]
> Ensure the URI matches your exact protocol (`https://`) and domain name configured in `HEYPAL_PUBLIC_ORIGIN`.

---

## 9. Step 7: Enforcing HTTPS / SSL Certificate

Google OAuth and modern camera/photo upload APIs **require HTTPS**.

1. In cPanel, go to the **Security** section -> **SSL/TLS Status**.
2. Locate your domain (e.g., `heypal.yourdomain.com`).
3. Click **Run AutoSSL** to issue a free Namecheap SSL certificate (takes 2-5 minutes).
4. Go to **Domains** -> **Domains** in cPanel.
5. Ensure the toggle for **Force HTTPS Redirect** is switched **ON** for your domain.

---

## 10. Step 8: Starting and Verifying the Application

### A. Restart the Application
1. In cPanel -> **Setup Node.js App**, click the orange **Restart** button on your `heypal` application.
2. Alternatively, Phusion Passenger automatically reloads whenever `tmp/restart.txt` is updated:
   - In File Manager, right-click `/home/<user>/heypal/tmp/restart.txt` and click **Edit**, type a space, and click **Save Changes**.

### B. Verification Checklist
Visit your domain (`https://heypal.yourdomain.com`) and test the end-to-end flow:
- [ ] **Homepage**: Verify the landing page loads with branding: *"Don't be Epal; use heyPal!"*.
- [ ] **Google Sign-in**: Click **Sign in with Google** -> Authenticate with `lloyd.miguel@gmail.com` -> Verify redirect to `/admin/events`.
- [ ] **Event Creation**: Click **New Event** -> Fill in details and upload a cover photo -> Click **Create Event**.
- [ ] **Media Persistence**: In cPanel File Manager, check `/home/<user>/heypal/Events/covers/` to verify the image was saved.
- [ ] **QR Code & Attendee Upload**: Open the event album link in a mobile browser (or incognito tab) -> Upload a photo -> Verify it appears on the live photo wall.
- [ ] **Database Persistence**: In cPanel File Manager, check `/home/<user>/heypal/Events/database/heypal.db` to verify the database file is populated.
- [ ] **ZIP Photo Export**: In the Admin Dashboard, click **Export ZIP** -> Verify the ZIP file downloads successfully.

---

## 11. Step 9: Future Updates & CI/CD Workflow

Whenever you make improvements or updates to your code:

### Rapid Update Workflow (3 Steps):
1. **Build & Bundle Locally**:
   ```bash
   npm run build && npm run bundle:deploy
   ```
2. **Upload & Overwrite via FTP**:
   - Upload `heypal-deploy.zip` to `/home/<user>/heypal/` via FileZilla.
   - In cPanel File Manager, click **Extract** -> Select overwrite.
   - Delete `heypal-deploy.zip`.
3. **Restart the App**:
   - In cPanel **Setup Node.js App**, click **Restart**.
   *(Your database in `Events/database/heypal.db` and uploaded photos in `Events/photos/` are preserved safely!)*

---

## 12. Step 10: Troubleshooting & Diagnostic Logs

### Issue: "Cloudlinux NodeJS Selector demands to store node modules for application in separate folder (virtual environment) pointed by symlink called 'node_modules'..."
- **Cause**: CloudLinux manages dependencies inside `/home/<user>/nodevenv/...` and creates a **symlink** named `node_modules` in the application root. If a physical directory named `node_modules` is extracted in `/home/<user>/heypal` before or during application creation, CloudLinux blocks the setup.
- **Immediate Fix (10 seconds)**:
  1. Open cPanel **File Manager** -> Navigate to `/home/<user>/heypal/`.
  2. If you see a physical directory named `node_modules`:
     - Select `node_modules` -> Click **Rename** -> Name it `standalone_modules` (or delete it if you already have `standalone_modules`).
  3. Return to **Setup Node.js App** in cPanel and click **Create Application** (or **Save**).
  4. It will now succeed immediately!
- **Permanent Solution**:
  Our updated bundler (`npm run bundle:deploy`) packages standalone modules into `standalone_modules/` instead of `node_modules/`, and [app.js](app.js) automatically registers `standalone_modules/` into Node's search path. This permanently eliminates this CloudLinux conflict.

### Issue: "Error 508: Resource Limit Reached" (Entry Processes / EP Spike)
- **Cause**: CloudLinux reports 508 when concurrent active connections exceed **30 Entry Processes (EP)**. On Namecheap, this happens when:
  1. Phusion Passenger attempts to spawn multiple Node worker processes under concurrent traffic.
  2. Orphaned or stale Node processes from previous restarts are still lingering in the background.
  3. The browser requests dozens of unthrottled image files simultaneously.
- **Immediate Recovery (10 seconds)**:
  1. Open cPanel **Terminal** (or SSH).
  2. Kill lingering orphaned Node processes:
     ```bash
     pkill -u $USER -f node
     ```
  3. Go to **Setup Node.js App** in cPanel and click **Restart**.
- **Permanent Solution (`.htaccess`)**:
  Add the following block to the `.htaccess` file in your application directory:
  ```apache
  # Cap Passenger to a single worker process to prevent Entry Process queues
  PassengerMaxInstances 1
  PassengerMinInstances 1
  PassengerSpawnMethod direct
  PassengerHighPerformance on
  PassengerAppGroupName heypal
  ```
- **Memory Ceiling Configuration**:
  In cPanel **Setup Node.js App**, under **Environment Variables**, add:
  * Name: `NODE_OPTIONS`
  * Value: `--max-old-space-size=384`

### Issue: "503 Service Unavailable" or "Passenger Phusion Error"
- **Cause**: Startup script syntax error or missing port binding.
- **Fix**: Check `stderr.log` in your application directory:
  1. Open cPanel **File Manager**.
  2. Navigate to `/home/<user>/heypal/`.
  3. View the file `stderr.log`.
  4. Ensure `Application startup file` in cPanel is set to `app.js`.

### Issue: "Error: Cannot find module '...'"
- **Cause**: The standalone bundle structure was extracted into a nested directory.
- **Fix**: In File Manager, check `/home/<user>/heypal/`. `app.js` and `server.js` must be directly inside `/home/<user>/heypal/`, NOT inside a subfolder like `/home/<user>/heypal/standalone/`.

### Issue: "EACCES: permission denied, open 'Events/...'"
- **Cause**: Incorrect folder permissions.
- **Fix**: In cPanel File Manager:
  1. Right-click `/home/<user>/heypal/Events`.
  2. Click **Change Permissions**.
  3. Set to `755` (Owner: Read, Write, Execute; Group: Read, Execute; World: Read, Execute).
  4. Do the same for `/home/<user>/heypal/Events/database`.

### Issue: "redirect_uri_mismatch" during Google Sign-in
- **Cause**: The redirect URI in Google Cloud Console does not match `HEYPAL_PUBLIC_ORIGIN`.
- **Fix**: Verify Google Console has:
  `https://yourdomain.com/api/auth/callback/google`
  *(Note: Must include `https://`, exact subdomain, and no trailing slash)*.

### Issue: Node.js Version Incompatibility
- **Cause**: Next.js 16 and SQLite require Node 20.x or 22.x.
- **Fix**: In cPanel **Setup Node.js App**, ensure the version dropdown is set to **22.x** (recommended) or **20.x**. Click **Save** and **Restart**.
