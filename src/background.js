import http from './http';
import api from './api';

const PYTHON_PACKAGE_HOST = 'https://pypi.org';
const PUB_PACKAGE_HOST = 'https://pub.dev/';
const GEM_PACKAGE_HOST = 'https://rubygems.org/';

class GithubParser {
  constructor(packages, step = 5) {
    this.packages = packages;
    this.step = step;
    this.parser = null;
  }

  async run(parser, tab) {
    this.parser = parser;
    for (let i = 0; i < this.packages.length; i += this.step) {
      const promises = [];
      const stepPackages = this.packages.slice(i, i + this.step);
      for (let j = 0; j < this.step; j++) {
        const pkg = stepPackages[j];
        promises.push(
          new Promise(async (resolve, reject) => {
            try {
              const repoPathname = await this.parseRepoUrl(
                `${parser.host}${pkg.detailUrl}`,
              );
              const repoUrl = repoPathname
                ? `https://github.com${repoPathname}`
                : null;
              resolve({
                repoUrl,
                detailUrl: pkg.detailUrl,
              });
            } catch (e) {
              reject(e);
            }
          }),
        );
      }
      // eslint-disable-next-line no-await-in-loop
      const results = await Promise.all(promises);

      chrome.tabs.sendMessage(tab.id, {
        messageType: 'updateRepoUrl',
        data: results,
      });
    }
  }

  async parseRepoUrl(packageURL) {
    const config = {
      responseType: 'document',
      headers: {
        Accept: 'text/html',
      },
    };
    const response = await http.get(packageURL, config);
    return this.parser.parse(response.data);
  }
}

async function handleEvent({ messageType, data }, sender, sendResponse) {
  let result = null;
  const github = new GithubParser(data);
  switch (messageType) {
    case 'getGithubRepoData':
      try {
        result = await api.getGithubRepo(data);
      } catch (e) {
        result = null;
      }
      break;
    case 'parsePackageDetails':
      await github.run(
        {
          parse(doc) {
            const statsEl = doc.querySelector(
              '#content [data-controller="github-repo-stats"]',
            );
            if (statsEl === null) {
              return null;
            }
            const statsUrlText = statsEl.dataset.githubRepoStatsUrlValue;
            const statsUrl = new URL(statsUrlText);
            return statsUrl.pathname.replace('/repos', '');
          },
          host: PYTHON_PACKAGE_HOST,
        },
        sender.tab,
      );
      break;
    case 'parsePubPackageDetails':
      await github.run(
        {
          parse(doc) {
            const linkEl = doc.querySelector('.detail-info-box .link');
            const hrefAttr = linkEl.getAttribute('href');
            if (linkEl === null || !hrefAttr.startsWith('https://github.com')) {
              return null;
            }
            const statsUrl = new URL(hrefAttr);
            return statsUrl.pathname;
          },
          host: PUB_PACKAGE_HOST,
        },
        sender.tab,
      );
      break;
    case 'parseGemPackageDetails':
      await github.run(
        {
          parse(doc) {
            const btnEL = doc.querySelector('.github-btn');
            if (!btnEL) {
              return null;
            }
            console.log(btnEL);
            return `/${btnEL.dataset.user}/${btnEL.dataset.repo}`;
          },
          host: GEM_PACKAGE_HOST,
        },
        sender.tab,
      );
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
