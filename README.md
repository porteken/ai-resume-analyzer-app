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

## Prerequisites

- Node.js 20+
- npm, yarn, pnpm, or bun
- Access to the AI Resume Analyzer API (API endpoint and key)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-resume-analyzer-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
touch .env.local
```

Add the following environment variables:

```env
# Required: AI API Configuration
API_ENDPOINT=https://your-api-gateway.amazonaws.com/prod/upload
API_KEY=your-api-key-here

# Optional: For client-side access (if needed)
# NEXT_PUBLIC_API_ENDPOINT=https://your-api-gateway.amazonaws.com/prod/upload
# NEXT_PUBLIC_API_KEY=your-api-key-here
```

Important Notes:
- The API endpoint should point to your `/upload` endpoint
- The status endpoint will be automatically derived (e.g., `/status/{jobId}`)
- Keep your API keys secure and never commit them to version control

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm start
```

## Usage

1. Upload Resume - Click "Choose File" and select a PDF resume (max 5MB)
2. Add Job Description - Paste the job description in the text area
3. Analyze - Click "Analyze Resume" to start the analysis
4. Review Results - View the structured analysis with:
   - Match Score (percentage fit)
   - Key Strengths (candidate advantages)
   - Gaps & Areas for Development (missing qualifications)
   - Recommendations (actionable next steps)

## Project Structure

```
ai-resume-analyzer-app/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts          # Upload endpoint (POST)
│   │   └── status/
│   │       └── [jobId]/
│   │           └── route.ts      # Status polling endpoint (GET)
│   ├── page.tsx                  # Main UI component
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
├── .env.local                    # Environment variables (create this)
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## API Routes

### POST /api/upload
Uploads resume and job description to the AI service.

Request:
```json
{
  "filename": "resume.pdf",
  "job_description": "Job description text...",
  "pdf_base64": "base64-encoded-pdf-content"
}
```

Response:
```json
{
  "job_id": "unique-job-identifier"
}
```

### GET /api/status/[jobId]
Polls for analysis results.

Response (Processing):
```json
{
  "status": "processing"
}
```

Response (Completed):
```json
{
  "status": "completed",
  "analysis_result": "## Match Score\n70% - Analysis text..."
}
```

Response (Failed):
```json
{
  "status": "failed",
  "error": "Error message"
}
```

## Key Features Explained

### Async Job Processing
The app uses asynchronous processing with polling:
- Upload returns a `job_id` immediately
- Frontend polls `/api/status/{jobId}` every 2 seconds
- Maximum 150 attempts (5 minutes timeout)
- Real-time progress updates displayed to user

### Response Formatting
Analysis results are parsed and formatted with:
- Section headers (## Match Score, ## Key Strengths, etc.)
- Emoji indicators (📊 📈 ⚠️ 💡)
- Bullet point lists
- Proper spacing and typography

### Error Handling
Comprehensive error handling for:
- Missing/invalid files
- File size limits (5MB)
- API failures
- Timeout scenarios
- Malformed responses

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Code Quality
The project uses:
- ESLint with multiple plugins (SonarJS, Unicorn, etc.)
- TypeScript for type safety
- Prettier for code formatting
- Cognitive complexity limits (max 15)

## Troubleshooting

### "Server configuration error: Missing API_ENDPOINT or API_KEY"
Ensure your `.env.local` file exists and contains valid `API_ENDPOINT` and `API_KEY` values.

### "File too large"
PDFs must be under 5MB. Consider compressing your PDF or reducing image quality.

### "Request timed out"
The analysis exceeded 5 minutes. Try with a smaller resume or check API availability.

### "External API returned non-JSON response"
Verify your `API_ENDPOINT` is correct and the external API is functioning properly.

## Deployment

### Deploy on Vercel

The easiest deployment option:

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `API_ENDPOINT`
   - `API_KEY`
4. Deploy

### Environment Variables for Production

Ensure these are set in your deployment platform:
```env
API_ENDPOINT=https://your-production-api.com/prod/upload
API_KEY=your-production-api-key
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and tests
5. Submit a pull request

## License

[Add your license here]

## Support

For issues or questions:
- Open an issue in the repository
- Contact the maintainers

---

Built with ❤️ using Next.js, React, and Gemini AI
