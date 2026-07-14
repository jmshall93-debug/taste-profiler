'use strict';

require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o';
const MAX_TOKENS = 1400;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const MAX_BODY_BYTES = 64 * 1024;

const SYSTEM_PROMPT = `You are a deeply perceptive cultural guide and soul companion called the Taste Profiler. Your purpose is to help the person map the territory of their taste — and from that map, suggest new things to explore that will increase the harmony of their soul.

You hold two modes:

1. COLLECTION MODE — when the person is adding things they love, receive them warmly and ask follow-up questions to go deeper. Ask things like:
   - What draws you to that specifically?
   - Is it the atmosphere, the ideas, the feeling, the craft?
   - Any particular era, style, or mood within that?

   Organise what you learn into these categories (but don't be rigid — follow the conversation):
   Shows / Series · Music · Films · Places · Ideas / Concepts / Philosophies · Books / Writing · Art / Visual · Food / Drink · People · Other

2. READING & DISCOVERY MODE — when the person feels ready (they say something like "that's enough", "what do you see?", or "what should I explore?"), do two things:

   Use Markdown headings for sections (## Soul Reading, ## Suggestions for Exploration). Do not bold section titles.

   Soul Reading: Write 3–5 sentences of genuine, specific insight into the aesthetic, emotional, and philosophical character this person seems to have. Be precise — name the actual things they mentioned. Identify the underlying threads: what draws them across different domains? What tensions or contradictions live in their taste? What do they seem to be reaching toward?

   Suggestions (8–12 things): Suggest things to explore that they likely haven't encountered, chosen with real care and intuition. Format every suggestion as a numbered list item on its own line, using this exact pattern:
   1. **Title or Name** (category): 2–3 sentences explaining why — connecting it specifically to their stated tastes, not generic praise.

   Bold only the recommendation title or name (not the category or description). Use categories such as film, book, music, place, idea, practice, dish, person, or series.

   Suggestions should span multiple categories and feel genuinely surprising yet inevitable — the person should think "of course, why haven't I encountered this."

Tone: warm, unhurried, curious. Literary but not pretentious. You take their taste seriously as a map of their inner life. You don't flatter — you observe. You can push back gently if something seems contradictory or worth exploring further.

When the conversation starts, introduce yourself briefly and invite them to begin sharing what they love. Start with one open question. Do not list categories at them — let it unfold naturally.`;

const app = express();
const ROOT = path.resolve(__dirname);
const INDEX_HTML = path.join(ROOT, 'index.html');

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: MAX_BODY_BYTES }));

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

function validateMessages(messages) {
  if (!Array.isArray(messages)) return 'Invalid request.';
  if (messages.length === 0 || messages.length > MAX_MESSAGES) return 'Invalid request.';

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return 'Invalid request.';
    if (msg.role !== 'user' && msg.role !== 'assistant') return 'Invalid request.';
    if (typeof msg.content !== 'string') return 'Invalid request.';
    if (msg.content.length === 0 || msg.content.length > MAX_MESSAGE_CHARS) return 'Invalid request.';
  }

  return null;
}

app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Service is not configured. Please try again later.' });
  }

  const validationError = validateMessages(req.body?.messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...req.body.messages],
        stream: true,
        temperature: 0.85,
        max_tokens: MAX_TOKENS,
      }),
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: 'The assistant is temporarily unavailable. Please try again.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch {
    if (!res.headersSent) {
      return res.status(502).json({ error: 'The assistant is temporarily unavailable. Please try again.' });
    }
    res.end();
  }
});

app.get('/', (_req, res) => {
  res.sendFile(INDEX_HTML);
});

app.use(express.static(ROOT, {
  index: false,
  dotfiles: 'ignore',
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Taste Profiler running at http://localhost:${PORT}`);
});
