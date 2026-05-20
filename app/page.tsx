import projects from "@/data/projects.json";
import { ResumeWorkspace } from "@/components/ResumeWorkspace";

export default function Home() {
  return <ResumeWorkspace projectCount={projects.projects.length} />;
}
