import http from './http';

function parseRepoURL(repoURL) {
  const sections = repoURL.split('/');
  const [owner, repoName] = sections.slice(sections.length - 2);
  return {
    owner,
    repoName,
  };
}

async function getGithubRepo(repoPath) {
  const { owner, repoName } = parseRepoURL(repoPath);
  const repoURL = `https://github.com/${owner}/${repoName}`;
  const config = {
    responseType: 'document',
    headers: {
      Accept: 'text/html',
    },
  };
  const response = await http.get(repoURL, config);

  const loadedHTML = response.data;
  const forkEl = loadedHTML.getElementById('repo-network-counter');
  const starEl = loadedHTML.getElementById('repo-stars-counter-unstar');

  return {
    forkCount: forkEl.textContent,
    stargazers: {
      totalCount: starEl.textContent,
    },
    url: repoURL,
  };
}

export default {
  getGithubRepo,
};
