# AI Resume Analyzer

A web application hosted [here](https://ai-resume-analyzer-app-lake.vercel.app/) that analyzes resumes against job descriptions using Google's Gemini 3 Flash AI model and returns insights on candidate fit, strengths, gaps, and recommendations.

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn
- Lucide React

[Backend](https://github.com/porteken/ai-resume-analyzer-sam)

## Development

```bash
corepack enable
pnpm install
pnpm dev
```

## Usage

1. Upload Resume - Click "Choose File" and select a PDF resume (max 5MB)
2. Add Job Description - Paste the job description in the text area
3. Analyze - Click "Analyze Resume" to start the analysis
4. Review Results - View the structured analysis with:
   - Strengths
   - Gaps
   - Recommendations
