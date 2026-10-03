// Writes an updated distanceOffsetKm into content/livetrack.json on GitHub,
// via the Contents API (the same mechanism Decap CMS itself uses to save
// edits from /admin). This is what makes the automatic cross-session
// distance carry-forward (see server.js's syncLivetrack) survive a server
// restart — Render's free tier can sleep/restart at any time, wiping every
// in-memory value, so without this, carrying the distance forward only
// lasts until the next restart, then needs the field set by hand again.
//
// Needs GITHUB_WRITE_TOKEN: a GitHub Personal Access Token scoped to just
// this repo's file contents (fine-grained token, "Only select repositories"
// -> this repo, permission "Contents: Read and write"). Deliberately a
// separate, more powerful credential from GITHUB_OAUTH_CLIENT_ID/SECRET
// above, which only ever act on behalf of whoever logs into /admin — this
// one lets the SERVER ITSELF commit, with no human in the loop, so it's
// worth keeping its scope as narrow as GitHub allows.
//
// If GITHUB_WRITE_TOKEN isn't set, updateDistanceOffsetKm() is a no-op
// (returns false) — the in-memory carry-forward in server.js still works
// for as long as the process stays up, it just won't survive a restart.
const REPO = process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const CONTENT_PATH = 'live-run-tracker/content/livetrack.json';
const TOKEN = process.env.GITHUB_WRITE_TOKEN;

const API_URL = `https://api.github.com/repos/${REPO}/contents/${CONTENT_PATH}`;

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'live-run-tracker',
  };
}

// Read-modify-write with the file's current sha, so a concurrent edit (e.g.
// someone publishing a note/URL change from /admin at the same moment) is
// detected as a 409 conflict rather than silently clobbered — retried a
// couple of times rather than failing outright, since that's expected to
// happen occasionally, not a real error.
async function updateDistanceOffsetKm(newKm) {
  if (!TOKEN) return false;

  for (let attempt = 0; attempt < 3; attempt++) {
    let current;
    try {
      const getRes = await fetch(`${API_URL}?ref=${BRANCH}`, { headers: authHeaders() });
      if (!getRes.ok) {
        console.error('github-content: could not read current file:', getRes.status);
        return false;
      }
      current = await getRes.json();
    } catch (err) {
      console.error('github-content: GET failed:', err.message);
      return false;
    }

    let data;
    try {
      data = JSON.parse(Buffer.from(current.content, 'base64').toString('utf8'));
    } catch (err) {
      console.error('github-content: could not parse current file:', err.message);
      return false;
    }

    data.distanceOffsetKm = newKm;
    const newContentBase64 = Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8').toString('base64');

    try {
      const putRes = await fetch(API_URL, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Auto: carry distance forward to ${newKm}km after a new LiveTrack session`,
          content: newContentBase64,
          sha: current.sha,
          branch: BRANCH,
        }),
      });
      if (putRes.ok) {
        console.log(`github-content: distanceOffsetKm persisted as ${newKm}`);
        return true;
      }
      if (putRes.status === 409) {
        console.log('github-content: conflicting edit, retrying...');
        continue;
      }
      console.error('github-content: PUT failed:', putRes.status, await putRes.text().catch(() => ''));
      return false;
    } catch (err) {
      console.error('github-content: PUT failed:', err.message);
      return false;
    }
  }

  console.error('github-content: gave up after repeated conflicts');
  return false;
}

module.exports = { updateDistanceOffsetKm };
