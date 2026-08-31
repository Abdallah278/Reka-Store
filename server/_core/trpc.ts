import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { checkCsrf, evaluateOwner, isAdminHostRequest } from "./authz";
import type { TrpcContext } from "./context";
import { ownerMutationLimiter } from "./security";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Never leak stack traces, SQL or file paths to clients.
    const safeCodes = new Set(["UNAUTHORIZED", "FORBIDDEN", "BAD_REQUEST", "NOT_FOUND", "TOO_MANY_REQUESTS", "PAYLOAD_TOO_LARGE"]);
    const message = safeCodes.has(error.code) ? error.message : "Request failed";
    return { ...shape, message, data: { code: shape.data.code, httpStatus: shape.data.httpStatus } };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Owner-only procedure. This is the real security boundary for the private
 * console. It is evaluated on every call from server-side facts only:
 * verified session -> DB user -> allowlist -> role, then CSRF for mutations.
 */
const requireOwner = t.middleware(async ({ ctx, next, type }) => {
  const decision = evaluateOwner(ctx.user);
  if (!decision.ok) {
    throw new TRPCError({
      code: decision.code,
      message: decision.code === "UNAUTHORIZED" ? UNAUTHED_ERR_MSG : NOT_ADMIN_ERR_MSG,
    });
  }
  // Defence in depth: when a dedicated admin hostname is configured, private
  // procedures are only served on that hostname.
  if (!isAdminHostRequest(ctx.req)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  if (type === "mutation") {
    const csrf = checkCsrf(ctx.req);
    if (!csrf.ok) throw new TRPCError({ code: "FORBIDDEN", message: "Request blocked (CSRF)" });
    if (!(await ownerMutationLimiter.allow(ctx.req))) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many changes in a short time. Please wait a moment." });
    }
  }
  return next({ ctx: { ...ctx, user: ctx.user! } });
});

export const ownerProcedure = t.procedure.use(requireOwner);
/** @deprecated use ownerProcedure — kept so legacy system routes keep compiling. */
export const adminProcedure = ownerProcedure;
