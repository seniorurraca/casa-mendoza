const ADD = "INSERT OR IGNORE INTO favorites (email, listing_id, added_at) VALUES (?1, ?2, ?3)";

export async function listFavorites(db, email) {
  const { results } = await db.prepare("SELECT listing_id FROM favorites WHERE email = ?1 ORDER BY added_at, rowid").bind(email).all();
  return results.map(row => row.listing_id);
}

export const addFavorite = (db, email, id, now) => db.prepare(ADD).bind(email, id, now).run();

export const removeFavorite = (db, email, id) => db.prepare("DELETE FROM favorites WHERE email = ?1 AND listing_id = ?2").bind(email, id).run();

export const mergeFavorites = (db, email, ids, now) => db.batch(ids.map(id => db.prepare(ADD).bind(email, id, now)));
