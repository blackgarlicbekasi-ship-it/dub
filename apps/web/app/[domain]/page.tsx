import { SHORT_DOMAIN } from "@dub/utils";
import { constructMetadata } from "@dub/utils";
import PlaceholderContent from "./placeholder";

export const revalidate = false;

export async function generateMetadata(props: {
  params: Promise<{ domain: string }>;
}) {
  const params = await props.params;
  const isMain = params.domain === SHORT_DOMAIN;

  const title = isMain
    ? "Ingat - Modern Link Management Platform"
    : `${params.domain.toUpperCase()} - Powered by Ingat`;

  const description = isMain
    ? "Ingat is a modern link management platform for creating, sharing, and tracking short links with powerful analytics."
    : `${params.domain.toUpperCase()} is a custom domain powered by Ingat - a modern link management platform.`;

  return constructMetadata({ title, description });
}

export default function CustomDomainPage() {
  return <PlaceholderContent />;
}
