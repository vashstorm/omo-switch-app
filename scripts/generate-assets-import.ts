import { Glob } from "bun";
import { writeFileSync } from "node:fs";
import path from "node:path";

async function generateAssetsImport() {
  const glob = new Glob("./dist/web/*");
  const files = Array.from(glob.scanSync("."));

  if (files.length === 0) {
    console.warn("No files found in dist/web/");
    return;
  }

  const imports: string[] = [];
  const assetMap: string[] = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const varName = `asset_${fileName.replace(/[^a-zA-Z0-9]/g, "_")}`;

    imports.push(`import ${varName} from "${filePath}" with { type: "file" };`);
    assetMap.push(`  "/${fileName}": ${varName},`);
  }

  const output = `// Auto-generated file - do not edit manually
${imports.join("\n")}

export const embeddedAssets: Record<string, string> = {
${assetMap.join("\n")}
};
`;

  writeFileSync("./src/server/embedded-assets.ts", output);
  console.log(`Generated embedded-assets.ts with ${files.length} assets`);
}

generateAssetsImport().catch(console.error);
