// server.js — Fallback voice pipeline (STT -> LLM -> TTS), project keys supported
// Node 18+ | ESM ("type":"module" in package.json)

import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
app.use(cors({ origin: "*" })); // tighten in production
app.use(express.json({ limit: "10mb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;      // sk-proj-...
const OPENAI_PROJECT = process.env.OPENAI_PROJECT_ID;   // proj_...

if (!OPENAI_API_KEY || !OPENAI_PROJECT) {
  console.warn("⚠️ Missing OPENAI_API_KEY or OPENAI_PROJECT_ID env vars.");
}

// Health
app.get("/", (_req, res) => {
  res.type("text").send("Fallback voice server is running. POST /reply with audio.");
});

// Multer for audio upload (form field: "audio")
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// System prompt for the assistant
const SYSTEM_PROMPT = `
You are Jesus portrayed respectfully and compassionately in a VR walk-along experience.
Speak briefly (1–3 sentences), warm, gentle, and scripture-informed when helpful.
Be inclusive and non-judgmental. Avoid medical, legal, or financial advice.
`.trim();

// POST /reply
// Accepts: multipart/form-data with field "audio" (webm/ogg/mp3/m4a/wav).
// Returns: audio/mpeg (MP3) of the model's spoken reply.
app.post("/reply", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio uploaded (field name must be 'audio')." });
    }

    // 1) Transcribe with Whisper
    const fd = new FormData();
    fd.append("file", req.file.buffer, {
      filename: req.file.originalname || "speech.webm",
      contentType: req.file.mimetype || "audio/webm"
    });
    fd.append("model", "whisper-1");
    fd.append("response_format", "json");

    const sttResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Project": OPENAI_PROJECT,
        // DO NOT set Content-Type when using FormData; node-fetch sets boundary for us
      },
      body: fd
    });

    if (!sttResp.ok) {
      const txt = await sttResp.text();
      console.error("STT error:", txt);
      return res.status(500).json({ error: "Transcription failed", detail: txt.slice(0, 500) });
    }

    const sttJson = await sttResp.json();
    const userText = (sttJson.text || "").trim();
    if (!userText) {
      // Return a gentle audio prompt asking the user to speak again
      const speech = await tts("I didn't catch that. Could you say it again, friend?");
      res.setHeader("Content-Type", "audio/mpeg");
      return res.send(speech);
    }

    // 2) Get assistant reply (text) with gpt-4o-mini
    const chatResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Project": OPENAI_PROJECT,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText }
        ],
        // Keep outputs brief
        max_output_tokens: 120,
        temperature: 0.7
      })
    });

    if (!chatResp.ok) {
      const txt = await chatResp.text();
      console.error("Chat error:", txt);
      const speech = await tts("I'm here with you, but I ran into a problem answering. Let's try again.");
      res.setHeader("Content-Type", "audio/mpeg");
      return res.send(speech);
    }

    const chatJson = await chatResp.json();
    const assistantText =
      chatJson?.output?.[0]?.content?.[0]?.text ??
      chatJson?.choices?.[0]?.message?.content ??
      "Peace be with you.";

    // 3) TTS with gpt-4o-mini-tts
    const mp3 = await tts(assistantText);
    res.setHeader("Content-Type", "audio/mpeg");
    return res.send(mp3);

  } catch (err) {
    console.error("Server /reply error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Helper: TTS -> MP3 Buffer
async function tts(text) {
  const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "OpenAI-Project": OPENAI_PROJECT,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "verse",
      input: text
    })
  });

  if (!ttsResp.ok) {
    const txt = await ttsResp.text();
    console.error("TTS error:", txt);
    // Return a small silent MP3 if TTS fails
    return Buffer.from([]);
  }
  const arrayBuffer = await ttsResp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Fallback voice server running on http://localhost:${port}`));
