/* EINSATZDIALOG 0.11 · Layoutdarstellung aus Supabase.
   Keine Passwörter und keine Adminrechte im Browser-Script. */
(() => {
  'use strict';
  const pub = window.EINSATZDIALOG_PUBLIC_CONFIG || {};
  const url = String(pub.url || '').trim().replace(/\/+$/, '');
  const key = String(pub.publishableKey || '').trim();
  const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && /^sb_publishable_[a-z0-9_-]+$/i.test(key);
  const DEFAULT_ORDER = ['organization','difficulty','trainingMode','topics','engineInfo','focus','actions'];
  let layout = null;
  let observer = null;
  let queued = false;
  const safe = raw => {
    const h = raw?.home && typeof raw.home === 'object' ? raw.home : {};
    const order = [...new Set([
      ...(Array.isArray(h.order) ? h.order.filter(id => DEFAULT_ORDER.includes(id)) : []),
      ...DEFAULT_ORDER
    ])];
    return {
      order,
      topicStyle: h.topicStyle === 'accordion' ? 'accordion' : 'tiles',
      topicMaxHeight: Number.isFinite(Number(h.topicMaxHeight))
        ? Math.max(160, Math.min(480, Number(h.topicMaxHeight))) : 280,
      organizationStyle: h.organizationStyle === 'list' ? 'list' : 'grid',
      spacing: h.spacing === 'compact' ? 'compact' : 'comfortable'
    };
  };
  function isSetup(content) {
    // Only the training selection page. The live simulation is never touched.
    const eyebrow = content.querySelector(':scope > .intro-header .eyebrow');
    return !!eyebrow && eyebrow.textContent.includes('TRAINING');
  }
  function topicAccordion(group, height) {
    const options = group?.querySelector('.topic-options');
    if (!options) return;
    const chosen = options.querySelector('.topic-option.selected .topic-option-title');
    const name = chosen?.firstChild?.textContent?.trim() || 'Thema auswählen';
    const details = document.createElement('details');
    details.className = 'ed-topic-details';
    const summary = document.createElement('summary');
    const text = document.createElement('span');
    const heading = document.createElement('span');
    heading.textContent = 'Kommunikationsthema auswählen';
    const selected = document.createElement('span');
    selected.className = 'ed-topic-selected';
    selected.textContent = 'Aktuell: ' + name;
    text.append(heading, selected);
    summary.append(text);
    const scroll = document.createElement('div');
    scroll.className = 'ed-topic-scroll';
    scroll.style.maxHeight = height + 'px';
    options.parentNode.insertBefore(details, options);
    scroll.append(options);
    details.append(summary, scroll);
    // Native <details> keeps the list keyboard- and touchscreen-operable.
  }
  function apply() {
    if (!layout) return;
    const content = document.querySelector('#app .content');
    if (!content || !isSetup(content)) return;
    const sheet = content.querySelector(':scope > .sheet');
    if (!sheet || sheet.dataset.edLayoutVersion === '011') return;
    sheet.dataset.edLayoutVersion = '011'; // Prevent MutationObserver re-entry.
    const grid = [...sheet.children].find(el => el.classList.contains('grid'));
    const directGroups = [...sheet.children].filter(el => el.classList.contains('field-group'));
    const organization = directGroups.find(g => g.querySelector('.choices'));
    const topics = directGroups.find(g => g.querySelector('.topic-options')) ||
      [...sheet.children].find(el => el.classList.contains('callout') && el.classList.contains('warm'));
    const sides = grid ? [...grid.children] : [];
    const info = [...sheet.children].find(el => el.classList.contains('callout') && el !== topics);
    const focus = [...sheet.children].find(el => el.classList.contains('softbox'));
    const actions = [...sheet.children].find(el => el.classList.contains('actions'));
    const map = {
      organization,
      difficulty: sides[0],
      trainingMode: sides[1],
      topics,
      engineInfo: info,
      focus,
      actions
    };
    // Save unknown elements instead of silently deleting future app features.
    const recognized = new Set([...Object.values(map).filter(Boolean), grid]);
    const extra = [...sheet.children].filter(el => !recognized.has(el));
    for (const element of Object.values(map).filter(Boolean)) {
      element.classList.add('ed-layout-section');
    }
    if (grid) grid.remove();
    sheet.replaceChildren();
    for (const id of layout.order) {
      const node = map[id];
      if (node) sheet.append(node);
    }
    for (const el of extra) sheet.append(el);
    sheet.classList.add('ed-arranged-home');
    sheet.classList.toggle('ed-spacing-compact', layout.spacing === 'compact');
    sheet.classList.toggle('ed-topic-accordion', layout.topicStyle === 'accordion');
    sheet.classList.toggle('ed-organization-list', layout.organizationStyle === 'list');
    if (layout.topicStyle === 'accordion' && topics?.querySelector('.topic-options')) {
      topicAccordion(topics, layout.topicMaxHeight);
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; apply(); });
  }
  function attach() {
    const root = document.getElementById('app');
    if (!root) return;
    observer?.disconnect();
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    schedule();
  }
  async function fetchLayout() {
    if (!valid) return;
    try {
      const r = await fetch(url + '/rest/v1/site_layout?select=config&id=eq.public&limit=1', {
        cache: 'no-store',
        headers: { apikey: key, Accept: 'application/json' }
      });
      if (!r.ok) throw Error('HTTP ' + r.status);
      const rows = await r.json();
      if (!rows?.[0]?.config) return;
      layout = safe(rows[0].config);
      schedule();
    } catch (err) {
      console.warn('EINSATZDIALOG: Layout-Einstellungen konnten nicht geladen werden.', err.message);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
  else attach();
  fetchLayout();
})();
