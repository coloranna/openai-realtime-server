// server.js - OpenAI Realtime token server for project keys
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors()); // in production, restrict to your Netlify domain

// Health check
app.get("/", (req, res) => {
  res.type("text").send("OpenAI Realtime token server. Use /session");
});

// Endpoint to mint a client session
app.get("/session", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,  // sk-proj key
        "OpenAI-Project": process.env.OPENAI_PROJECT_ID,          // proj_xxx ID
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "verse",
        instructions:
          "You are Jesus portrayed respectfully and compassionately. Offer brief, gentle, scripture-informed guidance suitable for VR."
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: data });
    }

    res.json(data); // includes client_secret
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Port setup
const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Token server running on http://localhost:${port}`));
