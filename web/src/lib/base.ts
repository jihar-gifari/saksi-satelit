/** The app is served under a base path (aldrangroup.com/saksi-satelit). Every raw URL goes through `asset()`. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;

/** The public short link said in every video, and the canonical site. */
export const SITE_ORIGIN = "https://aldrangroup.com";
export const SHORT_LINK = "aldrangroup.com/karhutla";
export const CASE_URL = `${SITE_ORIGIN}${BASE_PATH}/karhutla`;
