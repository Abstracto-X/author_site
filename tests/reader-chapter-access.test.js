const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/subscription/utils.js"), "utf8");
const accessCode = source.slice(source.indexOf("function chapterResolved("), source.indexOf("/* ============ icons ============ */"));
const authSource = fs.readFileSync(path.join(__dirname, "../js/subscription/auth.js"), "utf8");
const entitlementCode = authSource.slice(authSource.indexOf("function activeEntitlements("), authSource.indexOf("function entitlementLevel("));

function resolved(ch, persona) {
  const context = { persona: () => persona, store: { grantedKey:false }, PERSONA_ACCESS:{}, D:{ KEY_REASONS:{} } };
  vm.createContext(context);
  vm.runInContext(`${accessCode}\nresult = chapterResolved(chapter);`, Object.assign(context, { chapter:ch }));
  return context.result;
}

test("a lower-tier member cannot see a higher-tier backend chapter as unlocked", () => {
  const result = resolved({ backend:true, can_read_backend:false, access_state_backend:"locked_tier", state:"locked", tier:"Resident Nemesis" }, { signedIn:true, level:10, tierRank:10 });
  assert.equal(result.state, "locked");
});

test("backend catalog grants, free access, and previews remain accurate", () => {
  assert.equal(resolved({ backend:true, can_read_backend:true, access_state_backend:"unlocked", state:"unlocked" }, { level:30 }).state, "unlocked");
  assert.equal(resolved({ backend:true, can_read_backend:true, access_state_backend:"free", state:"free" }, { level:0 }).state, "free");
  assert.equal(resolved({ backend:true, can_read_backend:false, access_state_backend:"early_access", state:"preview" }, { level:10 }).state, "preview");
});

test("expired status-active entitlement is not treated as current access", () => {
  const context = { authState:{ entitlements:[
    { status:"active", is_active:false, valid_until:"2026-10-12T04:57:29Z" },
    { status:"active", valid_until:"2020-01-01T00:00:00Z" },
    { status:"active", is_active:true, valid_until:"2999-01-01T00:00:00Z" }
  ] } };
  vm.createContext(context);
  vm.runInContext(`${entitlementCode}\nresult = activeEntitlements();`, context);
  assert.equal(context.result.length, 1);
});
