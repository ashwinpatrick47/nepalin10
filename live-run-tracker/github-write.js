// Writes JSON content files straight to GitHub via the Contents API, using a
// token only the site owner holds. Used by the /api/update-* routes so
// non-technical friends can publish updates with just a password — no GitHub
// account of their own needed.
const REPO = 'ashwinpatrick47/nepalin10';
const BRANCH = 'main';
const API_BASE = process.env.GITHUB_API_BASE || 'https://api.github.com';

async function writeJsonFile(token, filePath, data, message) {
  const url = `${API_BASE}/repos/${REPO}/contents/${filePath}`;
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
    body: JSON.stringify({ message, content, sha: current.sha, branch: BRANCH }),
  });
  if (!putRes.ok) {
    throw new Error(`GitHub write failed: ${putRes.status} ${await putRes.text()}`);
  }
  return putRes.json();
}

function updateLivetrackFile(token, data) {
  return writeJsonFile(
    token,
    'live-run-tracker/content/livetrack.json',
    data,
    'Update LiveTrack link via /update.html',
  );
}

function updateSiteSettingsFile(token, data) {
  return writeJsonFile(
    token,
    'src/content/site-settings.json',
    data,
    'Update site settings via /update.html',
  );
}

function updateRunStatusFile(token, data) {
  return writeJsonFile(
    token,
    'live-run-tracker/content/run-status.json',
    data,
    'Mark run as started',
  );
}

module.exports = { updateLivetrackFile, updateSiteSettingsFile, updateRunStatusFile };
