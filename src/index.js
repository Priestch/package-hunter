import GithubRepository from './components/github-repository';

const pkgElementRatio = {};

const RepoTaskStatus = {
  PENDING: 0,
  RESOLVED: 1,
};

function sendMessage(message, callback) {
  // console.log('sendMessage', message);
  chrome.runtime.sendMessage(message, callback);
}

/**
 * @param {HTMLElement} pkgElement
 * @return {string}
 */
function getPackageURL(pkgElement) {
  const anchorElement = pkgElement.querySelector('.package-snippet');
  return anchorElement.getAttribute('href');
}

async function getGithubRepoData(repoUrl, el) {
  return new Promise(resolve => {
    if (el.dataset.repoStatus) {
      resolve();
      return;
    }
    /* eslint-disable no-param-reassign */
    el.dataset.repoStatus = RepoTaskStatus.PENDING;
    const message = {
      messageType: 'getGithubRepoData',
      data: repoUrl,
    };
    sendMessage(message, function(data) {
      resolve(data);
    });
  });
}

/**
 * @typedef {Object} PackageOptions
 * @property {string} detailUrl - The url of package detail page.
 * @property {HTMLElement} el - The container of package.
 */

class Package {
  /**
   * @param {string} name
   * @param {PackageOptions} options
   */
  constructor(name, options) {
    this.name = name;
    this.detailUrl = options.detailUrl;
    this.el = options.el;
    this.repoUrl = null;
  }

  /**
   * @deprecated
   */
  get domContainer() {
    return this.el;
  }

  /**
   * @deprecated
   * @see detailUrl
   * @return {string}
   */
  get pkgURL() {
    return this.detailUrl;
  }

  static fromDOM(el) {
    const detailUrl = getPackageURL(el);
    return new Package(detailUrl, { detailUrl, el });
  }
}

class Provider {
  /**
   * @param {string} cssSelector
   */
  constructor(cssSelector) {
    this.cssSelector = cssSelector;
    this.pkgs = new Map();
  }
}

class PypiProvider extends Provider {
  constructor(props) {
    super(props);
    this.collectPagePackages();
    this.trigger();
  }

  /**
   * @return {Package[]}
   */
  collectPagePackages() {
    this.pkgs.clear();
    const pkgElements = document.querySelector(this.cssSelector);
    for (let i = 0; i < pkgElements.children.length; i++) {
      const child = pkgElements.children[i];
      const pkg = Package.fromDOM(child);
      this.pkgs.set(pkg.name, pkg);
    }
  }

  trigger() {
    const packages = Array.from(this.pkgs.values());
    sendMessage({
      messageType: 'parsePackageDetails',
      data: packages,
    });
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      pkgElementRatio[pkg.detailUrl] = 0;
    }
  }
}

class CrateProvider extends Provider {
  constructor(props) {
    super(props);
    this.trigger();
  }

  trigger() {
    this.createObserver();
  }

  // eslint-disable-next-line class-methods-use-this
  createObserver() {
    const config = { childList: true, subtree: true };

    const callback = mutationList => {
      mutationList.forEach(mutation => {
        const { length } = mutation.addedNodes;
        if (length === 0 || length !== 1) {
          return;
        }
        const node = mutation.addedNodes[0];
        if (node.tagName === 'LI') {
          const crateEl = node.querySelector('[class^=_crate-row_]');
          if (crateEl) {
            const detailAnchor = crateEl.querySelector('a[class^="_name_"]');
            const quickLinkEls = crateEl.querySelectorAll(
              'ul[class^="_quick-links_"] a',
            );
            let githubUrl;
            quickLinkEls.forEach(function(el) {
              const { href } = el;
              if (
                el.textContent.trim() === 'Repository' &&
                href.startsWith('https://github.com')
              ) {
                githubUrl = href.replace(/\.git$/, '');
              }
            });
            const detailUrl = detailAnchor.getAttribute('href');
            const pkg = new Package(detailUrl, { detailUrl, el: crateEl });
            pkg.repoUrl = githubUrl;
            this.pkgs.set(pkg.name, pkg);
            const options = {
              getGithubData(repoUrl) {
                console.log('getGithubData', repoUrl);
                return getGithubRepoData(repoUrl, pkg.el);
              },
            };
            pkg.el.style.position = 'relative';
            if (pkg.repoUrl) {
              const repoComponent = new GithubRepository(options);
              repoComponent.render(pkg.el, {
                url: pkg.repoUrl,
                starCount: '',
                forkCount: '',
              });
            }
          }
        }
      });
    };

    const observer = new MutationObserver(callback);
    observer.observe(document.body, config);
  }
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

function getRepoData({ detailUrl, el }) {
  console.log('getRepoData', detailUrl);
  return new Promise(resolve => {
    if (el.dataset.repoStatus) {
      resolve();
      return;
    }
    /* eslint-disable no-param-reassign */
    el.dataset.repoStatus = RepoTaskStatus.PENDING;
    console.log(detailUrl, el.dataset.repoStatus);
    const message = {
      messageType: 'getRepoData',
      data: detailUrl,
    };
    sendMessage(message, renderRepoData(detailUrl, el, resolve));
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

/* eslint-disable */
async function getRepos(packages, step = 2) {
  for (let i = 0; i < packages.length; i += step) {
    await getRepoDataByStep(i, step, packages);
  }
}

function pkgEnterViewportCallback(entries) {
  const entry = entries[0];
  const pkgURL = getPackageURL(entry.target);
  const prevRatio = pkgElementRatio[pkgURL];
  if (entry.intersectionRatio > prevRatio && entry.intersectionRatio > 0.95) {
    const pkgData = { detailUrl: pkgURL, el: entry.target };
    getRepoData(pkgData);
  }
  pkgElementRatio[pkgURL] = entry.intersectionRatio;
}

// eslint-disable-next-line no-unused-vars
function observeRepoElement() {
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: [0.8, 1],
  };

  const observer = new IntersectionObserver(pkgEnterViewportCallback, options);
  const pkgEls = document.querySelectorAll('.left-layout__main .unstyled > li');
  for (let i = 0; i < pkgEls.length; i++) {
    const pkgEl = pkgEls[i];
    observer.observe(pkgEl);
  }
}

let provider;

function createProvider() {
  if (location.host === 'pypi.org') {
    return new PypiProvider('#content .left-layout__main ul.unstyled')
  } else if (location.host === 'crates.io') {
    return new CrateProvider('[class^=_crate-row_]')
  }
}

async function main() {
  // observeRepoElement();

  provider = createProvider();
  // getRepos(packages.slice(0, 7));
}

main();

chrome.runtime.onMessage.addListener(function(event) {
  if (event.messageType === 'updateRepoUrl') {
    event.data.forEach(function(item) {
      if (!item.repoUrl) {
        return;
      }

      const pkg = provider.pkgs.get(item.detailUrl);
      pkg.repoUrl = item.repoUrl;
      const options = {
        getGithubData(repoUrl) {
          return getGithubRepoData(repoUrl, pkg.el);
        },
      };
      const repoComponent = new GithubRepository(options);
      repoComponent.render(pkg.el, {
        url: item.repoUrl,
        starCount: '',
        forkCount: '',
      });
    });
  }
});
