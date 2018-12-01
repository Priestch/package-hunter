function findPagePackages() {
  return document.querySelector('#content .left-layout__main ul.unstyled');
}

function collectPagePackages() {
  const pkgListElement = findPagePackages();
  const packages = [];
  for (let i = 0; i < pkgListElement.children.length; i++) {
    const child = pkgListElement.children[i];
    const anchorElement = child.querySelector('.package-snippet');
    packages.push(anchorElement.getAttribute('href'));
  }
  return packages;
}

function getRepoData(packageURL) {
  return new Promise((resolve) => {
    const message = {
      messageType: 'getRepoData',
      data: packageURL,
    };
    chrome.runtime.sendMessage(message, response => {
      console.log(packageURL, 'work done!', response);
      resolve(response);
    });
  });
}

function main() {
  const packages = collectPagePackages();
  for (let i = 0; i < packages.length; i++) {
    getRepoData(packages[i]);
  }
}

main();
