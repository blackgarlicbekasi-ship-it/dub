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
}[] = [];

export const DUB_DOMAINS_ARRAY = DUB_DOMAINS.map((domain) => domain.slug);

export const DUB_DEMO_LINKS: Array<{
  id: string;
  domain: string;
  key: string;
  dashboardId: string;
}> = [];
