// server.js — OpenAI Realtime token server (for project keys)
// Node 18+ | ESM style (use "type":"module" in package.json)

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// In production, replace "*" with your Netlify site origin.
app.use(cors({ origin: "*" }));

// Health check
app.get("/", (_req, res) => {
  res.type("text").send("OpenAI Realtime token server. Use /session");
});

// Mint a short-lived Realtime session for the browser client
app.get("/session", async (_req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,   // sk-proj-...
        "OpenAI-Project": process.env.OPENAI_PROJECT_ID,           // proj_...
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime",
        voice: "verse",
        // Keep responses short for VR; adjust to your preference.
        instructions:
          "You are Jesus portrayed respectfully and compassionately. Offer brief, gentle, scripture-informed guidance suitable for VR.",
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("OpenAI session error:", data);
      return res.status(500).json({ error: data });
    }
    return res.json(data); // includes client_secret.value
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Failed to create session" });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () =>
  console.log(`Token server running on http://localhost:${port}`)
);
