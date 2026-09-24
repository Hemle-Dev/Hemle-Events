import assert from "node:assert/strict";
import test from "node:test";
import { eventToday, nextAnnualDate, canFeatureEvent } from "../src/lib/event-dates.ts";
import { eventSlugCandidate } from "../src/lib/event-slug.ts";
import {
  descriptionNodes,
  formatBulletSelection,
  formatSelection,
  plainDescription,
} from "../src/lib/description.ts";
import { socialMeta } from "../src/lib/social-meta.ts";

test("annual dates respect original first edition, leap years and the day of the event", () => {
  assert.equal(nextAnnualDate("2020-09-23", "2026-09-23"), "2026-09-23");
  assert.equal(nextAnnualDate("2020-09-22", "2026-09-23"), "2027-09-22");
  assert.equal(nextAnnualDate("2030-01-01", "2026-09-23"), "2030-01-01");
  assert.equal(nextAnnualDate("2024-02-29", "2026-09-23"), "2028-02-29");
  assert.equal(nextAnnualDate("2096-02-29", "2097-01-01"), "2104-02-29");
  assert.throws(() => nextAnnualDate("2026-02-30"));
  assert.equal(eventToday(new Date("2026-09-23T23:30:00Z")), "2026-09-24");
});

test("featured eligibility handles current, past, ongoing and recurring events", () => {
  const event = { date_debut: "2026-09-20", date_fin: null };
  assert.equal(canFeatureEvent(event, "2026-09-23"), false);
  assert.equal(canFeatureEvent({ ...event, date_fin: "2026-09-23" }, "2026-09-23"), true);
  assert.equal(canFeatureEvent({ ...event, annuel: true }, "2026-09-23"), true);
});

test("same-title events get organizer then numbered slugs without changing the first URL", () => {
  assert.equal(eventSlugCandidate("festival", "Promoteur B", 0), "festival");
  assert.equal(eventSlugCandidate("festival", "Promoteur B", 1), "festival-promoteur-b");
  assert.equal(eventSlugCandidate("festival", "Promoteur B", 2), "festival-promoteur-b-3");
  assert.equal(eventSlugCandidate("festival", null, 1), "festival-2");
  assert.match(eventSlugCandidate("Événement !!!", "Équipe & Co", 1), /^[a-z0-9-]+$/);
});

test("formatting preserves plain legacy descriptions and never interprets arbitrary HTML", () => {
  const old = "Texte [b]historique[/b] <script>alert(1)</script>";
  assert.deepEqual(descriptionNodes(old, "plain"), [old]);
  assert.equal(plainDescription(old), old);
  const rich = "[b]Gras [i]italique[/i][/b] et [u]souligné[/u]";
  assert.equal(plainDescription(rich, "formatted"), "Gras italique et souligné");
  assert.deepEqual(descriptionNodes("<img src=x onerror=alert(1)>", "formatted"), [
    "<img src=x onerror=alert(1)>",
  ]);
  assert.equal(formatSelection("Bonjour monde", 8, 13, "b").value, "Bonjour [b]monde[/b]");
  assert.equal(formatSelection("Bonjour [b]monde[/b]", 11, 16, "b").value, "Bonjour monde");
  assert.equal(plainDescription("[b]Gras [b]imbriqué[/b][/b]", "formatted"), "Gras imbriqué");
  assert.equal(plainDescription("[b]incomplet", "formatted"), "[b]incomplet");
});

test("social previews supply full OG and Twitter data with absolute image URLs", () => {
  const config = {
    siteUrl: "https://events.example.test",
    title: "Festival",
    description: "Le rendez-vous",
    path: "/evenements/festival",
  };
  const entries = socialMeta(config);
  const get = (key: string) =>
    entries.find((entry) => entry.property === key || entry.name === key)?.content;
  assert.equal(get("og:url"), "https://events.example.test/evenements/festival");
  assert.equal(get("og:image"), "https://events.example.test/social-card.jpg");
  assert.equal(get("og:image:type"), "image/jpeg");
  assert.equal(get("og:image:width"), "1280");
  assert.equal(get("og:image:secure_url"), get("og:image"));
  assert.equal(get("twitter:title"), "Festival");
  assert.equal(get("twitter:image"), get("og:image"));
  assert.ok(get("og:image:alt"));
  assert.equal(
    socialMeta({ ...config, image: "/poster.png" }).find((entry) => entry.property === "og:image")
      ?.content,
    "https://events.example.test/poster.png",
  );
  assert.equal(
    socialMeta({ ...config, image: "javascript:alert(1)" }).find(
      (entry) => entry.property === "og:image",
    )?.content,
    get("og:image"),
  );
});

test("bullets apply to whole selected lines and toggle without touching surrounding text", () => {
  const original = "Introduction\nConcert\nRencontre\nConclusion";
  const result = formatBulletSelection(original, 15, 31);
  assert.equal(result.value, "Introduction\n- Concert\n- Rencontre\nConclusion");
  assert.equal(formatBulletSelection(result.value, result.start, result.end).value, original);
  assert.equal(formatBulletSelection("Un\nDeux", 0, 3).value, "- Un\nDeux");
  assert.equal(formatBulletSelection("Un\nDeux", 5, 5).value, "Un\n- Deux");
  assert.equal(formatBulletSelection("", 0, 0).value, "- Votre texte");
  assert.equal(formatBulletSelection("\nSuite", 0, 0).value, "- Votre texte\nSuite");
  assert.equal(formatBulletSelection("- Un\nDeux", 0, 9).value, "- Un\n- Deux");
  assert.equal(formatSelection("- Un\n- Deux", 0, 11, "b").value, "- [b]Un[/b]\n- [b]Deux[/b]");
});

test("bullet lists render safely with inline styles, preserve legacy text and readable SEO", () => {
  const value = "Introduction\n- [b]Concert[/b]\n- [i]Rencontre[/i] [u]gratuite[/u]\nConclusion";
  assert.deepEqual(descriptionNodes(value, "plain"), [value]);
  const list = descriptionNodes(value, "formatted").find(
    (node) => typeof node !== "string" && node.tag === "ul",
  );
  assert.ok(list && typeof list !== "string" && list.tag === "ul");
  assert.equal(list.items.length, 2);
  assert.equal(
    plainDescription(value, "formatted").replace(/\s+/g, " "),
    "Introduction Concert Rencontre gratuite Conclusion",
  );
  assert.equal(
    plainDescription("- <img src=x onerror=alert(1)>", "formatted").trim(),
    "<img src=x onerror=alert(1)>",
  );
  assert.equal(plainDescription("• Un\r\n• Deux", "formatted").trim(), "Un\nDeux");
  assert.equal(plainDescription("[b]Deux\nlignes[/b]", "formatted"), "Deux\nlignes");
});
