// server.js
// Minimal Express server to mint short-lived OpenAI Realtime sessions (WebRTC).
// Usage: set OPENAI_API_KEY in env, then `node server.js`
// Deploy to your favorite Node host (Render, Railway, Fly, Heroku, etc).

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// CORS: Restrict in production to your site domain
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  res.type("text").send("OpenAI Realtime token server is running. Use /session");
});

app.get("/session", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.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}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Model: use a current realtime-preview; adjust as OpenAI updates names
        model: "gpt-4o-realtime-preview",
        // Built-in TTS voice to use for replies (others: "alloy", "aria", "coral", "sage", "verse", etc.)
        voice: "verse",
        // System style/guardrails. Keep it short for snappy VR responses.
        instructions:
          "You are Jesus portrayed respectfully and compassionately. Offer brief, gentle, scripture-informed guidance. Use simple sentences suitable for VR. Never claim medical or legal authority.",
      }),
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("OpenAI session error:", json);
      return res.status(500).json({ error: json });
    }
    // Response includes client_secret for browser to start WebRTC.
    res.json(json);
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({ error: "Failed to create session" });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Token server on http://localhost:${port}`));
