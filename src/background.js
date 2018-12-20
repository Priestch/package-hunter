import http from './http';
import { PACKAGE_HOST } from './constants';

import oauth from './oauth';

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
  const resp = await http.get(packageURL);
  const parser = new DOMParser();
  const loadedHTML = parser.parseFromString(resp.data, 'text/html');
  const repoElement = loadedHTML.querySelector('#content .github-repo-info');
  if (repoElement === null) {
    return null;
  }
  return repoElement.dataset.url;
}

async function fetchRepoData(repoURL) {
  const params = { access_token: oauth.access_token };
  return http.get(repoURL, { params });
}

async function dispatchEvent({ messageType, data }, sender, sendResponse) {
  let result = null;
  let repoURL = null;
  let resp = null;
  switch (messageType) {
    case 'getRepoData':
      repoURL = await parseRepoURL(`${PACKAGE_HOST}${data}`);
      if (repoURL === null) {
        result = null;
        break;
      }
      try {
        resp = await fetchRepoData(repoURL);
        result = resp.data;
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
