import { NextResponse } from "next/server";
import { z } from "zod";
import { getBusinessById } from "@/lib/config/businesses";

const requestSchema = z.object({
  businessId: z.string().min(1),
});

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { businessId } = requestSchema.parse(body);

    const business = getBusinessById(businessId);
    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const response = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("xAI API error:", response.status, errorText);
      return NextResponse.json(
        { error: `xAI API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // xAI returns { value: "token", expires_at: timestamp }
    const token = data.value || data.client_secret?.value;
    
    if (!token) {
      console.error("No token in response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "No token received from xAI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token,
      expiresAt: data.expires_at || data.client_secret?.expires_at,
      business: {
        id: business.id,
        name: business.name,
        voice: business.voice,
        systemPrompt: business.systemPrompt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}