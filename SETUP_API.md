# Setting Up Claude API Integration

## 🔑 Getting Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-...`)

## 🚀 Adding API Key to Vercel

### Method 1: Vercel Dashboard (Easiest)

1. Go to your project on [vercel.com](https://vercel.com)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Set:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key (paste the `sk-ant-...` key)
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**
7. **Redeploy** your project:
   - Go to **Deployments** tab
   - Click the ⋯ menu on latest deployment
   - Click **Redeploy**

### Method 2: Vercel CLI

```bash
vercel env add ANTHROPIC_API_KEY
# Paste your API key when prompted
# Select all environments (production, preview, development)

# Redeploy
vercel --prod
```

## 📁 File Structure

Your project should have this structure:

```
meddpicc-copilot-app/
├── api/
│   └── analyze.js          ← Backend API (handles Claude calls)
├── index.html
├── index.js
├── index.css
├── meddpicc-copilot.jsx    ← Frontend (calls /api/analyze)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── vercel.json
```

## ✅ Verification

After adding the API key and redeploying:

1. Visit your Vercel app
2. Click **Start Demo Call**
3. Watch the transcript populate
4. You should see the MEDDPICC scorecard update with **real AI analysis**
5. Check browser console - no errors about API keys

## 🐛 Troubleshooting

**Problem**: Still seeing "offline mode" or blank scorecard
- **Solution**: Make sure you redeployed after adding the environment variable

**Problem**: "API key invalid" error
- **Solution**: Verify your API key is correct and starts with `sk-ant-`

**Problem**: "Rate limit exceeded"
- **Solution**: You've hit Anthropic's rate limits. Wait a few minutes or upgrade your plan

**Problem**: Blank screen
- **Solution**: Check browser console (F12) for errors

## 💰 API Costs

- Claude Sonnet 4 costs approximately **$3 per million input tokens**
- Each analysis uses ~500-1000 tokens
- Estimated cost: **$0.001-0.003 per call analysis**
- For demo purposes, this is very affordable

## 🔒 Security Note

✅ **Good**: API key stored in Vercel environment variables (secure)
❌ **Bad**: Never put API keys directly in your code or commit them to GitHub

The backend API route (`/api/analyze.js`) keeps your key secure on the server side.

## 📚 Next Steps

Once your API key is working:
1. Test with different conversation scenarios
2. Adjust the MEDDPICC detection logic in `/api/analyze.js`
3. Add more MEDDPICC components (Implications, Champion, Competition)
4. Integrate with your CRM
5. Add real call recording integration (Zoom, Teams, etc.)
