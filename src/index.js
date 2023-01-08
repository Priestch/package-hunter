import GithubRepository from './components/github-repository';
import oauth from './oauth';

const pkgElementRatio = {};

const RepoTaskStatus = {
  PENDING: 0,
  RESOLVED: 1,
};

function findPagePackages() {
  return document.querySelector('#content .left-layout__main ul.unstyled');
}

function getPackageURL(pkgElement) {
  const anchorElement = pkgElement.querySelector('.package-snippet');
  return anchorElement.getAttribute('href');
}

function createPackage(pkgElement) {
  return {
    pkgURL: getPackageURL(pkgElement),
    domContainer: pkgElement,
  };
}

function collectPagePackages() {
  const pkgListElement = findPagePackages();
  const packages = [];
  for (let i = 0; i < pkgListElement.children.length; i++) {
    const child = pkgListElement.children[i];
    packages.push(createPackage(child));
  }
  return packages;
}

function sendMessage(message, callback) {
  console.log('sendMessage', message);
  chrome.runtime.sendMessage(message, callback);
}

function convertRepoData(repoData) {
  const {
    forkCount,
    stargazers: { totalCount },
    url,
  } = repoData;
  return {
    forkCount,
    starCount: totalCount,
    url,
  };
}

function renderRepoData(pkgURL, domContainer, resolve) {
  return rawRepoData => {
    if (rawRepoData === null) {
      console.error('renderRepoData', pkgURL, rawRepoData);
      return;
    }
    let repoData;
    try {
      repoData = convertRepoData(rawRepoData);
    } catch (e) {
      console.log(
        'Error happened when fetching Repo data',
        pkgURL,
        rawRepoData,
      );
      console.error(e);
    }
    if (!(repoData instanceof Error)) {
      const repoComponent = new GithubRepository();
      repoComponent.render(domContainer, repoData);
      /* eslint-disable no-param-reassign */
      domContainer.dataset.repoStatus = RepoTaskStatus.RESOLVED;
      console.log(pkgURL, domContainer.dataset.repoStatus);
    }
    resolve(repoData);
  };
}

function getRepoData({ pkgURL, domContainer }) {
  console.log('getRepoData', pkgURL);
  return new Promise(resolve => {
    if (domContainer.dataset.repoStatus) {
      resolve();
      return;
    }
    /* eslint-disable no-param-reassign */
    domContainer.dataset.repoStatus = RepoTaskStatus.PENDING;
    console.log(pkgURL, domContainer.dataset.repoStatus);
    const message = {
      messageType: 'getRepoData',
      data: pkgURL,
    };
    sendMessage(message, renderRepoData(pkgURL, domContainer, resolve));
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
async function getRepos(packages, step = 2) {
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

function pkgEnterViewportCallback(entries) {
  const entry = entries[0];
  const pkgURL = getPackageURL(entry.target);
  const prevRatio = pkgElementRatio[pkgURL];
  if (entry.intersectionRatio > prevRatio && entry.intersectionRatio > 0.95) {
    const pkgData = { pkgURL, domContainer: entry.target };
    getRepoData(pkgData);
  }
  pkgElementRatio[pkgURL] = entry.intersectionRatio;
}

function observeRepoElement() {
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: [0.8, 1],
  };

  const observer = new IntersectionObserver(pkgEnterViewportCallback, options);
  const boxes = document.querySelectorAll('.left-layout__main .unstyled > li');
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    observer.observe(box);
  }
}

async function main() {
  console.log('main', oauth.access_token);
  if (!oauth.access_token) {
    console.log('authorize');
    await authorize();
  }

  observeRepoElement();

  const packages = collectPagePackages();
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    pkgElementRatio[pkg.pkgURL] = 0;
  }
  getRepos(packages.slice(0, 7));
}

main();
