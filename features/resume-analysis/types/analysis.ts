export type AnalysisResultData = string | StructuredAnalysisResult;

export interface StructuredAnalysisContactInfo {
  email?: string;
  linkedin?: string;
  location?: string;
  phone?: string;
}

export interface StructuredAnalysisExperience {
  company?: string;
  duration?: string;
  highlights?: string[];
  role?: string;
}

export interface StructuredAnalysisResult {
  contact_info?: StructuredAnalysisContactInfo;
  experience?: StructuredAnalysisExperience[];
  gaps?: string[];
  name?: string;
  recommendations?: string[];
  skills?: string[];
  strengths?: string[];
  summary?: string;
}
