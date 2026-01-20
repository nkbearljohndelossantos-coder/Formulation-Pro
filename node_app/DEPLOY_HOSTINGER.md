# Hostinger Node.js Deployment Guide for Formulation Pro

Your application has been successfully migrated to Node.js! Follow these exact steps to deploy it on Hostinger.

## 1. Preparation
1.  **Zip the contents** of the `node_app` folder (select all files inside -> Right Click -> Send to Compressed Folder).
    *   *Do not zip the `node_app` folder itself, zip the CONTENTS (app.js, package.json, etc).*
2.  Log in to your **Hostinger hPanel**.

## 2. Hostinger Setup
1.  Go to **Websites** -> **Manage**.
2.  Search for **Node.js** in the sidebar.
3.  **Create Application**:
    *   **Node.js Version**: 18.x or higher (Recommended: 18).
    *   **Application Mode**: Production.
    *   **Application Root**: `public_html/formulation-pro` (or just `public_html` if it's the only app).
    *   **Application Startup File**: `app.js`.
    *   Click **Create**.

## 3. Upload Files
1.  Go to **Files** -> **File Manager**.
2.  Navigate to the folder you specified (e.g., `public_html/formulation-pro`).
3.  **Upload** your zip file.
4.  **Extract** the zip file into the current directory.
5.  **Delete** the zip file.

## 4. Configuration (.env)
1.  In File Manager, find the `.env` file. (If not visible, creating a new file named `.env` and pasting content works).
2.  Edit `.env` and ensure your **Google OAuth Credentials** are correct:
    ```
    GOOGLE_CLIENT_ID=your-client-id
    GOOGLE_CLIENT_SECRET=your-client-secret
    OWNER_EMAIL=your-email@gmail.com
    SESSION_SECRET=make-something-random-up
    ```
3.  **IMPORTANT**: Hostinger ignores the port in `.env`. It assigns one automatically. Our `app.js` is already configured to prioritize `process.env.PORT`.

## 5. Install Dependencies
1.  Go back to the **Node.js** page in hPanel.
2.  Click the **NPM Install** button.
    *   *This will read your `package.json` and install Express, SQLite, etc.*

## 6. database.sqlite Note
*   The system uses a file-based SQLite database (`data/database.sqlite`).
*   Hostinger's file permissions usually allow writing to this file automatically.
*   If you see "ReadOnly" errors, go to File Manager -> Right Click `data` folder -> Permissions -> Set to `755` or `777`.

## 7. Start Application
1.  Click **Restart** (or Start) on the Node.js page.
2.  Click **Open Website**.

## Troubleshooting
*   **"Application Error"**: Check `console.log` equivalent in Hostinger (usually a log file link on the Node.js page).
*   **Login Loops**: Ensure your Google Cloud Console "Authorized JavaScript origins" matches your Hostinger domain (e.g., `https://your-domain.com`) and "Authorized redirect URIs" includes `https://your-domain.com/auth/google/callback`.
