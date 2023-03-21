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
  return statsUrl.pathname.replace('/repos', '');
}

async function fetchRepoData(repoPath) {
  return api.getGithubDataByPath(repoPath);
}

/* eslint-disable no-await-in-loop */
async function getBatchPackageDetails(start, batchSize, packages) {
  const stepPromises = [];
  const stepPackages = packages.slice(start, start + batchSize);
  for (let j = 0; j < batchSize; j++) {
    const pkg = stepPackages[j];
    stepPromises.push(
      new Promise(async function(resolve, reject) {
        try {
          const repoPathname = await parseRepoURL(
            `${PACKAGE_HOST}${pkg.detailUrl}`,
          );
          resolve({
            repoUrl: `https://github.com${repoPathname}`,
            detailUrl: pkg.detailUrl,
          });
        } catch (e) {
          reject(e);
        }
      }),
    );
  }
  return Promise.all(stepPromises);
}

/* eslint-disable no-await-in-loop */
async function getPackageDetails(packages, step = 2, tab) {
  for (let i = 0; i < packages.length; i += step) {
    const results = await getBatchPackageDetails(i, step, packages);
    chrome.tabs.sendMessage(tab.id, {
      messageType: 'updateRepoUrl',
      data: results,
    });
  }
}

async function handleEvent({ messageType, data }, sender, sendResponse) {
  let result = null;
  let repoPath = null;
  switch (messageType) {
    case 'getRepoData':
      repoPath = await parseRepoURL(`${PACKAGE_HOST}${data}`);
      if (repoPath === null) {
        result = null;
        break;
      }
      try {
        result = await fetchRepoData(repoPath);
      } catch (e) {
        result = null;
      }
      break;
    case 'getGithubRepoData':
      try {
        result = await api.getGithubRepo(data);
      } catch (e) {
        result = null;
      }
      break;
    case 'parsePackageDetails':
      getPackageDetails(data, 5, sender.tab);
      break;
    default:
      break;
  }
  sendResponse(result);
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleEvent(message, sender, sendResponse);
  return true;
});
