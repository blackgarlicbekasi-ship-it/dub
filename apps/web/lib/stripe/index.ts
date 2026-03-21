import Stripe from "stripe";
import { StripeMode } from "../types";

const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
export const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-05-28.basil",
  appInfo: {
    name: "Dub.co",
    version: "0.1.0",
  },
});

const secretMap: Record<StripeMode, string | undefined> = {
  live: process.env.STRIPE_APP_SECRET_KEY,
  test: process.env.STRIPE_APP_SECRET_KEY_TEST,
  sandbox: process.env.STRIPE_APP_SECRET_KEY_SANDBOX,
};

// Stripe Integration App client
export const stripeAppClient = ({ mode }: { mode?: StripeMode }) => {
  const appSecretKey = secretMap[mode ?? "test"];

  const safeKey = appSecretKey || "sk_test_placeholder";
  return new Stripe(safeKey, {
    apiVersion: "2025-05-28.basil",
    appInfo: {
      name: "Dub.co",
      version: "0.1.0",
    },
  });
};
