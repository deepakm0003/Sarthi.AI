# Setup Guide for Shiksha AI

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Firebase Configuration**

   Create a `.env.local` file in the root directory (`shiksha-ai/.env.local`) with the following content:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

3. **Get Firebase Credentials**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Go to **Project Settings** > **General**
   - Scroll down to **"Your apps"** section
   - Click on the web app icon (`</>`) to add a web app
   - Copy the config values from the Firebase SDK configuration
   - Replace the placeholders in `.env.local` with your actual values

4. **Run the Development Server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Development Mode

In development mode, the app will run even without Firebase configuration, but you'll see a warning banner. Firebase features (authentication, database, storage) will not work until you configure Firebase.

## Troubleshooting

### "Service Unavailable" Error

If you see this error, it means Firebase is not configured. Follow step 2 above to set up your `.env.local` file.

### Port Already in Use

If port 3000 is already in use, you can specify a different port:

```bash
npm run dev -- -p 3001
```

### Firebase Connection Issues

- Make sure all environment variables in `.env.local` are correct
- Restart the development server after adding/changing `.env.local`
- Check that your Firebase project has the necessary services enabled (Authentication, Firestore, Storage)
