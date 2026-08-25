import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" });
  }

  // Test 1: Try to create ephemeral token
  try {
    const tokenResponse = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 60 },
      }),
    });

    const tokenData = await tokenResponse.text();
    
    // Test 2: Try simple chat completion to verify key works
    const chatResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-2",
        messages: [{ role: "user", content: "Say hi" }],
        max_tokens: 10,
      }),
    });

    const chatData = await chatResponse.text();

    return NextResponse.json({
      apiKeyPrefix: apiKey.substring(0, 10) + "...",
      ephemeralToken: {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: tokenData,
      },
      chatTest: {
        status: chatResponse.status,
        statusText: chatResponse.statusText,
        body: chatData.substring(0, 500),
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}