const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const GoalSheet = require('../models/GoalSheet');
const { auth } = require('../middleware/auth');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/ai/analyze-goal — AI analyzes a single goal for quality
router.post('/analyze-goal', auth, async (req, res, next) => {
  try {
    const { goal } = req.body;

    const prompt = `You are an expert OKR and goal-setting coach. Analyze this employee goal and give brief, actionable feedback:

Goal: "${goal.title}"
Description: "${goal.description || 'Not provided'}"
Thrust Area: "${goal.thrustArea}"
Unit of Measurement: "${goal.uomType}" (min=higher is better, max=lower is better, timeline=date-based, zero=zero incidents)
Target: "${goal.target}"
Weightage: ${goal.weightage}%

Evaluate:
1. Is this SMART (Specific, Measurable, Achievable, Relevant, Time-bound)?
2. Is the UoM type appropriate for this goal?
3. Is the target ambitious yet realistic?
4. Suggest one improvement.

Respond in JSON format ONLY:
{
  "smartScore": 1-10,
  "feedback": "2-3 sentence constructive feedback",
  "suggestion": "One specific improvement",
  "isWellFormed": true/false
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });

    let analysis;
    try {
      const text = message.content[0].text;
      analysis = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    } catch {
      analysis = { smartScore: 7, feedback: 'Goal looks reasonable. Ensure target is clearly measurable.', suggestion: 'Add a specific deadline or milestone.', isWellFormed: true };
    }

    res.json({ success: true, analysis });
  } catch (err) {
    if (err.message?.includes('API key')) {
      return res.json({ success: true, analysis: { smartScore: 7, feedback: 'AI analysis unavailable. Goal structure looks reasonable.', suggestion: 'Ensure targets are quantifiable.', isWellFormed: true } });
    }
    next(err);
  }
});

// POST /api/ai/suggest-goals — AI suggests goals based on role/department
router.post('/suggest-goals', auth, async (req, res, next) => {
  try {
    const { department, designation, thrustArea } = req.body;

    const prompt = `You are an expert HR consultant helping employees set performance goals.
    
Employee: ${designation} in ${department} department
Focus Area: ${thrustArea}

Suggest 3 high-quality, SMART performance goals with:
- Clear measurable targets
- Appropriate UoM type (min=higher better, max=lower better, timeline=date, zero=zero incidents)
- Realistic weightage (10-30%)

Respond ONLY in JSON:
{
  "goals": [
    {
      "title": "Goal title",
      "description": "Brief description",
      "uomType": "min|max|timeline|zero",
      "target": "numeric value or date string",
      "weightage": 20,
      "rationale": "Why this goal matters"
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    let suggestions;
    try {
      const text = message.content[0].text;
      suggestions = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    } catch {
      suggestions = { goals: [] };
    }

    res.json({ success: true, suggestions });
  } catch (err) {
    if (err.message?.includes('API key')) {
      return res.json({ success: true, suggestions: { goals: [], message: 'AI suggestions unavailable. Please configure API key.' } });
    }
    next(err);
  }
});

// POST /api/ai/progress-insight — AI insight on team progress
router.post('/progress-insight', auth, async (req, res, next) => {
  try {
    const { sheetId, quarter } = req.body;

    const sheet = await GoalSheet.findById(sheetId).populate('employee', 'name department');
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    const goalsData = sheet.goals.map(g => ({
      title: g.title,
      target: g.target,
      actual: g.achievements[quarter]?.actual,
      score: g.achievements[quarter]?.score,
      status: g.achievements[quarter]?.status,
      weightage: g.weightage
    }));

    const prompt = `You are a performance coach reviewing quarterly progress. Provide a brief, motivating insight.

Employee: ${sheet.employee?.name} (${sheet.employee?.department})
Quarter: ${quarter?.toUpperCase()}
Overall Score: ${sheet.overallScores[quarter]}%

Goals Progress:
${goalsData.map(g => `- ${g.title}: Target=${g.target}, Actual=${g.actual ?? 'N/A'}, Score=${g.score ?? 0}%, Status=${g.status}`).join('\n')}

Provide a 3-4 sentence coaching insight covering:
1. What's going well
2. Area needing attention
3. Specific next step recommendation

Be direct, constructive, and encouraging. Return as plain text, no JSON.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const insight = message.content[0].text;
    res.json({ success: true, insight });
  } catch (err) {
    if (err.message?.includes('API key')) {
      return res.json({ success: true, insight: 'AI insights require API configuration. Review your goals progress manually and discuss with your manager during check-in.' });
    }
    next(err);
  }
});

module.exports = router;