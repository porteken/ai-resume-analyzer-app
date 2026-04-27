export type AnalysisResultData = string | StructuredAnalysisResult;

type StructuredAnalysisContactInfo = {
  email?: string;
  linkedin?: string;
  location?: string;
  phone?: string;
};

type StructuredAnalysisExperience = {
  company?: string;
  duration?: string;
  highlights?: string[];
  role?: string;
};

type StructuredAnalysisResult = {
  contact_info?: StructuredAnalysisContactInfo;
  experience?: StructuredAnalysisExperience[];
  gaps?: string[];
  name?: string;
  recommendations?: string[];
  skills?: string[];
  strengths?: string[];
  summary?: string;
};
