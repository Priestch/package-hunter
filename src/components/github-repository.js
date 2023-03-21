export default class GithubRepository {
  constructor(options) {
    this.options = options;
    this.repoData = null;
    this.el = null;
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
    const iconEl = GithubRepository.createIcon(iconClasses);
    itemEle.appendChild(iconEl);
    const textEl = document.createElement('span');
    textEl.classList.add('gh-item-content');
    textEl.textContent = text;
    itemEle.appendChild(textEl);
    return itemEle;
  }

  createListElement() {
    const itemList = document.createElement('ul');
    itemList.classList.add('gh-repo-card');
    const starItem = GithubRepository.createListItem(this.repoData.starCount, [
      'fa',
      'fa-star',
    ]);
    starItem.classList.add('gh-star-item');
    const forkItem = GithubRepository.createListItem(this.repoData.forkCount, [
      'fa',
      'fa-code-branch',
    ]);
    forkItem.classList.add('gh-fork-item');
    itemList.appendChild(starItem);
    itemList.appendChild(forkItem);
    return itemList;
  }

  createComponent() {
    const component = document.createElement('a');
    component.classList.add('gh-repo-anchor');
    component.setAttribute('href', this.repoData.url);
    component.setAttribute('target', '_blank');
    const listElement = this.createListElement();
    component.appendChild(listElement);

    component.addEventListener('mouseover', async () => {
      const data = await this.options.getGithubData(this.repoData.url);
      if (data) {
        this.update(data);
      }
    });

    return component;
  }

  update(data) {
    this.repoData.starCount = data.starCount;
    this.repoData.forkCount = data.forkCount;
    const starContentEl = this.el.querySelector(
      '.gh-star-item .gh-item-content',
    );
    const forkContentEl = this.el.querySelector(
      '.gh-fork-item .gh-item-content',
    );
    starContentEl.textContent = data.starCount;
    forkContentEl.textContent = data.forkCount;
  }

  render(container, repoData) {
    if (repoData !== null) {
      this.repoData = repoData;
      this.el = this.createComponent();
      this.el.component$ = this;
      container.appendChild(this.el);
    }
  }
}
