(() => {
  let choice = null;
  try { choice = JSON.parse(localStorage.getItem("casa-mendoza:theme")); } catch {}
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = choice && choice !== "system" ? choice : dark ? "dark" : "light";
})();
