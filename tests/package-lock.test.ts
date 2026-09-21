import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import test from "node:test";

type LockedPackage = {
  version: string;
  resolved?: string;
  integrity?: string;
  optionalDependencies?: Record<string, string>;
};

const { packages } = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
) as { packages: Record<string, LockedPackage> };

test("the lock includes every native esbuild and Lightning CSS platform at the expected version", () => {
  const engines = Object.entries(packages).filter(([path]) =>
    /(?:^|\/)node_modules\/(?:esbuild|lightningcss)$/.test(path),
  );
  assert.ok(engines.length > 0, "Expected native build tools in the lock");

  for (const [packagePath, engine] of engines) {
    assert.ok(engine.optionalDependencies, `${packagePath}: missing platform declarations`);
    for (const [name, version] of Object.entries(engine.optionalDependencies)) {
      let directory = packagePath;
      let platform: LockedPackage | undefined;
      while (!platform) {
        platform = packages[posix.join(directory, "node_modules", name)];
        if (directory === ".") break;
        directory = posix.dirname(directory);
      }
      assert.ok(platform, `${packagePath}: missing ${name}@${version}`);
      assert.equal(platform.version, version, `${packagePath}: wrong version for ${name}`);
      assert.ok(platform.resolved, `${name}: missing download URL`);
      assert.ok(platform.integrity, `${name}: missing integrity checksum`);
    }
  }
});
