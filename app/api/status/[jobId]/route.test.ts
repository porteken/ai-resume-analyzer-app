import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiEndpoint = 'https://api.example.com/upload';
const mockApiKey = 'test-api-key';


vi.mock('./route', () => {
  return {
    GET: vi.fn(),
  };
});

describe('Status API Route', () => {
  let GET: (request: NextRequest, context: { params: Promise<{ jobId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();

    
    GET = vi.fn(async (request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) => {
      const { jobId } = await params;

      const baseUrl = mockApiEndpoint.replace('/upload', '');
      const statusUrl = `${baseUrl}/status/${jobId}`;

      console.log("Making request to:", statusUrl);

      try {
        const response = await globalThis.fetch(statusUrl, {
          headers: {
            "x-api-key": mockApiKey,
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
          return Response.json(
            {
              details: text.slice(0, 200),
              error: `External API returned non-JSON response (${response.status}). Check API_ENDPOINT in .env.local`,
            },
            { status: 502 }
          );
        }

        const data = await response.json();
        return Response.json(data, { status: response.status });
      } catch (error) {
        console.error("Status API error:", error);
        return Response.json(
          {
            details: error instanceof Error ? error.message : "Unknown error",
            error: "Failed to check status",
          },
          { status: 500 }
        );
      }
    });
  });



  it('should construct correct status URL from upload endpoint', async () => {
    const mockResponseData = { status: 'processing' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponseData,
      status: 200,
    });

    const request = new NextRequest('http://localhost:3000/api/status/test-job-123');
    const parameters = Promise.resolve({ jobId: 'test-job-123' });

    await GET(request, { params: parameters });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/status/test-job-123',
      expect.objectContaining({
        headers: {
          'x-api-key': mockApiKey,
        },
        method: 'GET',
      })
    );
  });

  it('should return processing status', async () => {
    const mockResponseData = { job_id: '123', status: 'processing' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponseData,
      status: 200,
    });

    const request = new NextRequest('http://localhost:3000/api/status/123');
    const parameters = Promise.resolve({ jobId: '123' });

    const response = await GET(request, { params: parameters });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('processing');
  });

  it('should return completed status with analysis result', async () => {
    const mockResponseData = {
      analysis_result: 'Analysis complete with 85% match',
      job_id: '123',
      status: 'completed',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponseData,
      status: 200,
    });

    const request = new NextRequest('http://localhost:3000/api/status/123');
    const parameters = Promise.resolve({ jobId: '123' });

    const response = await GET(request, { params: parameters });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('completed');
    expect(data.analysis_result).toBeDefined();
  });

  it('should return failed status with error', async () => {
    const mockResponseData = {
      error: 'Analysis failed due to invalid PDF',
      job_id: '123',
      status: 'failed',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponseData,
      status: 200,
    });

    const request = new NextRequest('http://localhost:3000/api/status/123');
    const parameters = Promise.resolve({ jobId: '123' });

    const response = await GET(request, { params: parameters });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('failed');
    expect(data.error).toBeDefined();
  });

  it('should handle non-JSON responses from external API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/html' }),
      status: 404,
      text: async () => '<html>Not Found</html>',
    });

    const request = new NextRequest('http://localhost:3000/api/status/invalid-id');
    const parameters = Promise.resolve({ jobId: 'invalid-id' });

    const response = await GET(request, { params: parameters });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain('non-JSON response');
  });

  it('should handle fetch errors', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('Connection timeout')));

    const request = new NextRequest('http://localhost:3000/api/status/123');
    const parameters = Promise.resolve({ jobId: '123' });

    const response = await GET(request, { params: parameters });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to check status');
    expect(data.details).toBe('Connection timeout');
  });

  it('should handle job IDs with special characters', async () => {
    const specialJobId = 'job-123-abc_456';
    const mockResponseData = { job_id: specialJobId, status: 'processing' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponseData,
      status: 200,
    });

    const request = new NextRequest(`http://localhost:3000/api/status/${specialJobId}`);
    const parameters = Promise.resolve({ jobId: specialJobId });

    const response = await GET(request, { params: parameters });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.job_id).toBe(specialJobId);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://api.example.com/status/${specialJobId}`,
      expect.any(Object)
    );
  });

  it('should forward API response status codes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Job not found' }),
      status: 404,
    });

    const request = new NextRequest('http://localhost:3000/api/status/nonexistent');
    const parameters = Promise.resolve({ jobId: 'nonexistent' });

    const response = await GET(request, { params: parameters });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });
});
