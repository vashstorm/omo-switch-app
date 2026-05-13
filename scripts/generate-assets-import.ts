import { Glob } from "bun";
import { writeFileSync } from "node:fs";
import path from "node:path";

async function generateAssetsImport() {
  const glob = new Glob("./dist/web/**/*");
  const files = Array.from(glob.scanSync("."));

  if (files.length === 0) {
    console.warn("No files found in dist/web/");
    return;
  }

  const imports: string[] = [];
  const assetMap: string[] = [];

  for (const filePath of files) {
    if (!Bun.file(filePath).size) {
      continue;
    }

    const fileName = path.basename(filePath);
    const relativePath = `/${path.relative("dist/web", filePath).split(path.sep).join("/")}`;
    const importPath = `../../${filePath.replace(/^\.\//, "")}`;
    const varName = `asset_${fileName.replace(/[^a-zA-Z0-9]/g, "_")}`;

    imports.push(`import ${varName} from "${importPath}" with { type: "file" };`);
    assetMap.push(`  "${relativePath}": ${varName},`);
  }

  const output = `// @ts-nocheck
// Auto-generated file - do not edit manually
${imports.join("\n")}

export const embeddedAssets: Record<string, string> = {
${assetMap.join("\n")}
};
`;

  writeFileSync("./src/server/embedded-assets.ts", output);
  console.log(`Generated embedded-assets.ts with ${files.length} assets`);
}

generateAssetsImport().catch(console.error);
