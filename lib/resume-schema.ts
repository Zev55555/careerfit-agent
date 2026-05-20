export type RoleDirection =
  | "ai_product_manager"
  | "ai_agent_application"
  | "llm_application"
  | "auto_detect_role"
  | "custom_role";

export type ResumeBullet = {
  id: string;
  text: string;
  tags: string[];
  riskLevel?: "low" | "medium" | "high";
};

export type ResumeProjectLinks = {
  website?: string;
  github?: string;
};

export type ResumeProject = {
  id: string;
  name: string;
  role?: string;
  tags?: string[];
  timeframe?: string;
  time?: string;
  link?: string;
  links?: ResumeProjectLinks;
  context: string;
  bullets: ResumeBullet[];
  emphasis: RoleDirection[];
};

export type ResumeData = {
  meta: {
    version: string;
    templateLocked: boolean;
    lastUpdated: string;
    source?: "sample" | "pdf-upload" | "tailored";
  };
  profile: {
    name: string;
    headline?: string;
    title?: string;
    targetTitle?: string;
    location?: string;
    email: string;
    phone: string;
    links: string[];
  };
  summary?: string;
  skills: {
    label: string;
    items: string[];
  }[];
  projects: ResumeProject[];
  education: {
    school: string;
    schoolBadge?: string;
    degree?: string;
    major?: string;
    timeframe: string;
    gpa?: string;
    courses?: string[];
    details: string[];
  }[];
  notes?: string[];
  rawText?: string;
};

export type ChangeLog = {
  strengthenedProjects: string[];
  reducedContent: string[];
  rationale: string[];
  riskFlags: string[];
};

export type TailorProjectChange = {
  projectName: string;
  reason: string;
  changes: string[];
};

export type TailorChangeLog = {
  strengthenedProjects: TailorProjectChange[];
  weakenedProjects: TailorProjectChange[];
  skillChanges: string[];
  summaryChanges: string[];
  riskWarnings: string[];
  truthCheck: {
    passed: boolean;
    warnings: string[];
  };
};
