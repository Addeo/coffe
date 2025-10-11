# 🚀 Ngrok Setup and GitHub Pages Deployment Guide

This guide will help you set up ngrok for backend distribution and deploy the frontend to GitHub Pages.

## 📋 Prerequisites

1. **Node.js** installed (v18 or higher)
2. **ngrok** installed ([download here](https://ngrok.com/download))

   ```bash
   # macOS
   brew install ngrok/ngrok/ngrok

   # Linux
   snap install ngrok
   ```

3. **Git** configured with push access to the repository

## 🎯 Quick Start

### Option 1: Automatic Setup (Recommended)

Run the complete setup script that will guide you through all steps:

```bash
./full-demo-setup.sh
```

This script will:

- ✅ Check if backend is running (start if needed)
- ✅ Prompt you to start ngrok
- ✅ Update environment variables
- ✅ Deploy to GitHub Pages

### Option 2: Manual Setup

#### Step 1: Start Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend will be available at `http://localhost:3002`

#### Step 2: Start ngrok

Open a new terminal and run:

```bash
./start-ngrok.sh
```

Or manually:

```bash
ngrok http 3002
```

Copy the HTTPS URL from ngrok output (e.g., `https://abc123.ngrok.io`)

#### Step 3: Update Environment Variables

```bash
./update-ngrok-url.sh https://your-ngrok-url.ngrok.io
```

This will update:

- `frontend/src/environments/environment.ts`
- `frontend/src/environments/environment.prod.ts`

#### Step 4: Deploy to GitHub Pages

```bash
./deploy-gh-pages.sh
```

Or with ngrok URL update:

```bash
./deploy-gh-pages.sh https://your-ngrok-url.ngrok.io
```

## 🔧 Available Scripts

### `./start-ngrok.sh [port]`

Starts ngrok tunnel for the backend.

- Default port: 3002
- Checks if backend is running
- Displays helpful instructions

### `./update-ngrok-url.sh <url>`

Updates environment files with new ngrok URL.

- Updates both development and production environments
- Creates backup files (\*.bak)

### `./deploy-gh-pages.sh [ngrok-url]`

Deploys frontend to GitHub Pages.

- Optionally updates ngrok URL first
- Builds production bundle
- Deploys to gh-pages branch

### `./full-demo-setup.sh`

Complete automated setup wizard.

- Interactive step-by-step process
- Handles all configuration
- Provides helpful status messages

## 📱 Access Your Application

After deployment:

- **Frontend**: `https://[your-username].github.io/coffe/`
- **Backend**: Your ngrok URL (changes on restart)

## 👤 Test Credentials

```
Admin:    admin@coffee.com / password
Manager:  manager@coffee.com / password
Engineer: engineer@coffee.com / password
```

## 🔄 GitHub Actions Deployment

The repository includes automatic deployment via GitHub Actions:

### Workflow: `deploy-frontend.yml`

Automatically triggers on:

- Push to `main` branch (when frontend files change)
- Manual workflow dispatch

To trigger manual deployment:

1. Go to GitHub repository
2. Click "Actions" tab
3. Select "Deploy Frontend to GitHub Pages"
4. Click "Run workflow"

The workflow will:

1. Install dependencies
2. Build production bundle
3. Deploy to gh-pages branch

## ⚠️ Important Notes

### ngrok URL Changes

- ngrok URL is **temporary** and changes on restart
- Free tier has limitations (2 hours, agent restrictions)
- After ngrok restart:
  ```bash
  ./update-ngrok-url.sh <new-url>
  ./deploy-gh-pages.sh
  ```

### CORS Configuration

The backend is configured to accept requests from:

- `http://localhost:4202` (local development)
- `https://*.ngrok.io` (ngrok tunnels)
- `https://*.github.io` (GitHub Pages)

If you encounter CORS errors:

1. Check ngrok URL is correct in environment files
2. Verify backend is running and accessible
3. Check browser console for specific error messages

### GitHub Pages Configuration

Make sure GitHub Pages is enabled:

1. Go to repository Settings
2. Click "Pages" in sidebar
3. Source: Deploy from branch `gh-pages`
4. Click "Save"

## 🐛 Troubleshooting

### Backend Not Starting

```bash
cd backend
rm -rf node_modules
npm install
npm run start:dev
```

### ngrok Connection Issues

If you see "authentication failed" or IP restrictions:

**Alternative 1: LocalTunnel**

```bash
npx localtunnel --port 3002
```

**Alternative 2: Cloudflare Tunnel**

```bash
cloudflared tunnel --url http://localhost:3002
```

### Frontend Build Errors

```bash
cd frontend
rm -rf node_modules dist
npm install --legacy-peer-deps
npm run build
```

### Deployment Failed

Check:

1. Git credentials are configured
2. You have push access to the repository
3. gh-pages branch exists
4. GitHub Actions has write permissions

### Environment Not Updating

```bash
# Manual update
cd frontend/src/environments

# Edit environment.prod.ts
nano environment.prod.ts

# Change apiUrl and authUrl to your ngrok URL
```

## 📊 Project Structure

```
coffe/
├── backend/                 # NestJS backend
│   └── src/
├── frontend/               # Angular frontend
│   ├── src/
│   │   └── environments/
│   │       ├── environment.ts      # Development
│   │       └── environment.prod.ts # Production
│   └── angular.json       # Base href: /coffe/
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml # Auto-deployment
├── start-ngrok.sh         # Start ngrok
├── update-ngrok-url.sh    # Update URLs
├── deploy-gh-pages.sh     # Deploy frontend
└── full-demo-setup.sh     # Complete setup
```

## 🎉 Success!

Your application should now be:

- ✅ Backend running locally with ngrok tunnel
- ✅ Frontend deployed on GitHub Pages
- ✅ Ready for demonstration

## 💡 Tips

1. **Keep ngrok running**: Don't close the terminal with ngrok
2. **Bookmark frontend URL**: Save your GitHub Pages URL
3. **Test after deployment**: Wait 2-3 minutes for GitHub Pages to update
4. **Check Actions tab**: Monitor deployment progress in GitHub

## 📚 Additional Resources

- [ngrok Documentation](https://ngrok.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Angular Deployment Guide](https://angular.io/guide/deployment)
- [NestJS Documentation](https://docs.nestjs.com)

---

🎯 **Ready to deploy?** Run `./full-demo-setup.sh` to get started!
