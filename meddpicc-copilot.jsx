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

const MEDDPICCCopilot = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [meddpiccState, setMeddpiccState] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [intentScore, setIntentScore] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [callId] = useState(`call_${Date.now()}`);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const transcriptEndRef = useRef(null);

  // System prompt for Claude API
  const SYSTEM_PROMPT = `You are a Real-Time MEDDPICC Qualification Copilot for B2B SaaS sales calls.

Primary Objective: Help the sales rep qualify prospect intent early by:
- Detecting MEDDPICC signals in the live transcript
- Identifying missing/weak qualification areas
- Suggesting short, high-impact follow-up questions
- Producing an end-of-call MEDDPICC scorecard + Intent Confidence Score + Next Action

Constraints (Non-Negotiable):
- Do NOT coach the rep on tone, empathy, objection handling, or talk tracks
- Do NOT summarize the whole call unless it supports qualification
- Do NOT invent details that were not said in the transcript
- Be conservative. If something is unclear, mark it as "Weak/Unclear" or "Not Detected"
- Optimize for minimal interruption: prompts must be brief and optional

Focus only on these MEDDPICC elements:
- Metrics (measurable impact, targets, KPIs)
- Economic Buyer (budget authority, decision maker)
- Decision Process (steps, timeline, criteria)
- Pain (current problem + consequences)

Output Format: Return ONLY valid JSON with this structure:
{
  "meddpicc": {
    "metrics": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "economic_buyer": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "decision_process": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "pain": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []}
  },
  "suggested_questions": [{"meddpicc_area": "string", "priority": "high|medium|low", "question": "string", "why_now": "string"}],
  "intent_confidence": {"level": "low|medium|high", "reasoning": [], "deal_risk_flags": []},
  "recommended_next_action": {"action": "proceed|re_qualify|disengage", "rationale": "string", "immediate_next_steps": []}
}`;

  // Scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Simulate real-time transcription
  useEffect(() => {
    if (!isCallActive) return;

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
    }, 4000); // New transcript every 4 seconds

    return () => clearInterval(interval);
  }, [isCallActive, simulationIndex]);

  const analyzeTranscript = async (currentTranscript) => {
    setIsProcessing(true);

    try {
      const userPrompt = `You are receiving a live transcript stream. Update MEDDPICC state conservatively and suggest up to 3 questions maximum.

Call ID: ${callId}
Timestamp: ${new Date().toISOString()}

Current Transcript:
${currentTranscript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n')}

Tasks:
1. Update statuses for Metrics, Economic Buyer, Decision Process, Pain
2. Extract evidence from the transcript
3. Identify what is missing/weak
4. Suggest up to 3 questions max, highest impact first
5. Output strict JSON only following the schema

Scoring Guidelines:
- Metrics: Detected if measurable impact/KPIs/timelines stated
- Economic Buyer: Detected if budget authority/decision maker identified
- Decision Process: Detected if steps/timeline/criteria described
- Pain: Detected if clear current problem + consequences described

Intent Confidence:
- High: Pain + Decision Process detected AND (Metrics OR Economic Buyer detected)
- Medium: Pain detected but Decision Process/Economic Buyer unclear
- Low: Pain weak/not detected OR no Decision Process and unclear buyer`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: userPrompt }
          ],
        })
      });

      const data = await response.json();
      
      // Extract JSON from response
      let jsonText = data.content
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("");

      // Clean up markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const result = JSON.parse(jsonText);

      setMeddpiccState(result.meddpicc);
      setSuggestedQuestions(result.suggested_questions || []);
      setIntentScore(result.intent_confidence);

    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    setTranscript([]);
    setSimulationIndex(0);
    setMeddpiccState(null);
    setSuggestedQuestions([]);
    setIntentScore(null);
  };

  const endCall = () => {
    setIsCallActive(false);
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
                <h1 className="text-3xl font-black tracking-tight">MEDDPICC Copilot</h1>
                <p className="text-blue-300 text-sm font-medium">Real-Time Qualification Intelligence</p>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex items-center gap-3">
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
                    Start Demo Call
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Status */}
          {isCallActive && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold">LIVE</span>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 text-blue-300">
                  <Circle className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Analyzing...</span>
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
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Start your demo call to see real-time MEDDPICC qualification in action. 
              Get instant insights on prospect intent and receive suggested questions.
            </p>
            <button
              onClick={startCall}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-lg transition-all flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl"
            >
              <Phone className="w-6 h-6" />
              Start Demo Call
            </button>
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
                  {transcript.map((entry, idx) => (
                    <div key={idx} className={`flex gap-3 ${entry.speaker === 'rep' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${
                        entry.speaker === 'rep' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-100 text-slate-900'
                      } px-4 py-3 rounded-lg`}>
                        <div className="text-xs font-bold mb-1 opacity-75">
                          {entry.speaker === 'rep' ? 'YOU' : 'PROSPECT'}
                        </div>
                        <p className="text-sm leading-relaxed">{entry.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              </div>

              {/* Suggested Questions */}
              {suggestedQuestions.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-400 p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                    <h3 className="font-black text-xl text-slate-900">Suggested Questions</h3>
                  </div>
                  <div className="space-y-3">
                    {suggestedQuestions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="bg-white border-2 border-amber-400 p-4">
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
                              {q.meddpicc_area.replace('_', ' ').toUpperCase()}
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

            {/* Right Column - MEDDPICC Scorecard */}
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

              {/* MEDDPICC Components */}
              {meddpiccState && (
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
                    title="Pain" 
                    icon={Target}
                    data={meddpiccState.pain}
                    color="#ef4444"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium shadow-lg">
        <p>🤖 Powered by Claude Sonnet 4</p>
      </div>
    </div>
  );
};

export default MEDDPICCCopilot;
