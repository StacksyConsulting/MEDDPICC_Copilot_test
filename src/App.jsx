import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, CheckCircle2, Circle, ChevronRight, Zap, TrendingUp, Users, Clock, Target, Award, Download } from 'lucide-react';

// MEDDPICC Component Status Colors
const STATUS_COLORS = {
  detected: 'bg-emerald-500',
  weak: 'bg-amber-500',
  not_detected: 'bg-slate-300'
};

const STATUS_LABELS = {
  detected: 'Confirmed',
  weak: 'Weak',
  not_detected: 'Missing'
};

// Simulated transcript data for demo
const DEMO_TRANSCRIPT = [
  { speaker: 'rep', text: "Hi Sarah, thanks for taking the time today. I wanted to understand more about your current lead qualification process.", timestamp: 2 },
  { speaker: 'prospect', text: "Sure, happy to chat. Right now our sales team is spending way too much time on deals that go nowhere.", timestamp: 8 },
  { speaker: 'rep', text: "That's frustrating. Can you quantify that for me?", timestamp: 14 },
  { speaker: 'prospect', text: "We estimate our reps waste about 8 hours per week on unqualified leads. That's nearly 20% of their selling time.", timestamp: 18 },
  { speaker: 'rep', text: "That's significant. What's driving you to solve this now?", timestamp: 26 },
  { speaker: 'prospect', text: "Our VP of Sales set a goal to improve pipeline quality this quarter. We need to close more deals with the same headcount.", timestamp: 30 },
  { speaker: 'rep', text: "Got it. Who besides yourself would be involved in making this decision?", timestamp: 38 },
  { speaker: 'prospect', text: "I'd need buy-in from our VP of Sales and our CRO would need to approve the budget. Probably around $50K annually.", timestamp: 42 },
  { speaker: 'rep', text: "Makes sense. What does your typical buying process look like?", timestamp: 50 },
  { speaker: 'prospect', text: "We'd need to do a technical evaluation with our sales ops team, then get security sign-off, and finally present to leadership. Usually takes 6-8 weeks.", timestamp: 54 },
];

