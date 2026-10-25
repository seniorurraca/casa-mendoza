const BLOCKED = 403;

const USER_AGENT = "Mozilla/5.0 (compatible; casa-mendoza personal research)";

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (res.status !== 200) throw Object.assign(new Error(`HTTP ${res.status} ${url}`), { status: res.status });
  return res;
}

export const fetchText = async url => (await request(url)).text();

export const fetchJson = async url => (await request(url)).json();

export async function withRetry(task, { retries, backoffMs }) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= retries || error.status === BLOCKED) throw error;
      console.warn(`${error.message} — reintento en ${backoffMs / 1000}s`);
      await sleep(backoffMs);
    }
  }
}
