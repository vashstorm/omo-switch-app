import { existsSync, mkdirSync, readdirSync, cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "../dist");
const possibleBundleDirs = [
  "src-tauri/target/aarch64-apple-darwin/release/bundle",
  "src-tauri/target/x86_64-apple-darwin/release/bundle",
  "src-tauri/target/release/bundle",
];

let copied = false;

for (const bundleDir of possibleBundleDirs) {
  if (!existsSync(bundleDir)) continue;

  const macosDir = resolve(bundleDir, "macos");
  const dmgDir = resolve(bundleDir, "dmg");

  if (existsSync(macosDir)) {
    const outMacos = resolve(distDir, "macos");
    mkdirSync(outMacos, { recursive: true });
    for (const entry of readdirSync(macosDir)) {
      const src = resolve(macosDir, entry);
      const dest = resolve(outMacos, entry);
      if (existsSync(dest)) {
        rmSync(dest, { recursive: true, force: true });
      }
      cpSync(src, dest, { recursive: true, force: true });
    }
    console.log(`Copied macOS apps to ${outMacos}`);
    copied = true;
  }

  if (existsSync(dmgDir)) {
    const outDmg = resolve(distDir, "dmg");
    mkdirSync(outDmg, { recursive: true });
    for (const entry of readdirSync(dmgDir)) {
      const src = resolve(dmgDir, entry);
      const dest = resolve(outDmg, entry);
      if (existsSync(dest)) {
        rmSync(dest, { recursive: true, force: true });
      }
      cpSync(src, dest, { recursive: true, force: true });
    }
    console.log(`Copied DMGs to ${outDmg}`);
    copied = true;
  }
}

if (!copied) {
  console.warn("No Tauri bundle artifacts found to copy.");
}
