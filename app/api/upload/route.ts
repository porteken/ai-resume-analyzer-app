import { NextRequest, NextResponse } from "next/server";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || process.env.API_ENDPOINT;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY;





export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    
    if (!API_ENDPOINT || !API_KEY) {
      console.error("Missing environment variables:", {
        hasEndpoint: !!API_ENDPOINT,
        hasKey: !!API_KEY,
      });
      return NextResponse.json(
        { error: "Server configuration error: Missing API_ENDPOINT or API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();

    
    console.log("Making request to:", API_ENDPOINT);
    console.log("Request payload keys:", Object.keys(body));
    console.log("PDF size (base64):", body.pdf_base64?.length || 0, "chars");

    const startTime = Date.now();
    const response = await fetch(API_ENDPOINT, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      method: "POST",
    });
    const duration = Date.now() - startTime;

    console.log("Response received in:", duration, "ms");
    console.log("Response status:", response.status);

    
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response:", {
        contentType,
        preview: text.slice(0, 200),
        status: response.status,
      });
      return NextResponse.json(
        {
          details: text.slice(0, 200),
          error: `External API returned non-JSON response (${response.status}). Check API_ENDPOINT in .env.local`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log("Response data keys:", Object.keys(data));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      {
        details: error instanceof Error ? error.message : "Unknown error",
        error: "Failed to upload resume",
      },
      { status: 500 }
    );
  }
}
