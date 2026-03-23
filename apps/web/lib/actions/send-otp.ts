"use server";

import { actionClient } from "./safe-action";
import * as z from "zod/v4";

const schema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

export const sendOtpAction = actionClient
  .inputSchema(schema)
  .action(async () => {
    throw new Error("Registration is disabled. Contact your administrator.");
  });
