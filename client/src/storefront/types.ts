import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type Outputs = inferRouterOutputs<AppRouter>;

export type PublicProduct = Outputs["storefront"]["products"][number];
export type PublicSettings = Outputs["storefront"]["settings"];
export type PublicCategory = Outputs["storefront"]["categories"][number];
