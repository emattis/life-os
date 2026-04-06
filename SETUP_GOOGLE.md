# Google Cloud Setup Guide for Life OS

This guide walks you through setting up Google Calendar API access for Life OS.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown (top-left, next to "Google Cloud")
3. Click **New Project**
4. Name it `Life OS`
5. Click **Create**
6. Make sure "Life OS" is selected as the active project

## Step 2: Enable the Google Calendar API

1. In the left sidebar, go to **APIs & Services → Library**
2. Search for `Google Calendar API`
3. Click on it, then click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** and click **Create**
3. Fill in the required fields:
   - **App name**: `Life OS`
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or Remove Scopes**
6. Find and select:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
7. Click **Update**, then **Save and Continue**
8. On the **Test users** page, click **Add Users**
9. Add your Google email address
10. Click **Save and Continue**, then **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Select **Web application**
4. Name it `Life OS Web Client`
5. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:3000
   ```
6. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Click **Create**
8. **Copy the Client ID and Client Secret** — you'll need these next

## Step 5: Configure Environment Variables

Open your `.env.local` file in the Life OS project and paste in your credentials:

```env
GOOGLE_CLIENT_ID="paste-your-client-id-here"
GOOGLE_CLIENT_SECRET="paste-your-client-secret-here"
```

## Step 6: Generate a NextAuth Secret

Run this in your terminal:

```bash
openssl rand -base64 32
```

Paste the output into `.env.local`:

```env
NEXTAUTH_SECRET="paste-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

## Step 7: Add Your Anthropic API Key

Get your API key from [console.anthropic.com](https://console.anthropic.com) and add it:

```env
ANTHROPIC_API_KEY="sk-ant-..."
```

## Final .env.local

Your complete `.env.local` should look like this:

```env
DATABASE_URL="file:./dev.db"

GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"

ANTHROPIC_API_KEY="sk-ant-your-key"
```

## Troubleshooting

### "Access Denied" or "App not verified"
- This is normal in test mode. Click **Continue** (or "Advanced" → "Go to Life OS")
- Make sure your email is added as a test user (Step 3.9)

### "redirect_uri_mismatch"
- Double-check that `http://localhost:3000/api/auth/callback/google` is listed exactly in your authorized redirect URIs
- No trailing slash

### Calendar events not showing
- Confirm Google Calendar API is enabled (Step 2)
- Check that both calendar scopes are added (Step 3.6)
- Try signing out and back in to refresh the OAuth token

## Moving to Production (Later)

When you're ready to deploy:
1. Add your production URL to authorized origins and redirect URIs
2. Submit your app for verification through the OAuth consent screen
3. Update `NEXTAUTH_URL` to your production domain
