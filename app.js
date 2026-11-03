/* ---------------------------------------------------------------
   Xerous: page behaviour.
   The Discord chip reads its ID from data-user-id on #discord-status.
   Presence only appears once that account has joined the Lanyard
   server (https://discord.gg/lanyard); until then the chip stays
   hidden rather than showing a broken state.
   Everything else here is optional polish: the page reads fine
   with this file removed.
   --------------------------------------------------------------- */

const DISCORD_USER_ID = (document.getElementById('discord-status')?.dataset.userId || '').trim();

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- cursor spotlight ---------- */

  const spot = document.querySelector('.spotlight');
  if (spot && finePointer && !reduce) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.4;
    let x = targetX;
    let y = targetY;
    let running = false;

    const step = () => {
      x += (targetX - x) * 0.14;
      y += (targetY - y) * 0.14;
      spot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) {
        requestAnimationFrame(step);
      } else {
        running = false;
      }
    };

    window.addEventListener('pointermove', (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      spot.classList.add('is-on');
      if (!running) {
        running = true;
        requestAnimationFrame(step);
      }
    }, { passive: true });
  }

  /* ---------- the dotted field follows the pointer ---------- */

  if (finePointer && !reduce) {
    const root = document.documentElement;
    const body = document.body;

    window.addEventListener('pointermove', (event) => {
      root.style.setProperty('--px', `${event.clientX}px`);
      root.style.setProperty('--py', `${event.clientY}px`);
      if (!body.classList.contains('has-pointer')) body.classList.add('has-pointer');
    }, { passive: true });
  }

  /* ---------- reading progress ---------- */

  const progress = document.querySelector('.progress');
  if (progress) {
    const paint = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(doc.scrollTop / max, 1) : 0})`;
    };
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------- the glass dock arrives once the hero is behind you ---------- */

  const dock = document.getElementById('dock');
  if (dock) {
    const syncDock = () => {
      dock.classList.toggle('is-on', window.scrollY > 2);
    };
    window.addEventListener('scroll', syncDock, { passive: true });
    window.addEventListener('resize', syncDock);
    syncDock();
  }

  /* ---------- the showcase panel answers the pointer ---------- */

  if (finePointer && !reduce) {
    document.querySelectorAll('.panel').forEach((panel) => {
      panel.addEventListener('pointermove', (event) => {
        const rect = panel.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        panel.style.setProperty('--tx', (px * 1.4).toFixed(2));
        panel.style.setProperty('--ty', (-py * 1.4).toFixed(2));
      });

      panel.addEventListener('pointerleave', () => {
        panel.style.setProperty('--tx', '0');
        panel.style.setProperty('--ty', '0');
      });
    });
  }

  /* ---------- the globe leans toward the cursor ---------- */

  const stage = document.querySelector('.stage');
  const tilt = document.querySelector('.tilt');
  if (stage && tilt && finePointer && !reduce) {
    stage.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tilt.style.transform = `rotateY(${(px * 18).toFixed(2)}deg) rotateX(${(-py * 18).toFixed(2)}deg)`;
    });

    stage.addEventListener('pointerleave', () => {
      tilt.style.transform = '';
    });
  }

  /* ---------- buttons give slightly under the cursor ---------- */

  if (finePointer && !reduce) {
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('pointermove', (event) => {
        const rect = btn.getBoundingClientRect();
        const mx = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const my = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        btn.style.setProperty('--mx', mx.toFixed(3));
        btn.style.setProperty('--my', my.toFixed(3));
      });

      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--mx', '0');
        btn.style.setProperty('--my', '0');
      });
    });
  }

  /* ---------- sections arrive as you reach them ---------- */

  const revealables = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('is-in'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach((el) => observer.observe(el));
  }

  /* ---------- Discord presence ---------- */

  const STATUS_LABEL = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do not disturb',
    offline: 'Offline'
  };

  const ACTIVITY_VERB = {
    0: 'Playing',
    1: 'Streaming',
    2: 'Listening to',
    3: 'Watching',
    5: 'Competing in'
  };

  const FLAGS = [
    [1, 'Staff'],
    [2, 'Partner'],
    [4, 'HypeSquad Events'],
    [8, 'Bug Hunter'],
    [64, 'HypeSquad Bravery'],
    [128, 'HypeSquad Brilliance'],
    [256, 'HypeSquad Balance'],
    [512, 'Early Supporter'],
    [16384, 'Bug Hunter Gold'],
    [131072, 'Early Developer'],
    [262144, 'Moderator Alumni'],
    [524288, 'Active Developer']
  ];

  const statusEl = document.getElementById('discord-status');
  const badgesEl = document.getElementById('discord-badges');
  const presenceEl = document.getElementById('presence');
  const panelEl = document.getElementById('presence-panel');

  let ticks = [];
  let ticker = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* 1:05:09 style, dropping the hour part when there is none */
  function clock(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  function spoken(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${total}s`;
  }

  function avatarUrl(user) {
    if (!user || !user.avatar) return '';
    const ext = String(user.avatar).startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=80`;
  }

  function runTicks() {
    ticks.forEach((fn) => fn());
  }

  function startTicks() {
    if (ticker) return;
    runTicks();
    ticker = setInterval(runTicks, 1000);
  }

  function stopTicks() {
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  /* a song or a video runs between two times, so it gets a bar instead of a clock */
  function addProgress(item, start, end) {
    const bar = el('div', 'presence__bar');
    const fill = el('span', 'presence__fill');
    bar.append(fill);

    const times = el('p', 'presence__times');
    const elapsedEl = el('span');
    const totalEl = el('span');
    times.append(elapsedEl, totalEl);
    item.append(bar, times);

    ticks.push(() => {
      const now = Date.now();
      const total = Math.max(1, end - start);
      const done = Math.min(total, Math.max(0, now - start));
      fill.style.width = `${(done / total) * 100}%`;
      elapsedEl.textContent = clock(done / 1000);
      totalEl.textContent = clock(total / 1000);
    });
  }

  function buildPanel(data) {
    if (!panelEl) return;

    ticks = [];
    const user = data.discord_user || {};
    const state = data.discord_status || 'offline';

    const head = el('div', 'presence__head');
    const portrait = avatarUrl(user);
    if (portrait) {
      const img = document.createElement('img');
      img.className = 'presence__avatar';
      img.src = portrait;
      img.alt = '';
      img.width = 42;
      img.height = 42;
      img.loading = 'lazy';
      head.append(img);
    }

    const who = el('div', 'presence__id');
    who.append(el('p', 'presence__name', user.global_name || user.username || 'Discord'));
    const stateRow = el('p', 'presence__state');
    stateRow.dataset.state = state;
    stateRow.append(el('span', 'presence__dot'), document.createTextNode(STATUS_LABEL[state] || 'Discord'));
    who.append(stateRow);
    head.append(who);

    const list = el('ul', 'presence__list');
    const spotify = data.listening_to_spotify && data.spotify ? data.spotify : null;

    if (spotify && spotify.song) {
      const item = el('li', 'presence__item');
      item.append(el('p', 'presence__kicker', 'Listening to Spotify'));
      item.append(el('p', 'presence__title', spotify.song));
      const meta = [spotify.artist, spotify.album].filter(Boolean).join(' \u00b7 ');
      if (meta) item.append(el('p', 'presence__meta', meta));

      const start = spotify.timestamps && spotify.timestamps.start;
      const end = spotify.timestamps && spotify.timestamps.end;
      if (start && end) addProgress(item, start, end);

      list.append(item);
    }

    (data.activities || [])
      .filter((a) => a.type in ACTIVITY_VERB && !(spotify && a.name === 'Spotify'))
      .slice(0, 2)
      .forEach((a) => {
        /* music and video apps put the track in details and the artist in state,
           so the track becomes the headline and the app moves into the meta line */
        const media = (a.type === 2 || a.type === 3) && a.details;
        const item = el('li', 'presence__item');
        item.append(el('p', 'presence__kicker', media ? `${ACTIVITY_VERB[a.type]} ${a.name}` : ACTIVITY_VERB[a.type]));
        item.append(el('p', 'presence__title', media ? a.details : a.name));

        const metaParts = media ? [a.state] : [a.details, a.state];
        const meta = metaParts.filter((part, i) => part && metaParts.indexOf(part) === i).join(' \u00b7 ');
        if (meta) item.append(el('p', 'presence__meta', meta));

        const start = a.timestamps && a.timestamps.start;
        const end = a.timestamps && a.timestamps.end;
        if (media && start && end) {
          addProgress(item, start, end);
        } else if (start) {
          const timeEl = el('p', 'presence__times');
          item.append(timeEl);
          ticks.push(() => {
            timeEl.textContent = `for ${spoken((Date.now() - start) / 1000)}`;
          });
        }

        list.append(item);
      });

    if (!list.children.length) {
      list.append(el('li', 'presence__empty', 'Nothing open right now'));
    }

    panelEl.replaceChildren(head, list);
    panelEl.hidden = false;

    if (ticker) runTicks();
  }

  /* keeps the card on screen when the window is narrower than chip + card */
  function placePanel() {
    if (!panelEl || panelEl.hidden) return;
    panelEl.style.left = '';
    const rect = panelEl.getBoundingClientRect();
    const gutter = 12;
    const overflow = rect.right - (document.documentElement.clientWidth - gutter);
    if (overflow > 0) {
      panelEl.style.left = `${-Math.max(overflow, rect.left - gutter)}px`;
    }
  }

  if (presenceEl) {
    presenceEl.addEventListener('mouseenter', () => {
      placePanel();
      startTicks();
    });
    presenceEl.addEventListener('mouseleave', stopTicks);
    presenceEl.addEventListener('focusin', () => {
      placePanel();
      startTicks();
    });
    presenceEl.addEventListener('focusout', stopTicks);
    window.addEventListener('resize', placePanel);
  }

  function paint(data) {
    if (!statusEl) return;

    const state = data.discord_status || 'offline';
    statusEl.dataset.state = state;
    statusEl.querySelector('.status__label').textContent = STATUS_LABEL[state] || 'Discord';

    const activityEl = statusEl.querySelector('.status__activity');
    const spotify = data.listening_to_spotify && data.spotify ? data.spotify : null;
    const activity = (data.activities || []).find(
      (a) => a.type in ACTIVITY_VERB && a.name !== 'Spotify'
    );
    if (spotify && spotify.song) {
      activityEl.textContent = `Listening to ${spotify.song}`;
    } else if (activity) {
      activityEl.textContent = `${ACTIVITY_VERB[activity.type]} ${activity.name}`;
    }

    statusEl.href = `https://discord.com/users/${DISCORD_USER_ID}`;
    statusEl.target = '_blank';
    statusEl.rel = 'noopener noreferrer';
    statusEl.classList.remove('is-hidden');

    const flags = (data.discord_user && data.discord_user.public_flags) || 0;
    const owned = FLAGS.filter(([bit]) => (flags & bit) === bit).map(([, name]) => name);

    if (owned.length && badgesEl) {
      badgesEl.replaceChildren(...owned.map((name) => {
        const item = document.createElement('li');
        item.className = 'badge';
        item.textContent = name;
        return item;
      }));
      badgesEl.hidden = false;
    }

    buildPanel(data);
  }

  async function loadPresence() {
    if (!DISCORD_USER_ID) return;
    try {
      const response = await fetch(
        `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`,
        { cache: 'no-store' }
      );
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.success && payload.data) paint(payload.data);
    } catch (error) {
      /* offline or blocked: the chip stays hidden rather than showing a broken state */
    }
  }

  loadPresence();
  setInterval(() => {
    if (!document.hidden) loadPresence();
  }, 60000);
})();
