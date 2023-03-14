export class TreeViewElement extends HTMLUListElement {
  get #treeItems() {
    return this.querySelectorAll('[role="treeitem"]');
  }

  get #focusableTreeItems() {
    return this.querySelectorAll('[role="treeitem"]:is(:not([aria-expanded="false"] *))');
  }

  get #focusedTreeItem() {
    return this.querySelector('[role="treeitem"][tabindex="0"]');
  }

  #focusTreeItem(treeItemToFocus) {
    if (this.#focusedTreeItem) this.#focusedTreeItem.tabIndex = -1;

    treeItemToFocus.tabIndex = 0;
    treeItemToFocus.focus();
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

          if (previousFocusable) this.#focusTreeItem(previousFocusable);

          break;
        }
        case 'ArrowDown': {
          const treeItem = event.target;
          const focusable = Array.from(this.#focusableTreeItems);
          const treeItemIndex = focusable.findIndex(item => item === treeItem);
          const nextFocusable = focusable[treeItemIndex + 1];

          if (nextFocusable) this.#focusTreeItem(nextFocusable);

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
            if (firstNestedTreeItem) this.#focusTreeItem(firstNestedTreeItem);
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
            if (parentTreeItem) this.#focusTreeItem(parentTreeItem);
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
          if (firstTreeItem) this.#focusTreeItem(firstTreeItem);
          break;
        }
        case 'End': {
          const lastTreeItem = Array.from(this.#focusableTreeItems).at(-1);
          if (lastTreeItem) this.#focusTreeItem(lastTreeItem);
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
        default: {
          // Typeahead
          // Case-insensitive check for letter key
          if (/^[a-z]{1}$/i.test(event.key)) {
            const typeahead = event.key;
            const focusableTreeItems = Array.from(this.#focusableTreeItems);

            const candidates = [];
            let index = 0;
            let nextIsCandidate = false;
            for (const focusableTreeItem of focusableTreeItems) {
              const isLastItem = focusableTreeItems.length - 1 === index;

              // Get the label from exandable ones, otherwise the label
              // is the tree item text content.
              const label = focusableTreeItem.matches('[aria-expanded]')
                ? focusableTreeItem.querySelector(':scope > :first-child')?.textContent
                : focusableTreeItem.textContent;
              const matches = label.substring(0, typeahead.length).startsWith(typeahead);
              const currentIsFocused = this.#focusedTreeItem === focusableTreeItem;

              // TODO: This is kind of horrible. Refactor this.
              if (matches) {
                if (nextIsCandidate) { // We know this is the one to focus so do it (breaks)
                  this.#focusTreeItem(focusableTreeItem);
                  break;
                } else if (currentIsFocused && isLastItem && candidates.length > 0) { // If it’s the last item, then the first candidate should be focused
                  const firstCandidate = candidates[0];
                  if (firstCandidate) this.#focusTreeItem(firstCandidate);
                  break;
                } else candidates.push(focusableTreeItem);
              }

              if (currentIsFocused) nextIsCandidate = true;

              if (isLastItem) {
                const firstCandidate = candidates[0];
                if (firstCandidate) this.#focusTreeItem(firstCandidate);
                break;
              }

              index++;
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
