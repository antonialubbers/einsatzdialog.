/* EINSATZDIALOG 0.11 · Geschützter Layout-Editor */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SESSION = 'ed_supa_session_v1';
  const CFG = 'ed_supa_pub_config_v1';
  const IDS = ['organization', 'difficulty', 'trainingMode', 'topics', 'engineInfo', 'focus', 'actions'];
  const LABELS = {
    organization: ['Einsatzorganisation', 'Feuerwehr, Rettungsdienst, THW, Polizei'],
    difficulty: ['Schwierigkeit', 'Stufen 1 bis 5'],
    trainingMode: ['Trainingsart', 'Themenwahl oder Überraschungsfall'],
    topics: ['Kommunikationsthema', 'Die neun Themenfelder'],
    engineInfo: ['Hinweis zur KI', 'Cloud-KI oder Offline-Modus'],
    focus: ['Persönlicher Schwerpunkt', 'Wird bei Bedarf eingeblendet'],
    actions: ['Start-Schaltflächen', 'Training starten und Fachwissen ansehen']
  };
  const INITIAL = { version: 1, home: { order: [...IDS], topicStyle: 'tiles', topicMaxHeight: 280, organizationStyle: 'grid', spacing: 'comfortable' } };
  const LESSONS = ['Grundlagen der Einsatzkommunikation','Psychologie im Einsatz','Akute Belastungsreaktionen','Suizidale Krisen','Tod und Trauer','Deeskalation','Vertraulichkeit','Kinder & Jugendliche','Übergabe & Grenzen'];
  let data = null, original = null, token = '', saving = false, dragged = null;
  const json = value => { try { return JSON.parse(value); } catch { return null; } };
  const stored = json(localStorage.getItem(CFG)) || {};
  const pub = window.EINSATZDIALOG_PUBLIC_CONFIG || {};
  const url = String(stored.url || pub.url || '').trim().replace(/\/+$/, '');
  const key = String(stored.key || pub.publishableKey || '').trim();
  const deepClone = obj => JSON.parse(JSON.stringify(obj));
  function normalize(raw) {
    const h = raw?.home && typeof raw.home === 'object' ? raw.home : {};
    const from = Array.isArray(h.order) ? h.order : [];
    const order = [...new Set([...from.filter(id => IDS.includes(id)), ...IDS])];
    const height = Number(h.topicMaxHeight);
    return {
      version: 1,
      home: {
        order,
        topicStyle: h.topicStyle === 'accordion' ? 'accordion' : 'tiles',
        topicMaxHeight: Number.isFinite(height) ? Math.max(160, Math.min(480, Math.round(height / 20) * 20)) : 280,
        organizationStyle: h.organizationStyle === 'list' ? 'list' : 'grid',
        spacing: h.spacing === 'compact' ? 'compact' : 'comfortable'
      }
    };
  }
  async function api(route, init = {}, retry = true) {
    const headers = { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(init.headers || {}) };
    const resp = await fetch(url + route, { ...init, headers });
    if (resp.status === 401 && retry) {
      const session = json(sessionStorage.getItem(SESSION));
      if (session?.refresh_token) {
        const refresh = await fetch(url + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: { apikey: key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: session.refresh_token })
        });
        if (refresh.ok) {
          const s = await refresh.json();
          sessionStorage.setItem(SESSION, JSON.stringify(s));
          token = s.access_token;
          return api(route, init, false);
        }
      }
    }
    const result = await resp.json().catch(() => null);
    if (!resp.ok) throw Error(result?.message || result?.error_description || ('HTTP ' + resp.status));
    return result;
  }
  function notify(msg, error = false) {
    const el = $('message');
    el.textContent = msg;
    el.className = 'message' + (error ? ' error' : '');
    el.hidden = false;
  }
  function swap(id, delta) {
    const order = data.home.order;
    const a = order.indexOf(id), b = a + delta;
    if (b < 0 || b >= order.length) return;
    [order[a], order[b]] = [order[b], order[a]];
    paint();
  }
  function paintBlocks() {
    const container = $('blocks');
    container.replaceChildren();
    for (const [i, id] of data.home.order.entries()) {
      const row = document.createElement('div');
      row.className = 'block';
      row.draggable = true;
      row.dataset.block = id;
      const handle = document.createElement('span');
      handle.className = 'handle';
      handle.textContent = '⠿';
      handle.setAttribute('aria-label', 'Baustein verschieben');
      const name = document.createElement('div');
      name.className = 'block-name';
      const strong = document.createElement('strong');
      strong.textContent = LABELS[id][0];
      const small = document.createElement('small');
      small.textContent = LABELS[id][1];
      name.append(strong, small);
      const arrows = document.createElement('div');
      arrows.className = 'arrows';
      for (const [symbol, delta, label] of [['↑', -1, 'nach oben'], ['↓', 1, 'nach unten']]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = symbol;
        b.disabled = delta === -1 ? i === 0 : i === data.home.order.length - 1;
        b.setAttribute('aria-label', LABELS[id][0] + ' ' + label);
        b.addEventListener('click', () => swap(id, delta));
        arrows.append(b);
      }
      row.addEventListener('dragstart', e => {
        dragged = id;
        e.dataTransfer?.setData('text/plain', id);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => { dragged = null; row.classList.remove('dragging'); });
      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drop-target'); });
      row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        const source = dragged || e.dataTransfer?.getData('text/plain');
        const from = data.home.order.indexOf(source), to = data.home.order.indexOf(id);
        if (from < 0 || to < 0 || from === to) { row.classList.remove('drop-target'); return; }
        data.home.order.splice(from, 1);
        data.home.order.splice(to, 0, source);
        dragged = null;
        paint();
      });
      row.append(handle, name, arrows);
      container.append(row);
    }
  }
  function mockSection(id) {
    const box = document.createElement('section');
    box.className = 'mock-block';
    const title = document.createElement('h3');
    title.textContent = LABELS[id][0];
    box.append(title);
    if (id === 'topics') {
      if (data.home.topicStyle === 'accordion') {
        const details = document.createElement('details');
        details.className = 'mock-details';
        details.open = true;
        const summary = document.createElement('summary');
        summary.textContent = 'Grundlagen der Einsatzkommunikation';
        const scroller = document.createElement('div');
        scroller.className = 'mock-scroll';
        scroller.style.maxHeight = data.home.topicMaxHeight + 'px';
        for (const label of LESSONS) { const row = document.createElement('span'); row.textContent = label; scroller.append(row); }
        details.append(summary, scroller); box.append(details);
      } else {
        const tiles = document.createElement('div');
        tiles.className = 'mock-pills';
        for (const label of LESSONS) { const t = document.createElement('span'); t.className = 'mock-pill'; t.textContent = label; tiles.append(t); }
        box.append(tiles);
      }
    } else if (id === 'organization') {
      const pills = document.createElement('div'); pills.className = 'mock-pills';
      pills.classList.toggle('list', data.home.organizationStyle === 'list');
      for (const t of ['Feuerwehr','Rettungsdienst','THW','Polizei']) { const s=document.createElement('span'); s.className='mock-pill'; s.textContent=t; pills.append(s); }
      box.append(pills);
    } else if (id === 'difficulty') {
      const pills = document.createElement('div'); pills.className = 'mock-pills';
      pills.style.gridTemplateColumns = 'repeat(5,1fr)';
      for (let n=1;n<=5;n++) { const s=document.createElement('span');s.className='mock-pill';s.style.textAlign='center';s.textContent=n;pills.append(s); }
      box.append(pills);
    } else if (id === 'trainingMode') {
      const pills = document.createElement('div'); pills.className = 'mock-pills';
      for (const t of ['Thema auswählen','Überraschungsfall']) { const s=document.createElement('span');s.className='mock-pill';s.textContent=t;pills.append(s); }
      box.append(pills);
    } else if (id === 'actions') {
      const b = document.createElement('div'); b.className = 'mock-actions'; b.textContent = 'Fachmodule durchklicken →'; box.append(b);
    } else {
      for (let i=0;i<2;i++) { const l=document.createElement('div');l.className='mock-line'+(i?' short':'');box.append(l); }
    }
    return box;
  }
  function paintPreview() {
    const screen = $('previewBlocks');
    screen.replaceChildren();
    screen.classList.toggle('compact', data.home.spacing === 'compact');
    for (const id of data.home.order) screen.append(mockSection(id));
  }
  function paint() {
    $('topicStyle').value = data.home.topicStyle;
    $('organizationStyle').value = data.home.organizationStyle;
    $('spacing').value = data.home.spacing;
    $('maxHeight').value = data.home.topicMaxHeight;
    $('heightValue').textContent = data.home.topicMaxHeight + ' px';
    $('maxHeight').disabled = data.home.topicStyle !== 'accordion';
    paintBlocks(); paintPreview();
  }
  async function start() {
    try {
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !/^sb_publishable_[a-z0-9_-]+$/i.test(key)) {
        throw Error('Supabase ist nicht korrekt verbunden. Öffne zuerst den Administrationsbereich.');
      }
      token = json(sessionStorage.getItem(SESSION))?.access_token || '';
      if (!token) throw Error('Bitte melde dich zuerst im Administrationsbereich an.');
      const me = await api('/auth/v1/user');
      const admin = await api('/rest/v1/einsatzdialog_admins?select=user_id&user_id=eq.' + encodeURIComponent(me.id));
      if (!Array.isArray(admin) || admin.length !== 1) throw Error('Dieses Konto hat keine Adminrechte.');
      const rows = await api('/rest/v1/site_layout?select=config&id=eq.public');
      if (!Array.isArray(rows) || !rows.length) throw Error('Tabelle site_layout fehlt. Führe zunächst SETUP_LAYOUT.sql in Supabase aus.');
      original = normalize(rows[0].config);
      data = deepClone(original);
      $('loading').hidden = true;
      $('editor').hidden = false;
      paint();
    } catch (err) {
      $('loading').hidden = true;
      $('unauthorized').hidden = false;
      $('auth-error').textContent = err.message || String(err);
    }
  }
  async function save() {
    if (!data || saving) return;
    saving = true;
    $('save').disabled = true;
    try {
      const rows = await api('/rest/v1/site_layout?id=eq.public', {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ config: data, updated_at: new Date().toISOString() })
      });
      if (!Array.isArray(rows) || rows.length !== 1) throw Error('Layout konnte nicht gespeichert werden.');
      original = deepClone(data);
      notify('Layout veröffentlicht! Öffne die öffentliche EINSATZDIALOG-Webseite neu, um es zu sehen.');
    } catch (err) { notify('Speichern fehlgeschlagen: ' + (err.message || err), true); }
    finally { saving = false; $('save').disabled = false; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('topicStyle').addEventListener('change', e => { data.home.topicStyle = e.target.value; paint(); });
    $('organizationStyle').addEventListener('change', e => { data.home.organizationStyle = e.target.value; paint(); });
    $('spacing').addEventListener('change', e => { data.home.spacing = e.target.value; paint(); });
    $('maxHeight').addEventListener('input', e => { data.home.topicMaxHeight = Number(e.target.value); $('heightValue').textContent = e.target.value + ' px'; paintPreview(); });
    $('reset').addEventListener('click', () => { data = deepClone(original); paint(); notify('Nicht veröffentlichte Änderungen verworfen.'); });
    $('save').addEventListener('click', save);
    start();
  });
})();
