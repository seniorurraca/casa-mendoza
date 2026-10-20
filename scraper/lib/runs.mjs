const MAX_RUNS = 60;

export const appendRun = (runs, run) => [run, ...runs].slice(0, MAX_RUNS);

export const logTail = (text, lines) => text.split("\n").filter(line => line.trim()).slice(-lines).join("\n");

export const runUrl = ({ GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID }) =>
  GITHUB_RUN_ID ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : null;
