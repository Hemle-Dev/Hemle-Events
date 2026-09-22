import assert from "node:assert/strict";
import test from "node:test";
import {
  eventImagePath,
  removeUnusedEventImage,
  saveWithEventImage,
  validateEventImage,
} from "../src/lib/event-image.ts";

const project = "https://project.supabase.co";
const oldImage = `${project}/storage/v1/object/public/event-images/2026/old.png`;
const newImage = `${project}/storage/v1/object/public/event-images/2026/new.png`;

test("a shared image is protected even with a query string and on a later page", async () => {
  const pages: number[] = [];
  await removeUnusedEventImage(oldImage, project, {
    listReferences: async (offset) => {
      pages.push(offset);
      return offset === 0
        ? Array.from({ length: 500 }, () => ({ image_url: newImage }))
        : [{ image_url: `${oldImage}?v=2` }];
    },
    remove: async () => {
      assert.fail("shared image must not be deleted");
    },
  });
  assert.deepEqual(pages, [0, 500]);
});

test("unreferenced owned images are removed by object path", async () => {
  const removed: string[] = [];
  await removeUnusedEventImage(oldImage, project, {
    listReferences: async () => [{ image_url: newImage }],
    remove: async (path) => {
      removed.push(path);
    },
  });
  assert.deepEqual(removed, ["2026/old.png"]);
});

test("a failed reference check never deletes an image", async () => {
  await assert.rejects(
    removeUnusedEventImage(oldImage, project, {
      listReferences: async () => {
        throw new Error("Database offline");
      },
      remove: async () => {
        assert.fail("must not delete");
      },
    }),
    /Database offline/,
  );
});

test("external images never trigger privileged queries or deletion", async () => {
  await removeUnusedEventImage("https://external.test/image.jpg", project, {
    listReferences: async () => {
      assert.fail("must not query");
    },
    remove: async () => {
      assert.fail("must not delete");
    },
  });
});

test("only this project's event-image URLs resolve to deletion targets", () => {
  assert.equal(eventImagePath(oldImage, project), "2026/old.png");
  assert.equal(eventImagePath(`${oldImage}?v=2#preview`, project), "2026/old.png");
  assert.equal(
    eventImagePath(oldImage.replace("old.png", "affiche%20été.png"), project),
    "2026/affiche été.png",
  );
  for (const value of [
    null,
    "",
    "/local.png",
    "https://elsewhere.test/image.png",
    oldImage.replace("project.supabase.co", "other.supabase.co"),
    oldImage.replace("event-images/", "other-bucket/"),
    `${project}/storage/v1/object/public/event-images/%2e%2e%2Fsecret.png`,
    `${oldImage}%ZZ`,
  ]) {
    assert.equal(eventImagePath(value, project), null, String(value));
  }
});

test("reject invalid, empty or oversized files before upload", () => {
  validateEventImage({ type: "image/png", size: 8 * 1024 * 1024 });
  for (const file of [
    { type: "image/svg+xml", size: 12 },
    { type: "image/png", size: 0 },
    { type: "image/jpeg", size: 8 * 1024 * 1024 + 1 },
  ]) {
    assert.throws(() => validateEventImage(file));
  }
});

test("upload then save then cleanup, never delete the old image before success", async () => {
  const calls: string[] = [];
  const result = await saveWithEventImage(oldImage, oldImage, {
    upload: async () => {
      calls.push("upload");
      return newImage;
    },
    save: async (url) => {
      calls.push(`save:${url}`);
      return "event-id";
    },
    removeIfUnused: async (url) => {
      calls.push(`remove:${url}`);
    },
  });
  assert.deepEqual(calls, ["upload", `save:${newImage}`, `remove:${oldImage}`]);
  assert.deepEqual(result, { id: "event-id", warning: null });
});

test("failed save cleans up only the new upload and preserves the old image", async () => {
  const removed: string[] = [];
  await assert.rejects(
    saveWithEventImage(oldImage, oldImage, {
      upload: async () => newImage,
      save: async () => {
        throw new Error("RLS denied");
      },
      removeIfUnused: async (url) => {
        removed.push(url);
      },
    }),
    /RLS denied/,
  );
  assert.deepEqual(removed, [newImage]);
});

test("an upload failure does not save or delete anything", async () => {
  await assert.rejects(
    saveWithEventImage(oldImage, oldImage, {
      upload: async () => {
        throw new Error("Upload failed");
      },
      save: async () => {
        assert.fail("must not save");
      },
      removeIfUnused: async () => {
        assert.fail("must not delete");
      },
    }),
    /Upload failed/,
  );
});

test("unchanged images do not trigger cleanup", async () => {
  await saveWithEventImage(oldImage, oldImage, {
    save: async () => "event-id",
    removeIfUnused: async () => {
      assert.fail("must not delete");
    },
  });
});

test("replacing by a URL or clearing the image also cleans up the old file", async () => {
  for (const next of [null, "https://external.test/poster.png"]) {
    const removed: string[] = [];
    await saveWithEventImage(oldImage, next, {
      save: async (url) => {
        assert.equal(url, next);
        return "event-id";
      },
      removeIfUnused: async (url) => {
        removed.push(url);
      },
    });
    assert.deepEqual(removed, [oldImage]);
  }
});

test("cleanup failure is reported as a warning, not a failed save", async () => {
  const result = await saveWithEventImage(oldImage, newImage, {
    save: async () => "saved-id",
    removeIfUnused: async () => {
      throw new Error("Storage unavailable");
    },
  });
  assert.equal(result.id, "saved-id");
  assert.match(result.warning!, /ancienne image/);
});

test("rollback cleanup failure is explicit instead of silently leaking uploads", async () => {
  await assert.rejects(
    saveWithEventImage(oldImage, oldImage, {
      upload: async () => newImage,
      save: async () => {
        throw new Error("Save failed");
      },
      removeIfUnused: async () => {
        throw new Error("Cleanup failed");
      },
    }),
    /nettoyage de la nouvelle image impossible/,
  );
});
