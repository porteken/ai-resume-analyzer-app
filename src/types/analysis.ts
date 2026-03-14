export type AnalysisResultData = string | StructuredAnalysisResult;

interface StructuredAnalysisContactInfo {
  email?: string;
  linkedin?: string;
  location?: string;
  phone?: string;
}

interface StructuredAnalysisExperience {
  company?: string;
  duration?: string;
  highlights?: string[];
  role?: string;
}

interface StructuredAnalysisResult {
  contact_info?: StructuredAnalysisContactInfo;
  experience?: StructuredAnalysisExperience[];
  gaps?: string[];
  name?: string;
  recommendations?: string[];
  skills?: string[];
  strengths?: string[];
  summary?: string;
}
