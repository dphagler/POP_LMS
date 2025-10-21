// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

export const runtime = "nodejs";

// NextAuth v5: export the generated handlers as GET/POST
export const { GET, POST } = handlers;
