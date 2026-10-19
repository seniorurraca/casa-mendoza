function read(storage, key, fallback) {
  try {
    return JSON.parse(storage().getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(storage, key, value) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {}
}

const local = () => localStorage;
const session = () => sessionStorage;

export const load = (key, fallback) => read(local, key, fallback);

export const save = (key, value) => write(local, key, value);

export const storedValue = (key, kind = "local") => {
  const storage = kind === "session" ? session : local;
  return { get: () => read(storage, key, null), set: value => write(storage, key, value) };
};
