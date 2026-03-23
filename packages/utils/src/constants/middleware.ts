export const DEFAULT_REDIRECTS: Record<string, string> = {
  home: "https://ingat.cc",
  signin: "https://app.ingat.cc/login",
  login: "https://app.ingat.cc/login",
  register: "https://app.ingat.cc/register",
  signup: "https://app.ingat.cc/register",
  app: "https://app.ingat.cc",
  dashboard: "https://app.ingat.cc",
  links: "https://app.ingat.cc/links",
  settings: "https://app.ingat.cc/settings",
  welcome: "https://app.ingat.cc/onboarding/welcome",
};

export const DUB_HEADERS = {
  "x-powered-by": "Ingat - The Modern Link Attribution Platform",
};

export const REDIRECTION_QUERY_PARAM = "redir_url";
