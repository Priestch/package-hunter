import http from './http';
import api from './api';

const PACKAGE_HOST = 'https://pypi.org';

async function parseRepoURL(packageURL) {
  const config = {
    responseType: 'document',
    headers: {
      Accept: 'text/html',
    },
  };
  const response = await http.get(packageURL, config);
  const statsEl = response.data.querySelector(
    '#content [data-controller="github-repo-stats"]',
  );
  if (statsEl === null) {
    return null;
  }
  const statsUrlText = statsEl.dataset.githubRepoStatsUrlValue;
  const statsUrl = new URL(statsUrlText);
  console.log(statsUrl, statsUrl.pathname);
  return statsUrl.pathname.replace('/repos', '');
}

async function fetchRepoData(repoURL) {
  return api.getGithubRepo(repoURL);
}

async function dispatchEvent({ messageType, data }, sender, sendResponse) {
  let result = null;
  let repoURL = null;
  switch (messageType) {
    case 'getRepoData':
      repoURL = await parseRepoURL(`${PACKAGE_HOST}${data}`);
      if (repoURL === null) {
        result = null;
        break;
      }
      try {
        result = await fetchRepoData(repoURL);
      } catch (e) {
        result = null;
      }
      break;
    default:
      break;
  }
  sendResponse(result);
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  dispatchEvent(message, sender, sendResponse);
  return true;
});