const ClosePath = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [meddpiccState, setMeddpiccState] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [intentScore, setIntentScore] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [callId] = useState(`call_${Date.now()}`);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [useLiveMode, setUseLiveMode] = useState(true); // Toggle between demo and live
  const [isListening, setIsListening] = useState(false);
  const [askedQuestions, setAskedQuestions] = useState([]); // Track asked questions
  const [currentSpeaker, setCurrentSpeaker] = useState(1); // Track current speaker number
  const [speakerColors] = useState(['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500']); // Colors for up to 4 speakers
  const recognitionRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const transcriptCountRef = useRef(0);
  const lastSpeechTimeRef = useRef(Date.now());
  const silenceThresholdMs = 2000; // 2 seconds of silence = new speaker

  // Auto-scroll transcript container only — scoped to that element, won't affect the page
  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcript]);

  // Initialize Web Speech API for live transcription
  useEffect(() => {
    if (!useLiveMode || !isCallActive) return;

    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let activeSpeaker = 1; // Start with Speaker 1
    let lastSpeechTime = Date.now();
    let lastSpeaker = 1; // Track the last speaker to alternate properly

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Detect speaker change based on silence gap
      const currentTime = Date.now();
      const timeSinceLastSpeech = currentTime - lastSpeechTime;
      
      if (timeSinceLastSpeech > silenceThresholdMs && finalTranscript) {
        // Silence detected - switch to the other speaker
        // If last speaker was 1, switch to 2, and vice versa
        activeSpeaker = lastSpeaker === 1 ? 2 : 1;
        lastSpeaker = activeSpeaker;
        setCurrentSpeaker(activeSpeaker);
      } else if (finalTranscript) {
        // No significant silence, same speaker continuing
        activeSpeaker = lastSpeaker;
      }

      // When we get a final result, add it to transcript
      if (finalTranscript) {
        lastSpeechTime = currentTime;
        lastSpeechTimeRef.current = currentTime;
        
        const newEntry = {
          speaker: `Speaker ${activeSpeaker}`,
          text: finalTranscript.trim(),
          timestamp: Date.now()
        };

        setTranscript(prev => {
          const updated = [...prev, newEntry];
          
          // SMART TRIGGERING: Analyze on keywords OR every 3 entries
          const hasKeywords = /budget|decision|problem|pain|timeline|process|buyer|cost|\$/i.test(finalTranscript);
          
          transcriptCountRef.current += 1;
          
          // Trigger immediately if important keywords detected, otherwise every 3 entries
          if (hasKeywords || transcriptCountRef.current % 3 === 0) {
            analyzeTranscript(updated);
          }
          
          return updated;
        });
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors, they're common
        recognition.stop();
        setTimeout(() => {
          if (isCallActive && useLiveMode) {
            recognition.start();
          }
        }, 100);
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Restart if call is still active
      if (isCallActive && useLiveMode) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    // Start recognition
    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      setError('Failed to start speech recognition');
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isCallActive, useLiveMode]);

  // Demo mode simulation (kept for testing)
  useEffect(() => {
    if (useLiveMode || !isCallActive) return;

    const interval = setInterval(() => {
      if (simulationIndex < DEMO_TRANSCRIPT.length) {
        const newEntry = DEMO_TRANSCRIPT[simulationIndex];
        setTranscript(prev => [...prev, newEntry]);
        setSimulationIndex(prev => prev + 1);

        // COST OPTIMIZATION: Trigger AI analysis every 3 transcript entries
        if (simulationIndex % 3 === 0) {
          analyzeTranscript([...transcript, newEntry]);
        }
      } else {
        // End of demo transcript
        setIsCallActive(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isCallActive, simulationIndex, useLiveMode]);

  const analyzeTranscript = async (currentTranscript) => {
    setIsProcessing(true);
    setError(null);

    // INSTANT FEEDBACK: Show "analyzing" pulse on tiles immediately
    // This makes it feel responsive even while API processes
    
    // COST OPTIMIZATION: Only send last 15 entries (keeps context manageable)
    const recentTranscript = currentTranscript.slice(-15);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: recentTranscript,
          callId: callId
        })
      });

      if (!response.ok) {
        // If running in demo mode and API fails, use mock data
        if (!useLiveMode) {
          console.log('Using mock data for demo mode');
          const mockResult = generateMockAnalysis(currentTranscript);
          setMeddpiccState(mockResult.meddpicc);
          setSuggestedQuestions(mockResult.suggested_questions.slice(0, 5));
          setIntentScore(mockResult.intent_confidence);
          setIsProcessing(false);
          return;
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();

      setMeddpiccState(result.meddpicc);
      
      // Filter out questions that have been asked, then cap at 5
      const newQuestions = (result.suggested_questions || [])
        .filter(q => !askedQuestions.includes(q.question))
        .slice(0, 5);
      
      setSuggestedQuestions(newQuestions);
      setIntentScore(result.intent_confidence);

    } catch (error) {
      console.error('Analysis error:', error);
      
      // If in demo mode, use mock data instead of showing error
      if (!useLiveMode) {
        console.log('API failed, using mock data for demo');
        const mockResult = generateMockAnalysis(currentTranscript);
        setMeddpiccState(mockResult.meddpicc);
        setSuggestedQuestions(mockResult.suggested_questions.slice(0, 5));
        setIntentScore(mockResult.intent_confidence);
      } else {
        setError('Analysis failed - check API setup');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate mock analysis for demo mode - PROGRESSIVE based on transcript
  const generateMockAnalysis = (transcript) => {
    const transcriptLength = transcript.length;
    const fullText = transcript.map(t => t.text).join(' ').toLowerCase();
    
    // Extract actual evidence from transcript
    const extractEvidence = (keywords) => {
      return transcript
        .map(t => t.text)
        .filter(text => keywords.some(kw => text.toLowerCase().includes(kw)))
        .slice(0, 2); // Max 2 pieces of evidence
    };
    
    // Progressive detection based on what's actually been said
    const hasMetrics = fullText.includes('hours') || fullText.includes('time') || fullText.includes('%') || fullText.includes('week');
    const hasBudget = fullText.includes('$') || fullText.includes('budget') || fullText.includes('cro') || fullText.includes('50k');
    const hasProcess = fullText.includes('evaluation') || fullText.includes('sign-off') || fullText.includes('weeks') || fullText.includes('timeline');
    const hasPain = fullText.includes('problem') || fullText.includes('frustrated') || fullText.includes('waste') || fullText.includes('time');
    const hasImplications = fullText.includes('goal') || fullText.includes('need') || fullText.includes('must') || fullText.includes('vp');
    
    const metricsEvidence = extractEvidence(['hours', 'week', '%', 'time']);
    const budgetEvidence = extractEvidence(['$', 'budget', 'cro', '50k', 'annually']);
    const processEvidence = extractEvidence(['evaluation', 'sign-off', 'weeks', 'timeline', 'process']);
    const painEvidence = extractEvidence(['waste', 'problem', 'frustrated', 'nowhere']);
    const implicationsEvidence = extractEvidence(['goal', 'vp', 'need', 'close more']);
    
    return {
      meddpicc: {
        metrics: {
          status: transcriptLength >= 3 && hasMetrics ? "detected" : transcriptLength >= 2 && hasMetrics ? "weak" : "not_detected",
          evidence: metricsEvidence,
          confidence: transcriptLength >= 3 && hasMetrics ? 0.85 : transcriptLength >= 2 && hasMetrics ? 0.4 : 0.1,
          missing_info: metricsEvidence.length > 0 ? ["Specific revenue impact"] : ["Quantified business metrics"]
        },
        economic_buyer: {
          status: transcriptLength >= 5 && hasBudget ? "weak" : "not_detected",
          evidence: budgetEvidence,
          confidence: transcriptLength >= 5 && hasBudget ? 0.6 : 0.1,
          missing_info: budgetEvidence.length > 0 ? ["CRO's name", "Exact decision authority"] : ["Budget authority", "Decision maker"]
        },
        decision_process: {
          status: transcriptLength >= 6 && hasProcess ? "detected" : transcriptLength >= 4 && hasProcess ? "weak" : "not_detected",
          evidence: processEvidence,
          confidence: transcriptLength >= 6 && hasProcess ? 0.9 : transcriptLength >= 4 && hasProcess ? 0.5 : 0.1,
          missing_info: processEvidence.length >= 2 ? [] : ["Buying process steps", "Timeline"]
        },
        decision_criteria: {
          status: "weak",
          evidence: [],
          confidence: transcriptLength >= 4 ? 0.3 : 0.1,
          missing_info: ["What features matter most", "Success criteria"]
        },
        pain: {
          status: transcriptLength >= 2 && hasPain ? "detected" : transcriptLength >= 1 && hasPain ? "weak" : "not_detected",
          evidence: painEvidence,
          confidence: transcriptLength >= 2 && hasPain ? 0.9 : transcriptLength >= 1 && hasPain ? 0.4 : 0.1,
          missing_info: painEvidence.length > 0 ? [] : ["Current problem details"]
        },
        implications: {
          status: transcriptLength >= 5 && hasImplications ? "detected" : transcriptLength >= 3 && hasImplications ? "weak" : "not_detected",
          evidence: implicationsEvidence,
          confidence: transcriptLength >= 5 && hasImplications ? 0.75 : transcriptLength >= 3 && hasImplications ? 0.4 : 0.1,
          missing_info: implicationsEvidence.length > 0 ? ["Consequences of not solving"] : ["Why this matters now"]
        },
        champion: {
          status: "not_detected",
          evidence: [],
          confidence: 0.1,
          missing_info: ["Internal advocate", "Who's excited about this"]
        },
        competition: {
          status: "not_detected",
          evidence: [],
          confidence: 0.1,
          missing_info: ["Current alternatives", "Other vendors"]
        }
      },
      suggested_questions: transcriptLength >= 4 ? [
        {
          meddpicc_area: "champion",
          priority: "high",
          question: "Who on your team is most excited about solving this problem?",
          why_now: "Need to identify an internal advocate"
        },
        {
          meddpicc_area: "competition",
          priority: "high",
          question: "Are you evaluating any other solutions alongside ours?",
          why_now: "Competitive landscape unclear"
        },
        {
          meddpicc_area: "decision_criteria",
          priority: "medium",
          question: "What are the top 3 criteria you'll use to make your decision?",
          why_now: "Need to understand evaluation factors"
        }
      ] : [],
      intent_confidence: {
        level: transcriptLength >= 6 ? "medium" : transcriptLength >= 3 ? "low" : "low",
        reasoning: transcriptLength >= 6 ? [
          "Pain signals detected in conversation",
          "Process discussion indicates active evaluation",
          "Budget authority mentioned"
        ] : transcriptLength >= 3 ? [
          "Initial discovery signals present",
          "Building qualification context"
        ] : [
          "Early stage conversation"
        ],
        deal_risk_flags: transcriptLength >= 6 ? [
          "No champion identified yet",
          "Competition unknown",
          "Decision criteria unclear"
        ] : transcriptLength >= 3 ? [
          "Limited qualification data",
          "Key stakeholders unclear"
        ] : [
          "Very early stage"
        ]
      }
    };
  };

  const startCall = () => {
    setIsCallActive(true);
    setTranscript([]);
    setSimulationIndex(0);
    setMeddpiccState(null);
    setSuggestedQuestions([]);
    setIntentScore(null);
    setError(null);
    setAskedQuestions([]); // Reset asked questions
    setCurrentSpeaker(1); // Reset to Speaker 1
    transcriptCountRef.current = 0;
    lastSpeechTimeRef.current = Date.now();
  };

  const endCall = () => {
    setIsCallActive(false);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const markQuestionAsAsked = (question) => {
    setAskedQuestions(prev => [...prev, question]);
    setSuggestedQuestions(prev => prev.filter(q => q.question !== question));
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // EXPORT FUNCTIONS
  const exportToPDF = () => {
    const content = generateExportContent();
    const blob = new Blob([content.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `closepath-call-analysis-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToNotion = () => {
    const content = generateExportContent();
    navigator.clipboard.writeText(content.markdown);
    alert('✓ Copied to clipboard! Paste into Notion.');
  };

  const exportToAppleNotes = () => {
    const content = generateExportContent();
    const blob = new Blob([content.markdown], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `closepath-call-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateExportContent = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    // Markdown format (for Notion, Apple Notes, OneNote)
    let markdown = `# ClosePath Call Analysis\n`;
    markdown += `**Date:** ${date} ${time}\n\n`;
    
    // Intent Score
    markdown += `## 🎯 Intent Confidence: ${intentScore?.level?.toUpperCase() || 'N/A'}\n\n`;
    if (intentScore?.reasoning) {
      markdown += `**Reasoning:**\n`;
      intentScore.reasoning.forEach(r => markdown += `- ${r}\n`);
      markdown += `\n`;
    }
    if (intentScore?.deal_risk_flags && intentScore.deal_risk_flags.length > 0) {
      markdown += `**⚠️ Risk Flags:**\n`;
      intentScore.deal_risk_flags.forEach(r => markdown += `- ${r}\n`);
      markdown += `\n`;
    }

    // MEDDPICC
    markdown += `## 📊 MEDDPICC Scorecard\n\n`;
    if (meddpiccState) {
      const sections = [
        { key: 'metrics', title: 'Metrics' },
        { key: 'economic_buyer', title: 'Economic Buyer' },
        { key: 'decision_process', title: 'Decision Process' },
        { key: 'decision_criteria', title: 'Decision Criteria' },
        { key: 'pain', title: 'Pain' },
        { key: 'implications', title: 'Implications' },
        { key: 'champion', title: 'Champion' },
        { key: 'competition', title: 'Competition' }
      ];

      sections.forEach(({ key, title }) => {
        const data = meddpiccState[key];
        if (data) {
          markdown += `### ${title}\n`;
          markdown += `**Status:** ${STATUS_LABELS[data.status]} (${Math.round(data.confidence * 100)}% confidence)\n\n`;
          
          if (data.evidence && data.evidence.length > 0) {
            markdown += `**Evidence:**\n`;
            data.evidence.forEach(e => markdown += `- "${e}"\n`);
            markdown += `\n`;
          }
          
          if (data.missing_info && data.missing_info.length > 0) {
            markdown += `**Missing:**\n`;
            data.missing_info.forEach(m => markdown += `- ${m}\n`);
            markdown += `\n`;
          }
        }
      });
    }

    // Suggested Questions
    if (suggestedQuestions && suggestedQuestions.length > 0) {
      markdown += `## ❓ Suggested Questions\n\n`;
      suggestedQuestions.forEach(q => {
        markdown += `### ${q.question}\n`;
        markdown += `- **Priority:** ${q.priority.toUpperCase()}\n`;
        markdown += `- **Area:** ${q.meddpicc_area.replace(/_/g, ' ')}\n`;
        markdown += `- **Why now:** ${q.why_now}\n\n`;
      });
    }

    // HTML format with VISUAL TILES
    const intentLevel = intentScore?.level || 'low';
    const intentColor = intentLevel === 'high' ? '#10b981' : intentLevel === 'medium' ? '#f59e0b' : '#ef4444';
    const intentBg = intentLevel === 'high' ? '#d1fae5' : intentLevel === 'medium' ? '#fef3c7' : '#fee2e2';
    
    let meddpiccTilesHtml = '';
    if (meddpiccState) {
      const sections = [
        { key: 'metrics', title: 'Metrics', color: '#3b82f6' },
        { key: 'economic_buyer', title: 'Economic Buyer', color: '#8b5cf6' },
        { key: 'decision_process', title: 'Decision Process', color: '#f59e0b' },
        { key: 'decision_criteria', title: 'Decision Criteria', color: '#10b981' },
        { key: 'pain', title: 'Pain', color: '#ef4444' },
        { key: 'implications', title: 'Implications', color: '#f97316' },
        { key: 'champion', title: 'Champion', color: '#06b6d4' },
        { key: 'competition', title: 'Competition', color: '#6366f1' }
      ];

      sections.forEach(({ key, title, color }) => {
        const data = meddpiccState[key];
        if (data) {
          const statusColor = data.status === 'detected' ? '#10b981' : data.status === 'weak' ? '#f59e0b' : '#cbd5e1';
          const statusLabel = STATUS_LABELS[data.status];
          
          meddpiccTilesHtml += `
            <div style="background: white; border: 2px solid #1e293b; padding: 16px; margin-bottom: 16px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: ${color};">${title}</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold;">${statusLabel}</span>
                  <span style="font-size: 12px; font-weight: 600; color: #64748b;">${Math.round(data.confidence * 100)}%</span>
                </div>
              </div>
              
              ${data.evidence && data.evidence.length > 0 ? `
                <div style="margin-bottom: 12px;">
                  <p style="font-size: 11px; font-weight: bold; color: #64748b; margin: 0 0 6px 0;">EVIDENCE:</p>
                  ${data.evidence.map(e => `<p style="font-size: 13px; color: #1e293b; margin: 4px 0; padding: 8px; background: #f8fafc; border-radius: 4px;">"${e}"</p>`).join('')}
                </div>
              ` : ''}
              
              ${data.missing_info && data.missing_info.length > 0 ? `
                <div>
                  <p style="font-size: 11px; font-weight: bold; color: #64748b; margin: 0 0 6px 0;">MISSING INFO:</p>
                  ${data.missing_info.map(m => `<p style="font-size: 13px; color: #64748b; margin: 4px 0;">• ${m}</p>`).join('')}
                </div>
              ` : ''}
              
              <div style="margin-top: 12px;">
                <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                  <div style="background: ${statusColor}; height: 100%; width: ${Math.round(data.confidence * 100)}%; transition: width 0.3s;"></div>
                </div>
              </div>
            </div>
          `;
        }
      });
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ClosePath Call Analysis - ${date}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
      max-width: 900px; 
      margin: 40px auto; 
      padding: 20px;
      background: #f8fafc;
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    h1 { 
      margin: 0 0 10px 0; 
      font-size: 32px;
      font-weight: 900;
    }
    .date {
      color: #93c5fd;
      font-size: 14px;
    }
    h2 { 
      color: #1e293b; 
      margin-top: 40px; 
      margin-bottom: 20px;
      font-size: 24px;
      font-weight: 800;
      border-bottom: 3px solid #3b82f6; 
      padding-bottom: 10px; 
    }
    .intent-card {
      background: ${intentBg};
      border: 3px solid ${intentColor};
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .intent-level {
      display: inline-block;
      background: ${intentColor};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 24px;
      font-weight: 900;
      margin-bottom: 16px;
    }
    .meddpicc-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    @media print {
      .meddpicc-grid {
        grid-template-columns: 1fr;
      }
    }
    .question {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin-bottom: 16px;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    .question h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #1e293b;
    }
    .priority-high { color: #ef4444; font-weight: 700; }
    .priority-medium { color: #f59e0b; font-weight: 700; }
    .priority-low { color: #64748b; font-weight: 700; }
    .transcript-entry {
      padding: 12px;
      margin: 8px 0;
      background: white;
      border-radius: 4px;
      border-left: 3px solid #3b82f6;
    }
    .speaker {
      font-weight: 700;
      color: #3b82f6;
      margin-right: 8px;
    }
    @media print {
      body { background: white; }
      .header { background: #1e293b !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ClosePath Call Analysis</h1>
    <div class="date">${date} at ${time}</div>
  </div>

  <h2>🎯 Intent Confidence</h2>
  <div class="intent-card">
    <div class="intent-level">${intentScore?.level?.toUpperCase() || 'N/A'}</div>
    ${intentScore?.reasoning ? `
      <div style="margin-top: 16px;">
        <p style="font-weight: 700; margin: 0 0 8px 0;">Reasoning:</p>
        ${intentScore.reasoning.map(r => `<p style="margin: 4px 0;">• ${r}</p>`).join('')}
      </div>
    ` : ''}
    ${intentScore?.deal_risk_flags && intentScore.deal_risk_flags.length > 0 ? `
      <div style="margin-top: 16px;">
        <p style="font-weight: 700; margin: 0 0 8px 0; color: #ef4444;">⚠️ Risk Flags:</p>
        ${intentScore.deal_risk_flags.map(r => `<p style="margin: 4px 0; color: #991b1b;">• ${r}</p>`).join('')}
      </div>
    ` : ''}
  </div>

  <h2>📊 MEDDPICC Scorecard</h2>
  <div class="meddpicc-grid">
    ${meddpiccTilesHtml}
  </div>

  ${suggestedQuestions && suggestedQuestions.length > 0 ? `
    <h2>❓ Suggested Questions</h2>
    ${suggestedQuestions.map(q => `
      <div class="question">
        <h3>${q.question}</h3>
        <p style="margin: 4px 0;"><span class="priority-${q.priority}">${q.priority.toUpperCase()}</span> • ${q.meddpicc_area.replace(/_/g, ' ')}</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">${q.why_now}</p>
      </div>
    `).join('')}
  ` : ''}
</body>
</html>`;

    return { markdown, html };
  };

  const MEDDPICCCard = ({ title, icon: Icon, data, color }) => {
    if (!data) return null;

    const statusColor = STATUS_COLORS[data.status];
    const statusLabel = STATUS_LABELS[data.status];

    return (
      <div className={`bg-white border-2 border-slate-900 p-4 hover:shadow-lg transition-all duration-200 ${
        isProcessing ? 'animate-pulse' : ''
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color }} />
            <h3 className="font-bold text-lg tracking-tight">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-bold ${statusColor} text-white`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {data.evidence && data.evidence.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold text-slate-600 mb-1">EVIDENCE:</p>
            {data.evidence.map((ev, idx) => (
              <p key={idx} className="text-sm text-slate-700 italic mb-1">"{ev}"</p>
            ))}
          </div>
        )}

        {data.missing_info && data.missing_info.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1">MISSING:</p>
            {data.missing_info.map((info, idx) => (
              <p key={idx} className="text-xs text-slate-600">• {info}</p>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">CONFIDENCE</span>
            <span className="text-sm font-bold">{Math.round(data.confidence * 100)}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 mt-1">
            <div 
              className="h-2 transition-all duration-500"
              style={{ width: `${data.confidence * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans">
      {/* Header */}
      <div className="bg-slate-900 text-white border-b-4 border-blue-500 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">ClosePath</h1>
                <p className="text-blue-300 text-sm font-medium">Real-Time Qualification Intelligence</p>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex items-center gap-3">
              {!isCallActive && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useLiveMode}
                    onChange={(e) => setUseLiveMode(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Live Mode (Microphone)</span>
                </label>
              )}

              {isCallActive && (
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-lg font-bold transition-all ${
                    isMuted 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              
              <button
                onClick={isCallActive ? endCall : startCall}
                className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  isCallActive
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isCallActive ? (
                  <>
                    <PhoneOff className="w-5 h-5" />
                    End Call
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    {useLiveMode ? 'Start Live Call' : 'Start Demo Call'}
                  </>
                )}
              </button>

              {/* Export Dropdown - Only show when call is complete and has data */}
              {!isCallActive && meddpiccState && (
                <div className="relative group">
                  <button className="p-3 rounded-lg font-bold transition-all bg-blue-500 hover:bg-blue-600 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                  </button>
                  
                  {/* Export Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border-2 border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-slate-200">
                        <p className="text-xs font-bold text-slate-600 uppercase">Export Call Analysis</p>
                      </div>
                      
                      <button
                        onClick={exportToNotion}
                        className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
                      >
                        <span className="text-2xl">📝</span>
                        <div>
                          <div className="font-bold text-slate-900">Notion</div>
                          <div className="text-xs text-slate-600">Copy to clipboard</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={exportToPDF}
                        className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
                      >
                        <span className="text-2xl">📄</span>
                        <div>
                          <div className="font-bold text-slate-900">PDF/HTML</div>
                          <div className="text-xs text-slate-600">Visual report</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={exportToAppleNotes}
                        className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
                      >
                        <span className="text-2xl">🍎</span>
                        <div>
                          <div className="font-bold text-slate-900">Notes / OneNote</div>
                          <div className="text-xs text-slate-600">Plain text format</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Status */}
          {isCallActive && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold">{useLiveMode ? 'LIVE - Listening' : 'DEMO MODE'}</span>
              </div>
              {isListening && useLiveMode && (
                <>
                  <div className="flex items-center gap-2 text-green-300">
                    <Mic className="w-4 h-4 animate-pulse" />
                    <span className="text-xs font-medium">Microphone Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${speakerColors[(currentSpeaker - 1) % speakerColors.length]}`} />
                    <span className="text-xs font-medium">Current: Speaker {currentSpeaker}</span>
                  </div>
                </>
              )}
              {isProcessing && (
                <div className="flex items-center gap-2 text-blue-300">
                  <Circle className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Analyzing...</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!isCallActive && transcript.length === 0 ? (
          // Welcome State
          <div className="text-center py-20">
            <div className="inline-block bg-blue-500 p-6 rounded-2xl mb-6">
              <Phone className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Ready to Qualify Smarter</h2>
            <p className="text-xl text-slate-600 mb-4 max-w-2xl mx-auto">
              Real-time MEDDPICC qualification powered by AI. 
              Get instant insights on prospect intent and receive suggested questions during your calls.
            </p>
            <p className="text-sm text-slate-500 mb-8">
              <strong>Live Mode:</strong> Uses your microphone for real calls • 
              <strong> Demo Mode:</strong> Pre-recorded simulation
            </p>
            
            <button
              onClick={startCall}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-lg transition-all flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl"
            >
              <Phone className="w-6 h-6" />
              {useLiveMode ? 'Start Live Call' : 'Start Demo Call'}
            </button>
            
            {useLiveMode && (
              <p className="text-xs text-slate-500 mt-4 text-center">
                Your browser will request microphone permission
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Transcript & Questions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Live Transcript */}
              <div className="bg-white border-2 border-slate-900 shadow-lg">
                <div className="bg-slate-900 text-white px-4 py-3 border-b-2 border-slate-700">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Live Transcript
                  </h2>
                </div>
                <div ref={transcriptContainerRef} className="p-4 h-96 overflow-y-auto space-y-3">
                  {transcript.map((entry, idx) => {
                    // Extract speaker number (e.g., "Speaker 1" -> 1)
                    const speakerNum = entry.speaker.includes('Speaker') 
                      ? parseInt(entry.speaker.split(' ')[1]) || 1
                      : 1;
                    
                    // Assign color based on speaker number
                    const colorClass = speakerColors[(speakerNum - 1) % speakerColors.length];
                    
                    return (
                      <div key={idx} className="flex gap-3 justify-start">
                        <div className={`max-w-[80%] ${colorClass} text-white px-4 py-3 rounded-lg shadow-md`}>
                          <div className="text-xs font-bold mb-1 opacity-90">
                            {entry.speaker.toUpperCase()}
                          </div>
                          <p className="text-sm leading-relaxed">{entry.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Suggested Questions */}
              <div className="bg-amber-50 border-2 border-amber-400 p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                    <h3 className="font-black text-xl text-slate-900">Suggested Questions</h3>
                  </div>
                  {suggestedQuestions.length > 0 && (
                    <span className="text-xs text-slate-600">Click to mark as asked</span>
                  )}
                </div>
                {suggestedQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {suggestedQuestions.map((q, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => markQuestionAsAsked(q.question)}
                        className="bg-white border-2 border-amber-400 p-4 cursor-pointer hover:bg-amber-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`px-2 py-1 text-xs font-bold ${
                            q.priority === 'high' ? 'bg-red-500' : 
                            q.priority === 'medium' ? 'bg-amber-500' : 
                            'bg-slate-400'
                          } text-white shrink-0`}>
                            {q.priority.toUpperCase()}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-600 mb-1">
                              {q.meddpicc_area.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="font-bold text-slate-900 mb-2">{q.question}</p>
                            <p className="text-xs text-slate-600 italic">{q.why_now}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">Questions will appear as the conversation progresses...</p>
                )}
              </div>
            </div>

            {/* Right Column - Intent Score */}
            <div className="space-y-6">
              {/* Intent Score */}
              <div className={`border-2 border-slate-900 p-5 shadow-lg ${
                intentScore ? (
                  intentScore.level === 'high' ? 'bg-emerald-50' :
                  intentScore.level === 'medium' ? 'bg-amber-50' :
                  'bg-red-50'
                ) : 'bg-slate-50'
              }`}>
                <div className="text-center mb-4">
                  <p className="text-xs font-bold text-slate-600 mb-2">INTENT CONFIDENCE</p>
                  {intentScore ? (
                    <div className={`inline-block px-6 py-3 ${
                      intentScore.level === 'high' ? 'bg-emerald-500' :
                      intentScore.level === 'medium' ? 'bg-amber-500' :
                      'bg-red-500'
                    } text-white`}>
                      <span className="text-3xl font-black">{intentScore.level.toUpperCase()}</span>
                    </div>
                  ) : (
                    <div className="inline-block px-6 py-3 bg-slate-300 text-white">
                      <span className="text-3xl font-black">PENDING</span>
                    </div>
                  )}
                </div>
                {intentScore && intentScore.reasoning && intentScore.reasoning.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-600 mb-2">REASONING:</p>
                    {intentScore.reasoning.map((reason, idx) => (
                      <p key={idx} className="text-sm text-slate-700 mb-1">• {reason}</p>
                    ))}
                  </div>
                )}
                {intentScore && intentScore.deal_risk_flags && intentScore.deal_risk_flags.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">RISK FLAGS:</p>
                    {intentScore.deal_risk_flags.map((flag, idx) => (
                      <p key={idx} className="text-sm text-red-700 font-medium mb-1">⚠️ {flag}</p>
                    ))}
                  </div>
                )}
                {!intentScore && (
                  <p className="text-sm text-slate-600 italic text-center">Analysis will appear as the conversation progresses...</p>
                )}
              </div>
            </div>
          </div>

          {/* MEDDPICC Scorecard - Full Width, 2 Rows of 4 */}
          <div className="mt-6">
            <h2 className="text-2xl font-black text-slate-900 mb-4">MEDDPICC Scorecard</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {meddpiccState ? (
                <>
                  <MEDDPICCCard 
                    title="Metrics" 
                    icon={TrendingUp}
                    data={meddpiccState.metrics}
                    color="#3b82f6"
                  />
                  <MEDDPICCCard 
                    title="Economic Buyer" 
                    icon={Users}
                    data={meddpiccState.economic_buyer}
                    color="#8b5cf6"
                  />
                  <MEDDPICCCard 
                    title="Decision Process" 
                    icon={Clock}
                    data={meddpiccState.decision_process}
                    color="#f59e0b"
                  />
                  <MEDDPICCCard 
                    title="Decision Criteria" 
                    icon={CheckCircle2}
                    data={meddpiccState.decision_criteria}
                    color="#10b981"
                  />
                  <MEDDPICCCard 
                    title="Pain" 
                    icon={Target}
                    data={meddpiccState.pain}
                    color="#ef4444"
                  />
                  <MEDDPICCCard 
                    title="Implications" 
                    icon={AlertCircle}
                    data={meddpiccState.implications}
                    color="#f97316"
                  />
                  <MEDDPICCCard 
                    title="Champion" 
                    icon={Award}
                    data={meddpiccState.champion}
                    color="#06b6d4"
                  />
                  <MEDDPICCCard 
                    title="Competition" 
                    icon={ChevronRight}
                    data={meddpiccState.competition}
                    color="#6366f1"
                  />
                </>
              ) : (
                <>
                  <MEDDPICCCard 
                    title="Metrics" 
                    icon={TrendingUp}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#3b82f6"
                  />
                  <MEDDPICCCard 
                    title="Economic Buyer" 
                    icon={Users}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#8b5cf6"
                  />
                  <MEDDPICCCard 
                    title="Decision Process" 
                    icon={Clock}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#f59e0b"
                  />
                  <MEDDPICCCard 
                    title="Decision Criteria" 
                    icon={CheckCircle2}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#10b981"
                  />
                  <MEDDPICCCard 
                    title="Pain" 
                    icon={Target}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#ef4444"
                  />
                  <MEDDPICCCard 
                    title="Implications" 
                    icon={AlertCircle}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#f97316"
                  />
                  <MEDDPICCCard 
                    title="Champion" 
                    icon={Award}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#06b6d4"
                  />
                  <MEDDPICCCard 
                    title="Competition" 
                    icon={ChevronRight}
                    data={{status: "not_detected", evidence: [], confidence: 0, missing_info: []}}
                    color="#6366f1"
                  />
                </>
              )}
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClosePath;
