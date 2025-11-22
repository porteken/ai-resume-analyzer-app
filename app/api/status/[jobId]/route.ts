import { NextRequest, NextResponse } from "next/server";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || process.env.API_ENDPOINT;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    const { jobId } = await params;

    
    const baseUrl = API_ENDPOINT.replace('/upload', '');
    const statusUrl = `${baseUrl}/status/${jobId}`;

    console.log("Making request to:", statusUrl);

    const response = await fetch(statusUrl, {
      headers: {
        "x-api-key": API_KEY,
      },
      method: "GET",
    });

    
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
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json(
      {
        details: error instanceof Error ? error.message : "Unknown error",
        error: "Failed to check status",
      },
      { status: 500 }
    );
  }
}
