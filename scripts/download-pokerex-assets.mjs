import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const pokerex = JSON.parse(await fs.readFile(inputPath, "utf8"));
const source = pokerex.data;
const activeLocations = source.locations.filter((location) => location.mapGroup <= 4);
const mapsByGroupNumber = new Map(source.maps.map((map) => [`${map.mapGroup}:${map.mapNum}`, map]));

const downloads = [];
for (const location of activeLocations) {
  const map = mapsByGroupNumber.get(`${location.mapGroup}:${location.mapNum}`);
  if (map?.thumbnail) {
    downloads.push({
      url: map.thumbnail,
      output: path.join(rootDir, "assets", "maps", `pokerex-${map.id}.png`),
    });
  }
}

const download = async ({ url, output }) => {
  await fs.mkdir(path.dirname(output), { recursive: true });
  const response = await fetch(url, { headers: { "user-agent": "dreamstone-field-guide-builder" } });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  await fs.writeFile(output, Buffer.from(await response.arrayBuffer()));
  return path.relative(rootDir, output);
};

const completed = [];
let next = 0;
const workers = Array.from({ length: 8 }, async () => {
  while (next < downloads.length) completed.push(await download(downloads[next++]));
});
await Promise.all(workers);

console.log(
  JSON.stringify(
    {
      downloaded: completed.length,
      maps: completed.filter((file) => file.startsWith(`assets${path.sep}maps`)).length,
    },
    null,
    2,
  ),
);
