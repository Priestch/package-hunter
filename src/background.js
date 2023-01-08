import http from './http';
import api from './api';

import oauth from './oauth';

const PACKAGE_HOST = 'https://pypi.org';

function getAccessCode(code) {
  const data = {
    client_id: oauth.client_id,
    client_secret: oauth.client_secret,
    code,
  };
  return http.post('https://github.com/login/oauth/access_token', data);
}

async function authorizeGithub() {
  return new Promise(resolve => {
    const options = {
      url:
        'https://github.com/login/oauth/authorize?client_id=e53dc3c347023cc17726&scope=repo',
      interactive: true,
    };
    chrome.identity.launchWebAuthFlow(options, redirectUrl => {
      const urlSearch = redirectUrl.split('?')[1];
      const tempCode = new URLSearchParams(urlSearch).get('code');
      getAccessCode(tempCode).then(resp => {
        oauth.access_token = resp.data.access_token;
        resolve(redirectUrl);
      });
    });
  });
}

async function parseRepoURL(packageURL) {
  const response = await fetch(packageURL);
  const docText = await response.text();
  const parser = new DOMParser();
  const loadedHTML = parser.parseFromString(docText, 'text/html');
  const repoElement = loadedHTML.querySelector(
    '#content [data-controller="github-repo-info"]',
  );
  if (repoElement === null) {
    return null;
  }
  return repoElement.dataset.githubRepoInfoUrlValue;
}

async function fetchRepoData(repoURL) {
  return api.getGithubRepo(repoURL, oauth.access_token);
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
    case 'authorize':
      result = await authorizeGithub();
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
