# MEDDPICC Copilot - Real-Time Sales Qualification

A real-time AI-powered copilot that helps B2B SaaS sales reps qualify prospect intent during live calls using the MEDDPICC framework.

## Features

- 🎯 **Real-Time Qualification**: Automatically detects MEDDPICC signals during live calls
- 🤖 **AI-Powered Analysis**: Uses Claude Sonnet 4 to analyze conversations in real-time
- 💡 **Smart Suggestions**: Provides contextual follow-up questions to fill qualification gaps
- 📊 **Intent Scoring**: Calculates prospect intent confidence (Low/Medium/High)
- ⚡ **Zero Manual Entry**: Automatically populates MEDDPICC scorecards

## MEDDPICC Components Tracked

- **Metrics**: Measurable impact, targets, KPIs, timelines
- **Economic Buyer**: Budget authority, decision makers
- **Decision Process**: Steps, timeline, approval criteria
- **Pain**: Current problems and their consequences

## Tech Stack

- React 18
- Tailwind CSS
- Lucide React (icons)
- Claude API (Anthropic)
- Vite (build tool)

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Deploy to Vercel

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts** to link your project and deploy

### Option 2: Deploy via Vercel Dashboard

1. **Push code to GitHub** (or GitLab/Bitbucket)

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Click "New Project"**

4. **Import your repository**

5. **Vercel will auto-detect Vite** and configure build settings

6. **Click "Deploy"**

### Environment Variables

Note: The current implementation includes Claude API calls directly from the frontend. For production use, you should:

1. Create a backend API endpoint that proxies Claude API calls
2. Add your Anthropic API key as an environment variable in Vercel:
   - Go to Project Settings → Environment Variables
   - Add `ANTHROPIC_API_KEY` with your API key

## Project Structure

```
meddpicc-copilot/
├── index.html              # HTML entry point
├── index.js                # React app entry point
├── meddpicc-copilot.jsx    # Main React component
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── vercel.json             # Vercel deployment config
└── README.md               # This file
```

## Usage

1. Click **"Start Demo Call"** to begin a simulated sales call
2. Watch the live transcript populate with prospect conversation
3. Review the **MEDDPICC Scorecard** as it updates in real-time
4. Check **Suggested Questions** to ask next
5. Monitor the **Intent Confidence** score
6. Click **"End Call"** to see final recommendations

## MVP Scope

This MVP focuses exclusively on:
- Early-stage qualification and intent detection
- Real-time MEDDPICC signal detection
- Automated scorecard population
- Clear go/no-go recommendations

**What this is NOT:**
- Not a full CRM or CRM replacement
- Not a full conversation intelligence platform
- Not a sales coaching tool
- Not a forecasting or pipeline management tool

## Success Metrics

- ✅ Reduction in time spent on low-intent deals
- ✅ Higher conversion rate from first call to qualified opportunity
- ✅ Faster disqualification of non-serious prospects
- ✅ Clear view of deal seriousness after each call

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.
