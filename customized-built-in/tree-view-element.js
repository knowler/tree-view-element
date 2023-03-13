import stylesheet from "./tree-view-element.css" assert { type: "css" };

// UI states:
//
// On initial focus, if there is no previously selected treeitem, then
// it will focus the first treeitem.
//
// Clicking

export class TreeViewElement extends HTMLUListElement {
  get #treeItems() {
    return this.querySelectorAll('[role="treeitem"]');
  }

  get #focusableTreeItems() {
    return this.querySelectorAll('[role="treeitem"]:is(:not([aria-expanded="false"] *))');
  }

  #controller;
  connectedCallback() {
    const {signal} = this.#controller = new AbortController();
    this.ownerDocument.adoptedStyleSheets = [stylesheet];

    this.role = "tree";

    let treeItemId = 0;
    for (const listItem of this.querySelectorAll("li")) {
      listItem.role = "treeitem";
      listItem.tabIndex = treeItemId === 0 ? 0 : -1;
      listItem.id = `tree-view-item-${treeItemId++}`;
      listItem.ariaSelected = "false";

      const nestedList = listItem.querySelector(":scope > ul");
      if (nestedList) {
        nestedList.role = "group";
        listItem.ariaExpanded = "false";
      }

      const target = nestedList ? listItem.querySelector(":scope > :first-child") : listItem;
      target.addEventListener('click', handleTreeItemClick);
    }

    // what is a selector for items that can currently be focused

    this.addEventListener('keydown', event => {
      switch (event.key) {
        case 'ArrowUp': {
          const treeItem = event.target;
          const focusable = Array.from(this.#focusableTreeItems);
          const treeItemIndex = focusable.findIndex(item => item === treeItem);
          const previousFocusable = focusable[treeItemIndex - 1];

          if (previousFocusable) {
            treeItem.tabIndex = -1;
            previousFocusable.tabIndex = 0;
            previousFocusable.focus();
          }

          break;
        }
        case 'ArrowDown': {
          const treeItem = event.target;
          const focusable = Array.from(this.#focusableTreeItems);
          const treeItemIndex = focusable.findIndex(item => item === treeItem);
          const nextFocusable = focusable[treeItemIndex + 1];

          if (nextFocusable) {
            treeItem.tabIndex = -1;
            nextFocusable.tabIndex = 0;
            nextFocusable.focus();
          }

          break;
        }
        case 'ArrowRight': {
          const treeItem = event.target;
          if (treeItem.ariaExpanded === "false") {
            treeItem.ariaExpanded = "true";
            break;
          } else if (treeItem.ariaExpanded === "true") {
            // descend into tree
            const firstNestedTreeItem = treeItem.querySelector(':scope > [role="group"] > [role="treeitem"]');
            treeItem.tabIndex = -1;
            firstNestedTreeItem.tabIndex = 0;
            firstNestedTreeItem.focus();
          } else {
            // Not an expandable tree item
          }
          break;
        }
        case 'ArrowLeft': {
          let treeItem = event.target;
          if (treeItem.ariaExpanded === "true") {
            treeItem.ariaExpanded = "false";
            break;
          } else {
            // ascend to parent
            const parentTreeItem = treeItem.closest('[role="group"]')?.closest('[role="treeitem"]');
            if (parentTreeItem) {
              treeItem.tabIndex = -1;
              parentTreeItem.tabIndex = 0;
              parentTreeItem.focus();
            }
          }
          break;
        }
        case ' ':
        case 'Enter': {
          let treeItem = event.target;
          if (treeItem.ariaSelected === "false") {
            treeItem.closest('[role="tree"]')
              .querySelectorAll('[role="treeitem"][aria-selected="true"]')
              .forEach(selectedTreeItem => selectedTreeItem.ariaSelected = "false");
          }
          treeItem.ariaSelected = JSON.stringify(!JSON.parse(treeItem.ariaSelected));
          break;
        }
        case 'Home': {
          const [firstTreeItem] = this.#focusableTreeItems;
          this.querySelector('[tabindex="0"]').tabIndex = -1;
          firstTreeItem.tabIndex = 0;
          firstTreeItem.focus();
          break;
        }
        case 'End': {
          const lastTreeItem = Array.from(this.#focusableTreeItems).at(-1);
          this.querySelector('[tabindex="0"]').tabIndex = -1;
          lastTreeItem.tabIndex = 0;
          lastTreeItem.focus();
          break;
        }
        case '*': {
          const treeItem = event.target;
          const parentGroup = treeItem.closest('[role="group"]');
          const expandableTreeItemsAtLevel = (parentGroup ?? this).querySelectorAll(':scope > [role="treeitem"][aria-expanded="false"]');

          for (const expandableTreeItem of expandableTreeItemsAtLevel) {
            expandableTreeItem.ariaExpanded = "true";
          }

          break;
        }
        // TODO: typeahead
        default: {
          console.log(event.key);
        }
      }
    });
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

function handleTreeItemClick(event) {
  const treeItem = event.currentTarget.closest('[role="treeitem"]');
  const expandable = treeItem.matches('[aria-expanded]');

  if (expandable) {
    treeItem.setAttribute(
      'aria-expanded',
      JSON.stringify(!JSON.parse(treeItem.ariaExpanded))
    );
  }

  const treeView = event.currentTarget.closest('[role="tree"]');

  for (const selected of treeView.querySelectorAll('[aria-selected="true"]')) {
    selected.ariaSelected = "false";
  }
  treeItem.ariaSelected = "true";
  treeView.querySelectorAll('[tabindex="0"]').forEach(focused => focused.tabIndex = -1);
  treeItem.tabIndex = 0;
}
