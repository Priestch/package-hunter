import http from './http';

function parseRepoURL(repoURL) {
  const sections = repoURL.split('/');
  const [owner, repoName] = sections.slice(sections.length - 2);
  return {
    owner,
    repoName,
  };
}

async function getGithubRepo(repoUrl) {
  const config = {
    responseType: 'document',
    headers: {
      Accept: 'text/html',
    },
  };
  try {
    const response = await http.get(repoUrl, config);
    const loadedHTML = response.data;
    const forkEl = loadedHTML.getElementById('repo-network-counter');
    const starEl = loadedHTML.getElementById('repo-stars-counter-unstar');

    return {
      forkCount: forkEl.textContent,
      starCount: starEl.textContent,
    };
  } catch (e) {
    return {
      error: true,
    };
  }
}

async function getGithubDataByPath(repoPath) {
  const { owner, repoName } = parseRepoURL(repoPath);
  const repoURL = `https://github.com/${owner}/${repoName}`;
  const data = await getGithubRepo(repoURL);

  return {
    url: repoURL,
    forkCount: data.forkCount,
    stargazers: {
      totalCount: data.starCount,
    },
  };
}

export default {
  getGithubRepo,
  getGithubDataByPath,
};
