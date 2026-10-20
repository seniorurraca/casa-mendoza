import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);

export const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value));

export const dataFile = (config, name) => join(dirname(config.output), name);
