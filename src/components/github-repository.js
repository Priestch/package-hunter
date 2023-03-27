// eslint-disable-next-line import/no-unresolved
import starSvg from 'bundle-text:../assets/icons/star.svg';
// eslint-disable-next-line import/no-unresolved
import forkSvg from 'bundle-text:../assets/icons/fork.svg';

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

  static createListItem(text, iconClasses, svg) {
    const itemEle = document.createElement('li');
    itemEle.classList.add('gh-item');
    const iconEl = GithubRepository.createIcon(iconClasses);
    itemEle.appendChild(iconEl);
    iconEl.innerHTML = svg;
    const textEl = document.createElement('span');
    textEl.classList.add('gh-item-content');
    textEl.textContent = text;
    itemEle.appendChild(textEl);
    return itemEle;
  }

  createListElement() {
    const itemList = document.createElement('ul');
    itemList.classList.add('gh-repo-card');
    const starItem = GithubRepository.createListItem(
      this.repoData.starCount,
      ['icon', 'icon-star'],
      starSvg,
    );
    starItem.classList.add('gh-star-item');
    const forkItem = GithubRepository.createListItem(
      this.repoData.forkCount,
      ['icon', 'icon-fork'],
      forkSvg,
    );
    forkItem.classList.add('gh-fork-item');
    itemList.appendChild(starItem);
    itemList.appendChild(forkItem);
    return itemList;
  }

  // eslint-disable-next-line class-methods-use-this
  setContext(dom) {
    const { hostname } = window.location;
    const classList = [];
    const size = '16px';
    if (hostname === 'crates.io') {
      classList.push('crate');
    } else if (hostname === 'pypi.org') {
      classList.push('pypi');
    } else if (hostname === 'pub.dev') {
      classList.push('pub');
    } else if (hostname === 'www.npmjs.com') {
      classList.push('npmjs');
    }

    dom.classList.add(...classList);
    dom.style.setProperty('--size', size);
  }

  setInvalidStatus() {
    this.el.classList.add('error');
    this.el.setAttribute('title', 'Cannot fetch Github repository data.');
  }

  createComponent() {
    const component = document.createElement('a');
    component.classList.add('gh-repo-anchor', 'loading');
    component.setAttribute('href', this.repoData.url);
    component.setAttribute('target', '_blank');
    const listElement = this.createListElement();
    component.appendChild(listElement);

    component.addEventListener('mouseover', async () => {
      const data = await this.options.getGithubData(this.repoData.url);
      if (!data) {
        return;
      }
      if (!data.error) {
        this.update(data);
      } else {
        this.setInvalidStatus();
      }

      this.el.classList.remove('loading');
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
      this.setContext(this.el);
      this.el.component$ = this;
      container.appendChild(this.el);
    }
  }
}
