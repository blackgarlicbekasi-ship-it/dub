import { DUB_WORKSPACE_ID, SHORT_DOMAIN } from "./main";

export const DUB_DOMAINS: {
  id: string;
  slug: string;
  verified: boolean;
  primary: boolean;
  archived: boolean;
  placeholder: string;
  allowedHostnames: string[];
  description: string;
  projectId: string;
}[] = [
  {
    id: "dom_001",
    slug: SHORT_DOMAIN,
    verified: true,
    primary: true,
    archived: false,
    placeholder: "https://ingat.cc/help/article/what-is-ingat",
    allowedHostnames: [],
    description: "The default domain for all new accounts.",
    projectId: DUB_WORKSPACE_ID,
  },
];

export const DUB_DOMAINS_ARRAY = DUB_DOMAINS.map((domain) => domain.slug);

export const DUB_DEMO_LINKS: Array<{
  id: string;
  domain: string;
  key: string;
  dashboardId: string;
}> = [];
