/**
 * Agent path and nav matching (Node built-in test runner).
 * Run: npm run test:csp
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  agentCanAccessPath,
  navPathMatches,
} = require("./dashboard-paths.js");

test("agents may access exact /support, /support/reviews, and /login only", () => {
  assert.equal(agentCanAccessPath("/support"), true);
  assert.equal(agentCanAccessPath("/support/reviews"), true);
  assert.equal(agentCanAccessPath("/login"), true);
  assert.equal(agentCanAccessPath("/support/operations"), false);
  assert.equal(agentCanAccessPath("/support/analytics"), false);
  assert.equal(agentCanAccessPath("/listings"), false);
  assert.equal(agentCanAccessPath("/admin-users"), false);
  assert.equal(agentCanAccessPath("/"), false);
});

test("/support does not stay active on operations, analytics, or reviews", () => {
  assert.equal(navPathMatches("/support", "/support"), true);
  assert.equal(navPathMatches("/support", "/support/operations"), false);
  assert.equal(navPathMatches("/support", "/support/analytics"), false);
  assert.equal(navPathMatches("/support", "/support/reviews"), false);
  assert.equal(navPathMatches("/support/reviews", "/support/reviews"), true);
  assert.equal(navPathMatches("/support/operations", "/support/operations"), true);
  assert.equal(navPathMatches("/", "/"), true);
  assert.equal(navPathMatches("/", "/support"), false);
});
