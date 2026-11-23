import {icon} from './icons';
import './workspaceControls.css';

let nextList = 0;

function bindSelect(select: HTMLSelectElement) {
  if (select.multiple || select.size > 1 || select.dataset.workspaceNative !== undefined) return;
  const trigger = document.createElement('button');
  const list = document.createElement('div');
  const caption = document.createElement('span');
  const listId = 'workspace-choices-' + ++nextList;
  const label = select.getAttribute('aria-label') ??
    [...(select.labels ?? [])].map(item => {
      const labelCopy = item.cloneNode(true) as HTMLLabelElement;
      labelCopy.querySelectorAll('select, input, button, output, [aria-hidden=true]').forEach(child => child.remove());
      return labelCopy.textContent?.trim();
    }).filter(Boolean).join(' ');
  trigger.type = 'button';
  trigger.className = 'workspace-choice';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-controls', listId);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.append(caption);
  trigger.insertAdjacentHTML('beforeend', icon('down'));
  list.id = listId;
  list.className = 'workspace-options';
  list.setAttribute('role', 'listbox');
  list.setAttribute('popover', 'auto');
  select.after(trigger, list);
  select.classList.add('workspace-choice-source');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  let active = -1;
  let prefix = '';
  let prefixTimer = 0;
  const options = () => [...select.options];
  const usable = (option: HTMLOptionElement) => !option.disabled && !option.hidden &&
    !option.closest('optgroup[disabled], optgroup[hidden]');
  const opened = () => list.matches(':popover-open');
  const sync = () => {
    const value = select.selectedOptions[0]?.label ?? '選択してください';
    caption.textContent = value;
    trigger.setAttribute('aria-label', label ? label + ' ' + value : value);
    trigger.disabled = select.matches(':disabled');
    trigger.hidden = select.hidden;
    if (opened() && (trigger.disabled || trigger.hidden)) list.hidePopover();
  };
  const highlight = (index: number) => {
    const previous = list.querySelector('.active');
    previous?.classList.remove('active');
    active = index;
    const item = document.getElementById(listId + '-' + index);
    if (!item) {
      trigger.removeAttribute('aria-activedescendant');
      return;
    }
    item.classList.add('active');
    trigger.setAttribute('aria-activedescendant', item.id);
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
  };
  const choose = (index: number) => {
    const option = options()[index];
    if (!option || !usable(option)) return;
    list.hidePopover();
    trigger.focus({preventScroll: true});
    if (index === select.selectedIndex) return;
    select.selectedIndex = index;
    select.dispatchEvent(new Event('input', {bubbles: true}));
    select.dispatchEvent(new Event('change', {bubbles: true}));
    sync();
  };
  const populate = () => {
    list.replaceChildren(...options().flatMap((option, index) => {
      if (option.hidden || option.closest('optgroup[hidden]')) return [];
      const item = document.createElement('div');
      item.id = listId + '-' + index;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      item.setAttribute('aria-disabled', String(!usable(option)));
      item.textContent = option.label;
      item.onpointerdown = event => { if (event.pointerType === 'mouse') event.preventDefault(); };
      item.onclick = () => choose(index);
      return [item];
    }));
  };
  const position = () => {
    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const right = left + (viewport?.width ?? innerWidth);
    const bottom = top + (viewport?.height ?? innerHeight);
    const below = bottom - rect.bottom - 8;
    const above = rect.top - top - 8;
    const upwards = below < 220 && above > below;
    const width = Math.min(right - left - 16, Math.max(rect.width, 190));
    list.style.width = width + 'px';
    list.style.left = Math.max(left + 8, Math.min(rect.left, right - width - 8)) + 'px';
    list.style.maxHeight = Math.max(32, upwards ? above : below) + 'px';
    list.style.top = (upwards ? Math.max(top + 8, rect.top - list.offsetHeight - 4) : rect.bottom + 4) + 'px';
  };
  const open = () => {
    sync();
    if (trigger.disabled) return;
    populate();
    list.showPopover();
    position();
    trigger.setAttribute('aria-expanded', 'true');
    const choices = options();
    highlight(choices[select.selectedIndex] && usable(choices[select.selectedIndex]!)
      ? select.selectedIndex : choices.findIndex(usable));
  };
  trigger.onclick = () => opened() ? list.hidePopover() : open();
  list.addEventListener('beforetoggle', event => {
    if ((event as ToggleEvent).newState === 'closed') {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
    }
  });
  trigger.addEventListener('focusout', event => {
    if (opened() && event.relatedTarget instanceof Node && !list.contains(event.relatedTarget)) list.hidePopover();
  });
  trigger.onkeydown = event => {
    const choices = options();
    const indices = choices.flatMap((choice, index) => usable(choice) ? [index] : []);
    if (!indices.length) return;
    const key = event.key;
    if (key === 'Escape' && opened()) {
      event.preventDefault();
      list.hidePopover();
      return;
    }
    if (key === 'Tab') {
      if (opened()) list.hidePopover();
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (opened()) choose(active); else open();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(key)) {
      event.preventDefault();
      const wasOpen = opened();
      if (!wasOpen) open();
      if (!wasOpen && (key === 'ArrowUp' || key === 'ArrowDown')) return;
      const index = indices.indexOf(active);
      const step = key === 'ArrowUp' ? -1 : key === 'PageUp' ? -5 : key === 'PageDown' ? 5 : 1;
      highlight(key === 'Home' ? indices[0]! : key === 'End' ? indices.at(-1)! :
        indices[Math.max(0, Math.min(indices.length - 1, index + step))]!);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
      prefix += key.toLocaleLowerCase();
      clearTimeout(prefixTimer);
      prefixTimer = window.setTimeout(() => { prefix = ''; }, 650);
      const match = indices.find(index => choices[index]!.label.toLocaleLowerCase().startsWith(prefix));
      if (match !== undefined) {
        event.preventDefault();
        if (!opened()) open();
        highlight(match);
      }
    }
  };
  new MutationObserver(() => {
    sync();
    if (opened()) {
      populate();
      position();
      highlight(select.selectedIndex);
    }
  }).observe(select, {subtree: true, childList: true, characterData: true, attributes: true});
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => queueMicrotask(sync));
  // Existing panels also assign values without dispatching a change event.
  for (const name of ['value', 'selectedIndex'] as const) {
    const property = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, name)!;
    Object.defineProperty(select, name, {
      configurable: true,
      get() { return property.get!.call(this); },
      set(value: string | number) { property.set!.call(this, value); sync(); },
    });
  }
  sync();
}

