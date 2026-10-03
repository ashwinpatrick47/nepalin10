// Writes content/livetrack.json straight to GitHub via the Contents API,
// using a token only the site owner holds. Used by POST /api/update-livetrack
// so non-technical friends can publish a new link with just a password —
// no GitHub account of their own needed.
const REPO = 'ashwinpatrick47/nepalin10';
const BRANCH = 'main';
const FILE_PATH = 'live-run-tracker/content/livetrack.json';
const API_BASE = process.env.GITHUB_API_BASE || 'https://api.github.com';

async function updateLivetrackFile(token, data) {
  const url = `${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'live-run-tracker',
  };

  const getRes = await fetch(`${url}?ref=${BRANCH}`, { headers });
  if (!getRes.ok) {
    throw new Error(`GitHub read failed: ${getRes.status} ${await getRes.text()}`);
  }
  const current = await getRes.json();

  const content = Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8').toString('base64');
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Update LiveTrack link via /update.html',
      content,
      sha: current.sha,
      branch: BRANCH,
    }),
  });
  if (!putRes.ok) {
    throw new Error(`GitHub write failed: ${putRes.status} ${await putRes.text()}`);
  }
  return putRes.json();
}

module.exports = { updateLivetrackFile };
