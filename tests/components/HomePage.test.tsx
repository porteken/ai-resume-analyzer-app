import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Home from '@/app/page';
import { createMockFile } from '@/tests/mocks/file';

describe('Home Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it('should render the main heading', () => {
    render(<Home />);
    expect(screen.getByText('AI Resume Analyzer')).toBeInTheDocument();
  });

  it('should render file input and job description textarea', () => {
    render(<Home />);
    expect(screen.getByLabelText(/resume \(pdf\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
  });

  it('should have analyze button disabled initially', async () => {
    render(<Home />);
    const button = screen.getByRole('button', { name: /analyze resume/i });
    await expect(button).toBeDisabled();
  });

  it('should enable button when file and job description are provided', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer position');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await expect(button).toBeEnabled();
  });

  it('should show error when file is too large', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const largeContent = 'x'.repeat(6 * 1024 * 1024);
    const largeFile = createMockFile(largeContent, 'large.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, largeFile);
    await user.type(textarea, 'Software Engineer');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('should show error when job description is missing', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);

    await user.upload(fileInput, file);

    const button = screen.getByRole('button', { name: /analyze resume/i });

    
    await expect(button).toBeDisabled();
  });

  it('should handle successful upload with immediate result', async () => {
    const user = userEvent.setup();
    const mockAnalysisResult = '## Match Score\n85% match\n\n## Strengths\n- Strong background';

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ analysis_result: mockAnalysisResult }),
      ok: true,
    });

    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer position');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/match score/i)).toBeInTheDocument();
  });

  it('should handle async job with polling', async () => {
    const user = userEvent.setup();
    const mockJobId = 'test-job-123';
    const mockAnalysisResult = '## Match Score\n90% match';

    let pollCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/upload')) {
        return Promise.resolve({
          json: async () => ({ job_id: mockJobId }),
          ok: true,
        });
      }
      if (url.includes('/api/status')) {
        pollCount++;
        if (pollCount >= 2) {
          return Promise.resolve({
            json: async () => ({ analysis_result: mockAnalysisResult, status: 'completed' }),
            ok: true,
          });
        }
        return Promise.resolve({
          json: async () => ({ status: 'processing' }),
          ok: true,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/analyzing.../i)).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    }, { timeout: 10_000 });
  });

  it('should handle upload errors', async () => {
    const user = userEvent.setup();

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ details: 'Internal server error', error: 'Server error' }),
      ok: false,
      status: 500,
    });

    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should disable inputs during loading', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          json: async () => ({ analysis_result: 'Test result' }),
          ok: true
        }), 5000)
      )
    );

    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(async () => {
      await expect(fileInput).toBeDisabled();
      await expect(textarea).toBeDisabled();
      await expect(button).toBeDisabled();
    });
  });

  it('should display markdown sections correctly', async () => {
    const user = userEvent.setup();
    const mockAnalysisResult = `## Match Score
85% match to job requirements

## Strengths
- Strong technical skills
- Good experience

## Gaps
- Missing cloud experience

## Recommendations
- Add AWS certifications`;

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ analysis_result: mockAnalysisResult }),
      ok: true,
    });

    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/match score/i)).toBeInTheDocument();
      expect(screen.getByText(/strengths/i)).toBeInTheDocument();
      expect(screen.getByText(/gaps/i)).toBeInTheDocument();
      expect(screen.getByText(/recommendations/i)).toBeInTheDocument();
    });
  });

  it('should handle failed job status', async () => {
    const user = userEvent.setup();
    const mockJobId = 'test-job-failed';

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/upload')) {
        return Promise.resolve({
          json: async () => ({ job_id: mockJobId }),
          ok: true,
        });
      }
      if (url.includes('/api/status')) {
        return Promise.resolve({
          json: async () => ({ error: 'PDF parsing failed', status: 'failed' }),
          ok: true,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<Home />);

    const file = createMockFile('test content', 'resume.pdf');
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, 'Software Engineer');

    const button = screen.getByRole('button', { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/pdf parsing failed/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
