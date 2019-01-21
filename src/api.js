import http from './http';

function parseRepoURL(repoURL) {
  const sections = repoURL.split('/');
  const [owner, repoName] = sections.slice(sections.length - 2);
  return {
    owner,
    repoName,
  };
}

function getGithubRepo(repoURL, accessToken) {
  const { owner, repoName } = parseRepoURL(repoURL);
  const data = {
    query: `
      query {
        repository(owner:"${owner}", name:"${repoName}") {
          forkCount,
          stargazers {
            totalCount
          }
        }
      }
    `,
  };
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  const options = {
    url: 'https://api.github.com/graphql',
    method: 'POST',
    headers,
    data,
  };
  return http(options);
}

export default {
  getGithubRepo,
};
