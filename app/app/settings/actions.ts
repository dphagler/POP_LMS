"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateSession } from "@/lib/auth";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export type UpdateProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  name?: string | null;
  image?: string | null;
};

const displayNameSchema = z
  .string()
  .trim()
  .min(2, { message: "Display name must be at least 2 characters." })
  .max(80, { message: "Display name must be 80 characters or fewer." });

const MAX_AVATAR_SIZE = 1024 * 1024 * 4; // 4 MB

export async function updateProfileAction(
  _prevState: UpdateProfileFormState,
  formData: FormData
): Promise<UpdateProfileFormState> {
  const session = await requireUser();

  const rawName = formData.get("displayName");
  if (typeof rawName !== "string") {
    return {
      status: "error",
      message: "Enter your display name before saving."
    } satisfies UpdateProfileFormState;
  }

  const parsedName = displayNameSchema.safeParse(rawName);
  if (!parsedName.success) {
    const issue = parsedName.error.issues.at(0);
    return {
      status: "error",
      message: issue?.message ?? "Enter a valid display name."
    } satisfies UpdateProfileFormState;
  }

  const normalizedName = parsedName.data;

  let removeAvatar = formData.get("removeAvatar") === "true";
  const avatarFile = formData.get("avatar");
  let nextImage: string | null | undefined;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    removeAvatar = false;
    if (!avatarFile.type.startsWith("image/")) {
      return {
        status: "error",
        message: "Upload a valid image file for your avatar."
      } satisfies UpdateProfileFormState;
    }

    if (avatarFile.size > MAX_AVATAR_SIZE) {
      return {
        status: "error",
        message: "Choose an image smaller than 4 MB."
      } satisfies UpdateProfileFormState;
    }

    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = avatarFile.type || "image/png";
    nextImage = `data:${mimeType};base64,${base64}`;
  } else if (removeAvatar) {
    nextImage = null;
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true }
    });

    if (!existingUser) {
      return {
        status: "error",
        message: "We could not find your account."
      } satisfies UpdateProfileFormState;
    }

    const updates: { name: string; image?: string | null } = {
      name: normalizedName,
    };

    if (typeof nextImage !== "undefined") {
      updates.image = nextImage;
    }

    const noChanges =
      existingUser.name === normalizedName &&
      typeof nextImage === "undefined";

    if (noChanges) {
      return {
        status: "success",
        message: "There were no changes to save.",
        name: existingUser.name ?? null,
        image: existingUser.image ?? null
      } satisfies UpdateProfileFormState;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
      select: { name: true, image: true }
    });

    await updateSession({
      user: {
        name: updatedUser.name ?? undefined,
        image: updatedUser.image ?? null,
      },
    });

    revalidatePath("/app");
    revalidatePath("/app/settings");
    revalidatePath("/app/profile");

    return {
      status: "success",
      message: "Your profile has been updated.",
      name: updatedUser.name ?? null,
      image: updatedUser.image ?? null
    } satisfies UpdateProfileFormState;
  } catch (error) {
    return {
      status: "error",
      message: "We couldn’t update your profile. Please try again."
    } satisfies UpdateProfileFormState;
  }
}
