import GithubRepository from './components/github-repository';

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

function getRepoData({ pkgURL, domContainer }) {
  return new Promise(resolve => {
    const message = {
      messageType: 'getRepoData',
      data: pkgURL,
    };
    chrome.runtime.sendMessage(message, repoData => {
      const repoComponent = new GithubRepository(pkgURL);
      repoComponent.render(domContainer, repoData);
      resolve(repoData);
    });
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

function main() {
  const packages = collectPagePackages();
  getRepos(packages);
}

main();
