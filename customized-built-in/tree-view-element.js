import stylesheet from "./tree-view-element.css" assert { type: "css" };

export class TreeViewElement extends HTMLUListElement {
  #controller;
  connectedCallback() {
    const {signal} = this.#controller = new AbortController();
    this.ownerDocument.adoptedStyleSheets = [stylesheet];

    this.role = "tree";
    this.tabIndex = 0;

    this.addEventListener('focus', () => {
      const selected = this.querySelector('[aria-selected="true"]');
      this.setAttribute('aria-activedescendant', selected.id);
      selected.focus();
    });

    this.addEventListener('blur', () => {
      this.removeAttribute('aria-activedescendant');
    })

    let treeItemId = 0;
    for (const listItem of this.querySelectorAll("li")) {
      listItem.role = "treeitem";
      listItem.id = `tree-view-item-${treeItemId++}`;
      listItem.tabIndex = -1;

      const nestedList = listItem.querySelector(":scope > ul");
      if (nestedList) {
        nestedList.role = "group";
        listItem.ariaExpanded = "true";
      }

      const target = nestedList ? listItem.querySelector(":scope > :first-child") : listItem;
      target.addEventListener('click', event => {
        const treeItem = event.currentTarget.closest('[role="treeitem"]');
        const expandable = treeItem.matches('[aria-expanded]');

        if (expandable) {
          treeItem.setAttribute(
            'aria-expanded',
            JSON.stringify(!JSON.parse(treeItem.ariaExpanded))
          );
        }

        const treeView = event.currentTarget.closest('[role="tree"]');

        treeView.querySelectorAll('[aria-selected="true"]').forEach(selected => selected.removeAttribute('aria-selected'));
        treeView.setAttribute('aria-activedescendant', treeItem.id);
        treeItem.setAttribute('aria-selected', 'true');
      });
    }
  }
  disconnectedCallback() {
    this.#controller.abort();
  }

  static define() {
    if (!window.customElements.get("tree-view")) {
      window.TreeViewElement = this;
      window.customElements.define("tree-view", this, { extends: "ul" });
    }
  }
}
