import { promises as fs } from "fs";
import path from "path";

export default async function globalTeardown() {
  await fs.rm(path.join(process.cwd(), "__test_media__"), {
    recursive: true,
    force: true,
  });
}
