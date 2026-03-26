/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bills from "../bills.js";
import type * as claims from "../claims.js";
import type * as clinics from "../clinics.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as inngestClient from "../inngestClient.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_claimsData from "../lib/claimsData.js";
import type * as lib_claimsPdf from "../lib/claimsPdf.js";
import type * as lib_claimsScoring from "../lib/claimsScoring.js";
import type * as lib_claimsTypes from "../lib/claimsTypes.js";
import type * as notifications from "../notifications.js";
import type * as ocr from "../ocr.js";
import type * as patients from "../patients.js";
import type * as payments from "../payments.js";
import type * as serviceCatalog from "../serviceCatalog.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bills: typeof bills;
  claims: typeof claims;
  clinics: typeof clinics;
  dashboard: typeof dashboard;
  http: typeof http;
  inngestClient: typeof inngestClient;
  "lib/auth": typeof lib_auth;
  "lib/claimsData": typeof lib_claimsData;
  "lib/claimsPdf": typeof lib_claimsPdf;
  "lib/claimsScoring": typeof lib_claimsScoring;
  "lib/claimsTypes": typeof lib_claimsTypes;
  notifications: typeof notifications;
  ocr: typeof ocr;
  patients: typeof patients;
  payments: typeof payments;
  serviceCatalog: typeof serviceCatalog;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
