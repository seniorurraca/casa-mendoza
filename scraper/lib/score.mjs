const clamp01 = x => Math.min(1, Math.max(0, x));
const linear = (value, from, to) => clamp01((value - from) / (to - from));

export const discountVsZone = (ppm, zonePpm) => (ppm && zonePpm ? 1 - ppm / zonePpm : null);

function priceFactor(listing, zonePpm, { pts, minDiscount, maxDiscount }) {
  const discount = discountVsZone(listing.ppm, zonePpm);
  return { label: "Precio vs zona", max: pts, pts: discount === null ? 0 : pts * linear(discount, minDiscount, maxDiscount) };
}

const proximityFactor = (listing, { pts, fullUntilMin }, maxMinutes) => ({
  label: "Cercanía",
  max: pts,
  pts: listing.minutes === null ? 0 : pts * (1 - linear(listing.minutes, fullUntilMin, maxMinutes)),
});

function sizeFactor(listing, { pts, minDorm, minM2 }) {
  const checks = [listing.dorm === null || listing.dorm >= minDorm, listing.supC >= minM2];
  return { label: "Tamaño", max: pts, pts: (pts * checks.filter(Boolean).length) / checks.length };
}

const hasPatio = (listing, freeM2) => listing.features.patio || listing.supT - listing.supC >= freeM2;
const flag = (label, max, condition) => ({ label, max, pts: condition ? max : 0 });

function factorsFor(listing, zonePpm, scoring, maxMinutes) {
  const common = [priceFactor(listing, zonePpm, scoring.priceVsZone), proximityFactor(listing, scoring.proximity, maxMinutes)];
  if (listing.type === "terreno") return common;
  return [
    ...common,
    flag("Apto crédito", scoring.credito, listing.features.credito),
    flag("Patio", scoring.patio.pts, hasPatio(listing, scoring.patio.freeM2)),
    sizeFactor(listing, scoring.size),
    flag("Cochera", scoring.cochera, listing.features.cochera),
  ];
}

function penaltiesFor(listing, { penalties }) {
  return [
    ["Posesión / sin escritura", penalties.posesion, listing.features.posesion],
    ["A reciclar", penalties.reciclar, listing.features.reciclar],
    ["Zona a verificar", penalties.zonaMedia, listing.risk === "medium"],
  ].filter(([, , applies]) => applies).map(([label, pts]) => ({ label, pts }));
}

export function scoreListing(listing, zonePpm, scoring, maxMinutes) {
  const factors = factorsFor(listing, zonePpm, scoring, maxMinutes);
  const penalties = penaltiesFor(listing, scoring);
  const earned = factors.reduce((sum, f) => sum + f.pts, 0);
  const possible = factors.reduce((sum, f) => sum + f.max, 0);
  const penalty = penalties.reduce((sum, p) => sum + p.pts, 0);
  const discount = discountVsZone(listing.ppm, zonePpm);
  return {
    score: Math.max(0, Math.round((100 * earned) / possible + penalty)),
    discount: discount === null ? null : Math.round(discount * 100) / 100,
    zonePpm,
    breakdown: [...factors.map(f => ({ label: f.label, pts: Math.round(f.pts) })), ...penalties],
    suspicious: discount !== null && discount > scoring.suspiciousDiscount,
  };
}
