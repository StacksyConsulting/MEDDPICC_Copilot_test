import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, CheckCircle2, Circle, ChevronRight, Zap, TrendingUp, Users, Clock, Target, Award } from 'lucide-react';

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
  const transcriptEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptCountRef = useRef(0);
  const lastSpeechTimeRef = useRef(Date.now());
  const silenceThresholdMs = 2000; // 2 seconds of silence = new speaker

  // Scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          
          // Trigger analysis every 2 entries
          transcriptCountRef.current += 1;
          if (transcriptCountRef.current % 2 === 0) {
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

        // Trigger AI analysis every 2-3 transcript entries
        if (simulationIndex % 2 === 1) {
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

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: currentTranscript,
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

  // Generate mock analysis for demo mode
  const generateMockAnalysis = (transcript) => {
    return {
      meddpicc: {
        metrics: {
          status: "detected",
          evidence: ["8 hours per week wasted", "20% of selling time"],
          confidence: 0.85,
          missing_info: ["Specific revenue impact"]
        },
        economic_buyer: {
          status: "weak",
          evidence: ["CRO approves budget", "$50K annually"],
          confidence: 0.6,
          missing_info: ["CRO's name", "Exact decision authority"]
        },
        decision_process: {
          status: "detected",
          evidence: ["Technical evaluation", "Security sign-off", "6-8 weeks timeline"],
          confidence: 0.9,
          missing_info: []
        },
        decision_criteria: {
          status: "weak",
          evidence: [],
          confidence: 0.3,
          missing_info: ["What features matter most", "Success criteria"]
        },
        pain: {
          status: "detected",
          evidence: ["Wasting time on unqualified leads", "Deals going nowhere"],
          confidence: 0.9,
          missing_info: []
        },
        implications: {
          status: "detected",
          evidence: ["VP of Sales set goal for pipeline quality", "Need to close more with same headcount"],
          confidence: 0.75,
          missing_info: ["Consequences of not solving"]
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
          missing_info: ["Current alternatives", "Other vendors being considered"]
        }
      },
      suggested_questions: [
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
      ],
      intent_confidence: {
        level: "medium",
        reasoning: [
          "Clear pain identified with quantified impact",
          "Decision process outlined with timeline",
          "Budget authority mentioned but not confirmed"
        ],
        deal_risk_flags: [
          "No champion identified",
          "Competition landscape unknown",
          "Economic buyer not directly engaged"
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

  const MEDDPICCCard = ({ title, icon: Icon, data, color }) => {
    if (!data) return null;

    const statusColor = STATUS_COLORS[data.status];
    const statusLabel = STATUS_LABELS[data.status];

    return (
      <div className="bg-white border-2 border-slate-900 p-4 hover:shadow-lg transition-all duration-200">
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
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <label className="flex items-center gap-2 text-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLiveMode}
                  onChange={(e) => setUseLiveMode(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="font-semibold">Use Live Mode (Microphone)</span>
              </label>
            </div>

            <button
              onClick={startCall}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-lg transition-all flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl"
            >
              <Phone className="w-6 h-6" />
              {useLiveMode ? 'Start Live Call' : 'Start Demo Call'}
            </button>
            
            {useLiveMode && (
              <p className="text-xs text-slate-500 mt-4">
                Your browser will request microphone permission
              </p>
            )}
          </div>
        ) : (
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
                <div className="p-4 h-96 overflow-y-auto space-y-3">
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
                  <div ref={transcriptEndRef} />
                </div>
              </div>

              {/* Suggested Questions */}
              {suggestedQuestions.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-400 p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                      <h3 className="font-black text-xl text-slate-900">Suggested Questions</h3>
                    </div>
                    <span className="text-xs text-slate-600">Click to mark as asked</span>
                  </div>
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
                </div>
              )}
            </div>

            {/* Right Column - Intent Score */}
            <div className="space-y-6">
              {/* Intent Score */}
              {intentScore && (
                <div className={`border-2 border-slate-900 p-5 shadow-lg ${
                  intentScore.level === 'high' ? 'bg-emerald-50' :
                  intentScore.level === 'medium' ? 'bg-amber-50' :
                  'bg-red-50'
                }`}>
                  <div className="text-center mb-4">
                    <p className="text-xs font-bold text-slate-600 mb-2">INTENT CONFIDENCE</p>
                    <div className={`inline-block px-6 py-3 ${
                      intentScore.level === 'high' ? 'bg-emerald-500' :
                      intentScore.level === 'medium' ? 'bg-amber-500' :
                      'bg-red-500'
                    } text-white`}>
                      <span className="text-3xl font-black">{intentScore.level.toUpperCase()}</span>
                    </div>
                  </div>
                  {intentScore.reasoning && intentScore.reasoning.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-slate-600 mb-2">REASONING:</p>
                      {intentScore.reasoning.map((reason, idx) => (
                        <p key={idx} className="text-sm text-slate-700 mb-1">• {reason}</p>
                      ))}
                    </div>
                  )}
                  {intentScore.deal_risk_flags && intentScore.deal_risk_flags.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-2">RISK FLAGS:</p>
                      {intentScore.deal_risk_flags.map((flag, idx) => (
                        <p key={idx} className="text-sm text-red-700 font-medium mb-1">⚠️ {flag}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MEDDPICC Scorecard - Full Width Horizontal Grid */}
          {meddpiccState && (
            <div className="mt-6">
              <h2 className="text-2xl font-black text-slate-900 mb-4">MEDDPICC Scorecard</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              </div>
            </div>
          )}
        )}
      </div>
    </div>
  );
};

export default ClosePath;
