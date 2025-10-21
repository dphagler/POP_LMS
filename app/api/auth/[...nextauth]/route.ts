// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

// NextAuth v5: export the generated handlers as GET/POST
export const { GET, POST } = handlers;
