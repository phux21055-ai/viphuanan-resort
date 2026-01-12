<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally or deploy it to Vercel.

View your app in AI Studio: https://ai.studio/apps/drive/1IPJ6OpbE-vpoMjPLsCLHGskL73tAOIwh

## Run Locally

Prerequisites: Node.js 18+

1. Install dependencies:
   `npm install`
2. Create `.env.local` and set your Gemini API key:
   `GEMINI_API_KEY=your_key_here`
3. Run the app:
   `npm run dev`

## Deploy to Vercel

This project is ready for static deployment on Vercel (Vite build). A `vercel.json` is included to:
- Build with `npm run build`
- Serve the `dist` output
- Rewrite all routes to `index.html` (SPA fallback)

Steps:
1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. In Vercel Project Settings → Environment Variables, add:
   - Name: `GEMINI_API_KEY`
   - Value: your Gemini API key
   - Environments: Production, Preview, Development
4. Trigger a deployment. Vercel will run `npm install` and `npm run build` and serve the `dist` folder.

Notes:
- The Gemini API key is injected at build time via Vite (see `vite.config.ts`). For static hosting, this means the built bundle contains the key. Consider moving AI calls to a serverless function to avoid exposing secrets in the browser for production use.
- If you use client-side routing in the future, the included rewrite in `vercel.json` already handles deep links.
