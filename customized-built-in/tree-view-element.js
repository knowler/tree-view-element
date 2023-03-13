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

    this.setAttribute("role", "tree");

    let treeItemId = 0;
    for (const listItem of this.querySelectorAll("li")) {
      listItem.setAttribute("role", "treeitem");
      listItem.tabIndex = treeItemId === 0 ? 0 : -1;
      listItem.id = `tree-view-item-${treeItemId++}`;
      listItem.setAttribute("aria-selected", "false");

      const nestedList = listItem.querySelector(":scope > ul");
      if (nestedList) {
        nestedList.setAttribute("role", "group");
        listItem.setAttribute("aria-expanded", "false");
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
          if (treeItem.getAttribute("aria-expanded") === "false") {
            treeItem.setAttribute("aria-expanded", "true");
            break;
          } else if (treeItem.getAttribute("aria-expanded") === "true") {
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
          if (treeItem.getAttribute("aria-expanded") === "true") {
            treeItem.setAttribute("aria-expanded", "false");
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
          if (treeItem.getAttribute("aria-selected") === "false") {
            treeItem.closest('[role="tree"]')
              .querySelectorAll('[role="treeitem"][aria-selected="true"]')
              .forEach(selectedTreeItem => selectedTreeItem.setAttribute("aria-selected", "false"));
          }
          treeItem.setAttribute(
            "aria-selected",
            JSON.stringify(
              !JSON.parse(treeItem.getAttribute("aria-selected")),
            ),
          );
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
            expandableTreeItem.setAttribute("aria-expanded", "true");
          }

          break;
        }
        // TODO: typeahead should maybe keep track that it’s in that
        // mode and keep on going down the list of items with that
        // character instead of just the first two.
        default: {
          // Case-insensitive check for letter key
          if (/^[a-z]{1}$/i.test(event.key)) {
            console.log(event.key);
            // get all of the focusable elements
            for (const focusableTreeItem of this.#focusableTreeItems) {
              // Get the label from exandable ones, otherwise the label
              // is the tree item text content.
              const label = focusableTreeItem.matches('[aria-expanded]')
                ? focusableTreeItem.querySelector(':scope > :first-child')?.textContent
                : focusableTreeItem.textContent;

              const [firstLetter] = label;

              if (firstLetter === event.key && focusableTreeItem.tabIndex === -1) {
                this.querySelector('[tabindex="0"]').tabIndex = -1;
                focusableTreeItem.tabIndex = 0;
                focusableTreeItem.focus();
                break;
              }
            }
          }
        }
      }
    });
  }
  disconnectedCallback() {
    this.#controller.abort();
  }

  static define() {
    if (!window.customElements.get("tree-view")) {
      window.TreeViewElement = TreeViewElement;
      window.customElements.define("tree-view", TreeViewElement, { extends: "ul" });
    }
  }
}

function handleTreeItemClick(event) {
  const treeItem = event.currentTarget.closest('[role="treeitem"]');
  const expandable = treeItem.matches('[aria-expanded]');

  if (expandable) {
    treeItem.setAttribute(
      'aria-expanded',
      JSON.stringify(!JSON.parse(treeItem.getAttribute("aria-expanded")))
    );
  }

  const treeView = event.currentTarget.closest('[role="tree"]');

  for (const selected of treeView.querySelectorAll('[aria-selected="true"]')) {
    selected.setAttribute("aria-selected", "false");
  }
  treeItem.setAttribute("aria-selected", "true");
  treeView.querySelectorAll('[tabindex="0"]').forEach(focused => focused.tabIndex = -1);
  treeItem.tabIndex = 0;
}
