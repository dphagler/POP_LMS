"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateSession } from "@/lib/auth";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

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
    revalidatePath("/settings");

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

export type ChangePasswordFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Enter your current password." })
    .max(128, { message: "Passwords must be 128 characters or fewer." }),
  newPassword: z
    .string()
    .min(8, { message: "New password must be at least 8 characters." })
    .max(128, { message: "Passwords must be 128 characters or fewer." }),
  confirmPassword: z
    .string()
    .min(1, { message: "Confirm your new password." })
    .max(128, { message: "Passwords must be 128 characters or fewer." })
});

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData
): Promise<ChangePasswordFormState> {
  const session = await requireUser();

  const fields = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!fields.success) {
    const issue = fields.error.issues.at(0);
    return {
      status: "error",
      message: issue?.message ?? "Check the password fields and try again."
    } satisfies ChangePasswordFormState;
  }

  const { currentPassword, newPassword, confirmPassword } = fields.data;

  if (newPassword !== confirmPassword) {
    return {
      status: "error",
      message: "New password and confirmation do not match."
    } satisfies ChangePasswordFormState;
  }

  if (currentPassword === newPassword) {
    return {
      status: "error",
      message: "Choose a new password that’s different from your current one."
    } satisfies ChangePasswordFormState;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true }
    });

    if (!user?.passwordHash) {
      return {
        status: "error",
        message: "Your organization uses single sign-on—no password needed."
      } satisfies ChangePasswordFormState;
    }

    const currentMatches = verifyPassword(currentPassword, user.passwordHash);
    if (!currentMatches) {
      return {
        status: "error",
        message: "Your current password is incorrect."
      } satisfies ChangePasswordFormState;
    }

    const nextHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: nextHash }
    });

    await updateSession({
      user: {
        id: session.user.id
      }
    });

    revalidatePath("/settings");

    return {
      status: "success",
      message: "Your password has been updated."
    } satisfies ChangePasswordFormState;
  } catch (error) {
    return {
      status: "error",
      message: "We couldn’t update your password. Please try again."
    } satisfies ChangePasswordFormState;
  }
}
