export default class GithubRepository {
  constructor(URL) {
    this.URL = URL;
    this.repoData = null;
  }

  static createIcon(classes) {
    const icon = document.createElement('i');
    for (let i = 0; i < classes.length; i++) {
      const cssClass = classes[i];
      icon.classList.add(cssClass);
    }
    return icon;
  }

  static createListItem(text, iconClasses) {
    const itemEle = document.createElement('li');
    itemEle.classList.add('gh-item');
    const forkIcon = GithubRepository.createIcon(iconClasses);
    itemEle.appendChild(forkIcon);
    itemEle.appendChild(document.createTextNode(text));
    return itemEle;
  }

  createListElement() {
    const itemList = document.createElement('ul');
    itemList.classList.add('gh-repo-card');
    const starItem = GithubRepository.createListItem(
      this.repoData.stargazers_count,
      ['fa', 'fa-star'],
    );
    const forkItem = GithubRepository.createListItem(
      this.repoData.forks_count,
      ['fa', 'fa-code-branch'],
    );
    itemList.appendChild(starItem);
    itemList.appendChild(forkItem);
    return itemList;
  }

  createComponent() {
    const component = document.createElement('a');
    component.classList.add('gh-repo-anchor');
    component.setAttribute('href', this.repoData.html_url);
    const listElement = this.createListElement();
    component.appendChild(listElement);

    return component;
  }

  render(container, repoData) {
    if (repoData !== null) {
      this.repoData = repoData;
      const component = this.createComponent();
      container.appendChild(component);
    }
  }
}
