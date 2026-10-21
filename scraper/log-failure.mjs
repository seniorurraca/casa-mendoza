import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { dataFile, readJson, writeJson } from "./lib/files.mjs";
import { appendRun, logTail, runUrl } from "./lib/runs.mjs";

const ERROR_LINES = 15;

const { values: args } = parseArgs({ options: { mode: { type: "string" }, segment: { type: "string" }, log: { type: "string" } } });
const config = JSON.parse(readFileSync("config.json", "utf8"));
const runsPath = dataFile(config, "runs.json");
const log = existsSync(args.log) ? readFileSync(args.log, "utf8") : "";

writeJson(runsPath, appendRun(readJson(runsPath, []), {
  mode: args.mode, segment: args.segment, ok: false, startedAt: null, finishedAt: new Date().toISOString(), scanned: {}, kept: null, new: null,
  error: logTail(log, ERROR_LINES) || "Falló sin log.", url: runUrl(process.env),
}));
