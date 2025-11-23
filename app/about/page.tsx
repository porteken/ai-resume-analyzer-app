export default function About() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-2xl space-y-6 bg-white p-8 rounded-xl shadow-sm border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            About AI Resume Analyzer
          </h1>
        </div>

        <div className="prose prose-sm max-w-none text-center">
          <p className="text-slate-700">
            AI Resume Analyzer is a web application that helps job seekers
            evaluate how well their resume matches a specific job description.
            Using Google&apos;s Gemini 2.5 Flash AI model, the app analyzes
            uploaded PDF resumes and provides detailed feedback including match
            scores, strengths, gaps, and personalized recommendations.
          </p>

          <p className="text-slate-700">
            Simply upload your resume as a PDF and paste the job description
            you&apos;re interested in. The AI will process the information and
            give you actionable insights to improve your chances of landing the
            job.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Project Links</h2>
            <div className="space-y-2">
              <a
                className="text-blue-600 hover:text-blue-800 underline"
                href="https://github.com/porteken/ai-resume-analyzer-app"
                rel="noopener noreferrer"
                target="_blank"
              >
                Frontend App on GitHub
              </a>
              <br />
              <a
                className="text-blue-600 hover:text-blue-800 underline"
                href="https://github.com/porteken/ai-resume-analyzer-sam"
                rel="noopener noreferrer"
                target="_blank"
              >
                Backend API on GitHub
              </a>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Contact</h2>
            <a
              className="text-blue-600 hover:text-blue-800 underline"
              href="mailto:porteken@gmail.com"
            >
              porteken@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
