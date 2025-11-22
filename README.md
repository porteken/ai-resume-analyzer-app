# AI Resume Analyzer

A modern web application that intelligently analyzes resumes against job descriptions using Google's Gemini 2.5 Flash AI model. Upload a resume PDF, paste a job description, and receive detailed insights on candidate fit, strengths, gaps, and actionable recommendations.

## Features

- AI-Powered Analysis - Powered by Google Gemini 2.5 Flash for accurate resume evaluation
- Comprehensive Insights - Get match scores, key strengths, skill gaps, and tailored recommendations
- Beautiful UI - Clean, responsive interface built with Next.js 16, React 19, and Tailwind CSS
- Real-time Processing - Asynchronous job processing with polling for status updates
- PDF Support - Direct PDF upload and parsing (max 5MB)
- Structured Results - Organized analysis with sections, bullet points, and visual indicators

## Tech Stack

Frontend:
- [Next.js 16](https://nextjs.org/) - React framework with App Router
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Lucide React](https://lucide.dev/) - Icon library

Backend:
- Next.js API Routes - Serverless backend
- External AI API integration (Gemini 2.5 Flash)
- Async job processing with polling


## Usage

1. Upload Resume - Click "Choose File" and select a PDF resume (max 5MB)
2. Add Job Description - Paste the job description in the text area
3. Analyze - Click "Analyze Resume" to start the analysis
4. Review Results - View the structured analysis with:
   - Match Score (percentage fit)
   - Key Strengths (candidate advantages)
   - Gaps & Areas for Development (missing qualifications)
   - Recommendations (actionable next steps)


