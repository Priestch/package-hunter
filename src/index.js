import GithubRepository from './components/github-repository';

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
  }
}

class PubProvider extends Provider {
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
    const pkgElements = document.querySelectorAll(this.cssSelector);
    for (let i = 0; i < pkgElements.length; i++) {
      const child = pkgElements[i];
      const titleAnchor = child.querySelector('.packages-title a');
      const detailUrl = titleAnchor.getAttribute('href');
      if (detailUrl.startsWith('/')) {
        const pkg = new Package(detailUrl, { el: child, detailUrl });
        this.pkgs.set(pkg.name, pkg);
      }
    }
  }

  trigger() {
    const packages = Array.from(this.pkgs.values());
    sendMessage({
      messageType: 'parsePubPackageDetails',
      data: packages,
    });
  }
}

class GemProvider extends Provider {
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
    const pkgElements = document.querySelectorAll(this.cssSelector);
    for (let i = 0; i < pkgElements.length; i++) {
      const child = pkgElements[i];
      const detailUrl = child.getAttribute('href');
      const pkg = new Package(detailUrl, { el: child, detailUrl });
      this.pkgs.set(pkg.name, pkg);
    }
  }

  trigger() {
    const packages = Array.from(this.pkgs.values());
    sendMessage({
      messageType: 'parseGemPackageDetails',
      data: packages,
    });
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

class NpmProvider extends Provider {
  constructor(props) {
    super(props);
    this.trigger();
  }

  trigger() {
    if (window.location.href === 'https://www.npmjs.com/') {
      this.createFirstLoadObserver();
    }
    this.createObserver();
  }

  // eslint-disable-next-line class-methods-use-this
  async getSearchedResult() {
    return fetch(window.location.href, {
      headers: {
        'x-spiferack': '1',
      },
      method: 'GET',
      credentials: 'include',
    }).then(async response => {
      if (!response.ok) {
        return null;
      }

      return response.json();
    });
  }

  injectGithubData(packageEls) {
    this.getSearchedResult().then(async searchResult => {
      if (!searchResult || !searchResult.objects) {
        return;
      }
      searchResult.objects.forEach((item, index) => {
        const { repository, npm } = item.package.links;
        const detailUrl = new URL(npm).pathname;
        const packageEl = packageEls[index];
        if (!packageEl) {
          return;
        }
        const pkg = new Package(detailUrl, {
          el: packageEl,
          detailUrl,
        });
        pkg.repoUrl = repository;
        this.pkgs.set(pkg.name, pkg);

        const options = {
          getGithubData(repoUrl) {
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
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  createFirstLoadObserver() {
    const config = { childList: true, subtree: true };

    const callback = mutationList => {
      mutationList.forEach(mutation => {
        const { length } = mutation.addedNodes;
        if (length === 0 || length !== 1) {
          return;
        }
        if (mutation.target && mutation.target.getAttribute('id') !== 'main') {
          return;
        }
        const node = mutation.addedNodes[0];
        if (!node.classList.contains('center')) {
          return;
        }

        const packageEls = node.querySelectorAll('section');
        this.injectGithubData(packageEls);
      });
    };

    const observer = new MutationObserver(callback);
    const target = document.body;
    observer.observe(target, config);
  }

  // eslint-disable-next-line class-methods-use-this
  createObserver() {
    const config = { childList: true, subtree: true };

    const callback = mutationList => {
      const pkgEls = [];
      mutationList.forEach(mutation => {
        const { length } = mutation.addedNodes;
        if (length === 0 || length !== 1) {
          return;
        }
        const node = mutation.addedNodes[0];
        if (
          !(node.tagName === 'SECTION') &&
          !node.parentElement.classList.contains('center')
        ) {
          return;
        }
        pkgEls.push(node);
      });

      this.injectGithubData(pkgEls);
    };

    const observer = new MutationObserver(callback);
    const target = document.getElementById('main');
    observer.observe(target, config);
  }
}

let provider;

function createProvider() {
  if (window.location.hostname === 'pypi.org') {
    return new PypiProvider('#content .left-layout__main ul.unstyled');
  }
  if (window.location.hostname === 'crates.io') {
    return new CrateProvider('[class^=_crate-row_]');
  }
  if (window.location.hostname === 'www.npmjs.com') {
    return new NpmProvider('');
  }
  if (window.location.hostname === 'pub.dev') {
    return new PubProvider('.packages-item');
  }
  if (window.location.hostname === 'rubygems.org') {
    return new GemProvider('.gems__gem');
  }

  return null;
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
      if (window.location.hostname !== 'rubygems.org') {
        pkg.el.style.position = 'relative';
      }
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
      if (window.location.hostname === 'rubygems.org') {
        pkg.el.classList.add('github');
        repoComponent.el.style.setProperty('top', `${pkg.el.offsetTop}px`);
        repoComponent.el.style.setProperty('right', '0px');
        repoComponent.el.style.setProperty(
          'height',
          `${pkg.el.offsetHeight - 1}px`,
        );
      }
    });
  }
});
