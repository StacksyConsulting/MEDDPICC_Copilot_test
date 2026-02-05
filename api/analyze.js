export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript, callId } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Invalid transcript data' });
    }

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

Focus on these MEDDPICC elements:
- Metrics (measurable impact, targets, KPIs)
- Economic Buyer (budget authority, decision maker)
- Decision Process (steps, timeline, criteria)
- Decision Criteria (what they're evaluating)
- Pain (current problem + consequences)
- Implications (what happens if they don't solve this)
- Champion (internal advocate for your solution)
- Competition (alternatives they're considering)

Output Format: Return ONLY valid JSON with this structure:
{
  "meddpicc": {
    "metrics": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "economic_buyer": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "decision_process": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "decision_criteria": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "pain": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "implications": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "champion": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []},
    "competition": {"status": "detected|weak|not_detected", "evidence": [], "confidence": 0.0, "missing_info": []}
  },
  "suggested_questions": [{"meddpicc_area": "string", "priority": "high|medium|low", "question": "string", "why_now": "string"}],
  "intent_confidence": {"level": "low|medium|high", "reasoning": [], "deal_risk_flags": []},
  "recommended_next_action": {"action": "proceed|re_qualify|disengage", "rationale": "string", "immediate_next_steps": []}
}`;

    const userPrompt = `You are receiving a live transcript stream. Update MEDDPICC state conservatively and suggest up to 3 questions maximum.

Call ID: ${callId}
Timestamp: ${new Date().toISOString()}

Current Transcript:
${transcript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n')}

Tasks:
1. Update statuses for all MEDDPICC components
2. Extract evidence from the transcript
3. Identify what is missing/weak
4. Suggest up to 5 questions max, highest impact first
5. Output strict JSON only following the schema

Scoring Guidelines:
- Metrics: Detected if measurable impact/KPIs/timelines stated
- Economic Buyer: Detected if budget authority/decision maker identified
- Decision Process: Detected if steps/timeline/criteria described
- Decision Criteria: Detected if evaluation factors or requirements mentioned
- Pain: Detected if clear current problem + consequences described
- Implications: Detected if consequences of inaction or urgency mentioned
- Champion: Detected if internal advocate or enthusiastic supporter identified
- Competition: Detected if alternatives, competitors, or current solutions mentioned

Intent Confidence:
- High: Pain + Implications detected AND (Metrics OR Economic Buyer detected) AND Decision Process clear
- Medium: Pain detected with some process clarity but missing key elements
- Low: Pain weak/not detected OR no Decision Process and unclear buyer`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: userPrompt }
        ],
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API Error:', errorData);
      return res.status(response.status).json({ 
        error: 'Claude API request failed', 
        details: errorData 
      });
    }

    const data = await response.json();
    
    // Extract JSON from response
    let jsonText = data.content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("");

    // Clean up markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const result = JSON.parse(jsonText);
      return res.status(200).json(result);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', jsonText);
      return res.status(500).json({ 
        error: 'Failed to parse Claude response', 
        raw: jsonText 
      });
    }

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
