# AI Resume Analyzer

A web application hosted [here](https://ai-resume-analyzer-app-lake.vercel.app/) that analyzes resumes against job descriptions using Google's Gemini 3.5 Flash AI model and returns insights on candidate fit, strengths, gaps, and recommendations.

## Tech Stack

Frontend:

- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide React](https://lucide.dev/)

Backend:

- [AWS SAM](https://aws.amazon.com/serverless/sam/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [Backend API on GitHub](https://github.com/porteken/ai-resume-analyzer-sam)

## Usage

1. Upload Resume - Click "Choose File" and select a PDF resume (max 5MB)
2. Add Job Description - Paste the job description in the text area
3. Analyze - Click "Analyze Resume" to start the analysis
4. Review Results - View the structured analysis with:
   - Match Score
   - Key Strengths
   - Gaps & Areas for Development
   - Recommendations
