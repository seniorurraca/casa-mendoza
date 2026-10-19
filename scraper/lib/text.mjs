import { normalize as normalizePlain } from "../../docs/js/text.js";

const ENTITIES = { "&amp;": "&", "&quot;": '"', "&#039;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };

export const decodeEntities = s => (s || "").replace(/&(amp|quot|#039|lt|gt|nbsp);/g, m => ENTITIES[m]);

export const normalize = s => normalizePlain(decodeEntities(s));

export const matchesAny = (text, patterns) => patterns.some(p => new RegExp(p).test(text));

export const detectFeatures = (text, patternsByFeature) =>
  Object.fromEntries(Object.entries(patternsByFeature).map(([name, patterns]) => [name, matchesAny(text, patterns)]));
