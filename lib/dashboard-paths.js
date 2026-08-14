/** Exact agent routes and nav matching for dashboard RBAC. */

const AGENT_PATHS = ["/support", "/login"];

function agentCanAccessPath(pathname) {
  return AGENT_PATHS.some((path) => pathname === path);
}

/** Exact match, except `/` only matches home. `/support` does not match `/support/operations`. */
function navPathMatches(href, pathname) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return href !== "/support";
}

module.exports = { AGENT_PATHS, agentCanAccessPath, navPathMatches };
