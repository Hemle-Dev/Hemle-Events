import assert from "node:assert/strict";
import test from "node:test";

import { identifierToEmail, isValidIdentifier, normalizeIdentifier } from "../src/lib/account.ts";

test("normalise un identifiant humain", () => {
  assert.equal(normalizeIdentifier("  Jean Équipe  "), "jean-equipe");
  assert.equal(normalizeIdentifier("Admin_Principal.01"), "admin_principal.01");
});

test("construit une adresse Auth interne non distribuable", () => {
  assert.equal(identifierToEmail("Administrateur"), "administrateur@accounts.hemle.invalid");
});

test("refuse les identifiants trop courts ou non normalisés", () => {
  assert.equal(isValidIdentifier("ab"), false);
  assert.equal(isValidIdentifier("Admin"), false);
  assert.equal(isValidIdentifier("admin"), true);
});
