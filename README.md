# ClosePath - Real-Time Sales Qualification Intelligence

AI-powered MEDDPICC qualification copilot for live sales calls.

## 🚀 Quick Start

1. **Clone this repository**
2. **Install dependencies**: `npm install`
3. **Set up API key**: See [SETUP_API.md](SETUP_API.md)
4. **Deploy to Vercel**: Connect your GitHub repo to Vercel

## 📁 Project Structure

```
closepath/
├── api/
│   └── analyze.js              ← Backend: Claude API integration
├── src/
│   ├── App.jsx                 ← Main ClosePath component (CURRENT VERSION)
│   ├── main.jsx                ← Entry point for Vite
│   └── index.css               ← Tailwind CSS imports
├── index.html                  ← HTML entry point
├── package.json                ← Dependencies
├── vite.config.js              ← Vite build configuration
├── tailwind.config.js          ← Tailwind CSS config
├── postcss.config.js           ← PostCSS config
├── vercel.json                 ← Vercel deployment config
├── SETUP_API.md                ← API setup instructions
├── README.md                   ← This file
│
├── meddpicc-copilot.jsx        ← Legacy component (reference only)
├── index.jsx                   ← Legacy entry point (reference only)
└── TestApp.jsx                 ← Test component (reference only)
```

## 🎯 Features

### Current Version (src/App.jsx)
- ✅ **Live microphone transcription** using Web Speech API
- ✅ **Speaker detection** (alternates between 2 speakers)
- ✅ **Real-time MEDDPICC analysis** powered by Claude Sonnet 4
- ✅ **All 8 MEDDPICC components**:
  - Metrics
  - Economic Buyer
  - Decision Process
  - Decision Criteria
  - Pain
  - Implications
  - Champion
  - Competition
- ✅ **Suggested questions** (max 5, click to dismiss)
- ✅ **Intent confidence scoring** (Low/Medium/High)
- ✅ **Horizontal MEDDPICC grid** for easy scanning
- ✅ **Demo mode** for testing without microphone

## 🔧 Development

### Local Development
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
1. Push to GitHub
2. Connect repository to Vercel
3. Add `ANTHROPIC_API_KEY` environment variable
4. Deploy!

## 🎨 Design System

See [ClosePath-Design-System](../ClosePath-Design-System/) folder for:
- Brand colors and typography
- Component library
- Lovable.ai quick start guide

## 📝 API Setup

See [SETUP_API.md](SETUP_API.md) for detailed instructions on:
- Getting your Anthropic API key
- Adding it to Vercel
- Troubleshooting common issues

## 💰 Costs

- **Claude Sonnet 4**: ~$3 per million input tokens
- **Per analysis**: ~$0.001-0.003
- Very affordable for demo and production use

## 🔒 Security

- API keys stored securely in Vercel environment variables
- Backend API route keeps keys server-side
- Never commit API keys to code or GitHub

## 🌐 Browser Support

### Full Support (Recommended)
- ✅ Chrome
- ✅ Edge

### Limited Support
- ⚠️ Firefox (no Web Speech API)
- ⚠️ Safari (limited Web Speech API)

## 📚 Learn More

- [Anthropic Claude API Docs](https://docs.anthropic.com)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MEDDPICC Framework](https://www.meddic.com/)

## 🐛 Troubleshooting

Common issues and solutions in [SETUP_API.md](SETUP_API.md)

## 📦 Version History

- **v2**: Fixed JSX nesting for MEDDPICC horizontal layout
- **v1**: Initial version with all features

---

**Built with**: React, Vite, Tailwind CSS, Claude Sonnet 4, Web Speech API
