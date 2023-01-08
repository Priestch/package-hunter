import http from './http';

function parseRepoURL(repoURL) {
  const sections = repoURL.split('/');
  const [owner, repoName] = sections.slice(sections.length - 2);
  return {
    owner,
    repoName,
  };
}

async function getGithubRepo(repoURL, accessToken) {
  const { owner, repoName } = parseRepoURL(repoURL);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  const options = {
    url: `https://api.github.com/repos/${owner}/${repoName}`,
    method: 'GET',
    headers,
  };
  const response = await http(options);

  return {
    forkCount: response.data.forks,
    stargazers: {
      totalCount: response.data.stargazers_count,
    },
    url: response.data.html_url,
  };
}

export default {
  getGithubRepo,
};
