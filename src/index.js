import GithubRepository from './components/github-repository';
import oauth from './oauth';

function findPagePackages() {
  return document.querySelector('#content .left-layout__main ul.unstyled');
}

function collectPagePackages() {
  const pkgListElement = findPagePackages();
  const packages = [];
  for (let i = 0; i < pkgListElement.children.length; i++) {
    const child = pkgListElement.children[i];
    child.style.position = 'relative';
    const anchorElement = child.querySelector('.package-snippet');
    const pkg = {
      pkgURL: anchorElement.getAttribute('href'),
      domContainer: child,
    };
    packages.push(pkg);
  }
  return packages;
}

function sendMessage(message, callback) {
  chrome.runtime.sendMessage(message, callback);
}

function getRepoData({ pkgURL, domContainer }) {
  return new Promise(resolve => {
    const message = {
      messageType: 'getRepoData',
      data: pkgURL,
    };
    const callback = repoData => {
      // console.log('repoData', pkgURL, repoData);
      if (!(repoData instanceof Error)) {
        const repoComponent = new GithubRepository(pkgURL);
        repoComponent.render(domContainer, repoData);
      }
      resolve(repoData);
    };
    sendMessage(message, callback);
  });
}

function getRepoDataByStep(start, step, packages) {
  const stepPromises = [];
  const stepPackages = packages.slice(start, start + step);
  for (let j = 0; j < step; j++) {
    stepPromises.push(getRepoData(stepPackages[j]));
  }
  return Promise.all(stepPromises);
}

/* eslint-disable no-await-in-loop */
async function getRepos(packages) {
  const step = 2;
  for (let i = 0; i < packages.length; i += step) {
    await getRepoDataByStep(i, step, packages);
  }
}

async function authorize() {
  return new Promise(resolve => {
    const callback = data => {
      resolve(data);
    };
    const message = {
      messageType: 'authorize',
      data: '',
    };
    sendMessage(message, callback);
  });
}

async function main() {
  if (!oauth.access_token) {
    await authorize();
  }
  const packages = collectPagePackages();
  getRepos(packages);
}

main();
