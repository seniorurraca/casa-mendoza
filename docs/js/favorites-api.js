export function favoritesApi(baseUrl, token) {
  async function request(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  const itemPath = id => `/favorites/${encodeURIComponent(id)}`;
  return {
    merge: ids => request("POST", "/favorites/merge", { ids }),
    add: id => request("PUT", itemPath(id)),
    remove: id => request("DELETE", itemPath(id)),
  };
}
