/** Type declarations for lib/dashboard-paths.js. */
export const AGENT_PATHS: readonly string[];
export function agentCanAccessPath(pathname: string): boolean;
export function navPathMatches(href: string, pathname: string): boolean;
