import type { Adapter, AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { getOrCreateUserForEmail } from "./user-service";

type BuildAdapterOptions = {
  prismaClient?: PrismaClient;
  prismaAdapter?: (client: PrismaClient) => Adapter;
  getOrCreateUserForEmailFn?: typeof getOrCreateUserForEmail;
};

export function buildAuthAdapter({
  prismaClient = prisma,
  prismaAdapter = PrismaAdapter,
  getOrCreateUserForEmailFn = getOrCreateUserForEmail,
}: BuildAdapterOptions = {}): Adapter {
  const baseAdapter = prismaAdapter(prismaClient);

  return {
    ...baseAdapter,
    async createUser(data) {
      if (!data.email) {
        throw new Error("Email is required to create a user");
      }

      const user = await getOrCreateUserForEmailFn(
        data.email,
        {
          name: data.name ?? null,
          image: data.image ?? null,
        },
        prismaClient
      );

      return {
        ...user,
        emailVerified: data.emailVerified ?? null,
      } as AdapterUser & { orgId: string | null };
    },
  } satisfies Adapter;
}
