import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { TelegramClient } from "./telegram-client";

export const metadata = constructMetadata({
  title: "Telegram - Ingat Panel",
  noIndex: true,
});

export default function TelegramPage() {
  return (
    <Suspense>
      <TelegramClient />
    </Suspense>
  );
}
