import { readFileSync } from "node:fs";

export const config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8"));

export const makeListing = (overrides = {}) => ({
  id: "test-1",
  type: "casa",
  usd: 50000,
  supT: 250,
  supC: 100,
  dorm: 3,
  lat: -32.92,
  lng: -68.85,
  department: "Godoy Cruz",
  locationText: "calle falsa 123",
  text: "",
  cocheraAttr: false,
  ...overrides,
});