let nextRange = 0;

function bindRange(range: HTMLInputElement) {
  const parent = range.parentElement;
  if (!parent || parent.querySelectorAll('input[type=range]').length !== 1) return;

  const implicit = parent instanceof HTMLLabelElement;
  const labelText = implicit ? [...parent.childNodes].filter(node => node.nodeType === Node.TEXT_NODE) : [];
  const caption = implicit ? document.createElement('label') : parent.querySelector('label') ?? document.createElement('label');
  const name = (implicit ? labelText.map(node => node.textContent).join('').trim() : caption.textContent?.trim())
    || range.getAttribute('aria-label') || '数値';
  caption.textContent = name;
  range.id ||= 'workspace-slider-' + ++nextRange;
  caption.htmlFor = range.id;

  // A label may only label one control. Keep the caption separate from the
  // number field and step buttons even when the original label wrapped the bar.
  let row = parent;
  if (implicit) {
    row = document.createElement('div');
    for (const {name, value} of parent.attributes) row.setAttribute(name, value);
    row.classList.add('workspace-range-from-label');
    labelText.forEach(node => node.remove());
    row.append(...parent.childNodes);
    parent.replaceWith(row);
  }

  const existing = row.querySelector<HTMLInputElement>('input[type=number]');
  const number = existing ?? document.createElement('input');
  if (!existing) {
    number.type = 'number';
    number.setAttribute('aria-label', name + 'の数値');
  }
  if (!number.inputMode) number.inputMode = 'decimal';

  const header = document.createElement('div');
  header.className = 'workspace-range-header';
  const valueField = document.createElement('div');
  valueField.className = 'workspace-range-value';
  valueField.append(number);
  if (range.dataset.unit) {
    const unit = document.createElement('span');
    unit.textContent = range.dataset.unit;
    unit.setAttribute('aria-hidden', 'true');
    valueField.append(unit);
  }
  header.append(caption, valueField);
  row.prepend(header);
  row.classList.add('workspace-range');

  const commitRange = () => {
    range.dispatchEvent(new Event('input', {bubbles: true}));
    range.dispatchEvent(new Event('change', {bubbles: true}));
    sync();
  };
  const steps = [-1, 1].map(direction => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = direction < 0 ? 'workspace-range-minus' : 'workspace-range-plus';
    button.textContent = direction < 0 ? '−' : '+';
    button.setAttribute('aria-label', name + (direction < 0 ? 'を減らす' : 'を増やす'));
    button.onclick = () => {
      if (existing && range.id === 'size') {
        if (!number.value) number.value = range.value;
        const step = +(number.step || range.step || 1);
        const delta = step && step < 1 ? (Number.isInteger(1 / step) ? 1 : step) : step || 1;
        const value = Math.min(number.max ? +number.max : Infinity,
          Math.max(number.min ? +number.min : -Infinity, +number.value + direction * delta));
        number.value = String(Number(value.toFixed(7)));
        number.dispatchEvent(new Event('change', {bubbles: true}));
      } else {
        const step = Number(range.step) || 1;
        range.value = String(Number((range.valueAsNumber + step * direction).toFixed(7)));
        commitRange();
      }
    };
    range.insertAdjacentElement(direction < 0 ? 'beforebegin' : 'afterend', button);
    return button;
  });
  const sync = () => {
    if (!existing) {
      if (number.min !== range.min) number.min = range.min;
      if (number.max !== range.max) number.max = range.max;
      if (number.step !== range.step) number.step = range.step;
      if (document.activeElement !== number) number.value = range.value;
    }
    if (number.disabled !== range.disabled) number.disabled = range.disabled;
    for (const button of steps) if (button.disabled !== range.disabled) button.disabled = range.disabled;
  };
  if (!existing) {
    number.onchange = () => {
      if (Number.isFinite(number.valueAsNumber)) {
        range.value = number.value;
        commitRange();
      }
      number.value = range.value;
    };
    number.addEventListener('blur', sync);
    const property = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!;
    Object.defineProperty(range, 'value', {
      configurable: true,
      get() { return property.get!.call(this); },
      set(value: string) { property.set!.call(this, value); sync(); },
    });
  }
  number.addEventListener('keydown', event => {
    if (event.isComposing || (event.key !== 'Enter' && event.key !== 'Escape')) return;
    // Existing numeric editors may already commit, cancel, or show an error.
    event.stopPropagation();
    if (event.defaultPrevented) return;
    event.preventDefault();
    if (event.key === 'Escape' && range.id !== 'size') number.value = range.value;
    number.blur();
  });
  range.addEventListener('input', sync);
  new MutationObserver(sync).observe(range, {attributes: true, attributeFilter: ['min', 'max', 'step', 'disabled', 'value']});
  sync();
}

export function installWorkspaceControls() {
  window.addEventListener('resize', () =>
    document.querySelector<HTMLElement>('.workspace-options:popover-open')?.hidePopover());
  const bound = new WeakSet<Element>();
  const selector = 'select,input[type=range]';
  const visit = (element: Element) => {
    if (bound.has(element)) return;
    bound.add(element);
    if (element instanceof HTMLSelectElement) bindSelect(element);
    else if (element instanceof HTMLInputElement) bindRange(element);
  };
  document.querySelectorAll(selector).forEach(visit);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(selector)) visit(node);
      node.querySelectorAll(selector).forEach(visit);
    }
  }).observe(document.body, {childList: true, subtree: true});
}
