import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ComponentEntry } from "./registry";

const ROOT = path.join(process.cwd(), "components", "showcase");

export async function loadSource(entry: ComponentEntry): Promise<string> {
  const file = path.join(ROOT, entry.category, entry.filename);
  return fs.readFile(file, "utf8");
}
