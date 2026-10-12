'use strict';
/* Screens and navigation. */
(function (V) {
  var root = document.getElementById('app');
  var esc = V.esc;
  var App = V.app = { screen: null, params: {}, cleanup: null };
  var Screens = {};

  App.go = function (screen, params) {
    if (App.cleanup) { try { App.cleanup(); } catch (e) { console.error(e); } App.cleanup = null; }
    App.screen = screen;
    App.params = params || {};
    document.body.dataset.screen = screen;
    window.scrollTo(0, 0);
    var cleanup = Screens[screen](App.params);
    App.cleanup = typeof cleanup === 'function' ? cleanup : null;
  };

  /* ---------- shared bits ---------- */
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.85 6.05 6.6.78-4.88 4.5 1.3 6.52L12 17.2l-5.87 3.25 1.3-6.52-4.88-4.5 6.6-.78z"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10zm2.5 0h5V7a2.5 2.5 0 0 0-5 0z"/></svg>';

  function stars(n, cls) {
    var out = '<span class="stars ' + (cls || '') + '" role="img" aria-label="' + n + ' of 3 stars">';
    for (var i = 0; i < 3; i++) out += '<span class="star' + (i < n ? ' on' : '') + '">' + STAR + '</span>';
    return out + '</span>';
  }

  function initial(name) { return esc((name || '?').trim().charAt(0).toUpperCase() || '?'); }

  function header() {
    var p = V.store.active();
    return '<header class="topbar">' +
      '<button class="wordmark" data-go="home" aria-label="Veytra home">Veytra</button>' +
      '<div class="topbar-right">' +
      '<button class="kit-pill" data-go="kit"><span class="dot" data-state="' + pillState() + '"></span><span class="kit-label">' + esc(V.input.statusLabel()) + '</span></button>' +
      (p ? '<button class="player-chip" data-go="profiles" aria-label="Switch player"><span class="avatar" style="--c:' + p.color + '">' + initial(p.name) + '</span><span class="player-chip-name">' + esc(p.name) + '</span></button>' : '') +
      '</div></header>';
  }

  function bindGo(scope) {
    V.$$('[data-go]', scope).forEach(function (b) {
      b.addEventListener('click', function () { App.go(b.dataset.go); });
    });
  }

  function pillState() { return V.input.hasKit() ? 'ready' : V.input.state === 'ready' ? 'nokit' : V.input.state; }
  function updateKitPills() {
    V.$$('.kit-pill .dot').forEach(function (d) { d.dataset.state = pillState(); });
    V.$$('.kit-label').forEach(function (l) { l.textContent = V.input.statusLabel(); });
  }

  var toastTimer = null;
  function toast(msg) {
    var t = V.$('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  App.toast = toast;

  /* ---------- Players ---------- */
  var SWATCHES = ['#FFD23F', '#FF9F1C', '#FF4F79', '#3EC6FF', '#4E7BFF', '#A06BFF', '#2ED3B7', '#B8F35A'];

  Screens.profiles = function () {
    var ps = V.store.profiles;
    var max = V.LESSONS.length * 3;
    root.innerHTML =
      '<main class="wrap profiles">' +
      '<p class="brand-big" aria-hidden="true">' + 'Veytra'.split('').map(function (ch, i) { return '<span style="--c:' + V.LANE[V.HIGHWAY_LANES[i]].color + '">' + ch + '</span>'; }).join('') + '</p>' +
      '<h1>Who’s drumming?</h1>' +
      (ps.length ? '' : '<p class="lede">Add a name for each person who’ll play. Stars and progress are saved on this device.</p>') +
      '<ul class="player-grid">' +
      ps.map(function (p) {
        return '<li><button class="player" data-id="' + p.id + '" style="--c:' + p.color + '">' +
          '<span class="avatar big">' + initial(p.name) + '</span>' +
          '<span class="player-name">' + esc(p.name) + '</span>' +
          '<span class="player-stars">' + V.store.totalStars(p.id) + ' of ' + max + ' stars</span></button>' +
          '<button class="link remove" data-remove="' + p.id + '">Remove</button></li>';
      }).join('') +
      '<li><button class="player add" data-add aria-expanded="false"><span class="avatar big plus">+</span><span class="player-name">Add a player</span></button></li>' +
      '</ul>' +
      '<form class="add-form panel" ' + (ps.length ? 'hidden' : '') + '>' +
      '<label class="field"><span>Name</span><input name="name" maxlength="16" autocomplete="off" required placeholder="e.g. Mia"></label>' +
      '<fieldset class="swatches"><legend>Colour</legend>' +
      SWATCHES.map(function (c, i) {
        return '<label class="swatch" style="--c:' + c + '"><input type="radio" name="color" value="' + c + '"' + (i === (ps.length % SWATCHES.length) ? ' checked' : '') + '><span></span></label>';
      }).join('') + '</fieldset>' +
      '<div class="row"><button type="submit" class="btn primary">Add player</button>' +
      (ps.length ? '<button type="button" class="btn ghost" data-cancel>Cancel</button>' : '') + '</div>' +
      '</form></main>';

    var form = V.$('.add-form', root);
    V.$$('.player[data-id]', root).forEach(function (b) {
      b.addEventListener('click', function () { V.store.setActive(b.dataset.id); App.go('home'); });
    });
    V.$$('[data-remove]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.armed) { V.store.removeProfile(b.dataset.remove); App.go('profiles'); return; }
        b.dataset.armed = '1';
        b.textContent = 'Tap again to remove';
        setTimeout(function () { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Remove'; } }, 3000);
      });
    });
    V.$('[data-add]', root).addEventListener('click', function () {
      form.hidden = false;
      V.$('[data-add]', root).setAttribute('aria-expanded', 'true');
      V.$('input[name=name]', form).focus();
    });
    var cancel = V.$('[data-cancel]', root);
    if (cancel) cancel.addEventListener('click', function () { form.hidden = true; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = V.$('input[name=name]', form).value.trim();
      if (!name) return;
      var color = (V.$('input[name=color]:checked', form) || {}).value || SWATCHES[0];
      V.store.addProfile(name, color);
      App.go('home');
    });
    if (!ps.length) setTimeout(function () { var i = V.$('input[name=name]', form); if (i) i.focus(); }, 50);
  };

  /* ---------- Home: the lesson map ---------- */
  function nextUp() {
    for (var i = 0; i < V.LESSONS.length; i++) {
      var l = V.LESSONS[i];
      var p = V.store.lessonProgress(l.id);
      if (V.isUnlocked(l) && (!p || p.stars < 1)) return l;
    }
    for (var j = 0; j < V.LESSONS.length; j++) {
      var q = V.store.lessonProgress(V.LESSONS[j].id);
      if (!q || q.stars < 3) return V.LESSONS[j];
    }
    return V.LESSONS[V.LESSONS.length - 1];
  }

  function kitHint() {
    if (V.input.hasKit()) return '';
    if (V.input.state === 'unsupported') {
      return '<aside class="hint panel"><p><strong>This browser can’t hear USB drum kits.</strong> You can still play every lesson with the on-screen pads. To use your kit, open Veytra in Chrome or Edge on a computer, Chromebook or Android tablet.</p></aside>';
    }
    return '<aside class="hint panel"><p>Plug your drum module into this device with a USB cable, turn it on, then connect.</p><button class="btn" data-connect>Connect kit</button></aside>';
  }

  Screens.home = function () {
    var p = V.store.active();
    if (!p) return App.go('profiles');
    var nx = nextUp();
    var max = V.LESSONS.length * 3;
    root.innerHTML = header() +
      '<main class="wrap home">' +
      '<section class="hello">' +
      '<div><h1>Ready, ' + esc(p.name) + '?</h1><p class="muted">' + V.store.totalStars() + ' of ' + max + ' stars earned</p></div>' +
      '<button class="btn primary big" data-lesson="' + nx.id + '">Play ' + esc(nx.title) + '</button>' +
      '</section>' +
      kitHint() +
      V.WORLDS.map(function (w, wi) {
        return '<section class="world" style="--wc:' + w.color + '">' +
          '<div class="world-head"><h2>' + esc(w.title) + '</h2><p>' + esc(w.blurb) + '</p></div>' +
          '<ol class="pads">' + w.lessons.map(function (l) {
            var lp = V.store.lessonProgress(l.id);
            var open = V.isUnlocked(l);
            return '<li><button class="pad' + (open ? '' : ' locked') + (l.id === nx.id ? ' next' : '') + '" data-lesson="' + l.id + '"' + (open ? '' : ' aria-disabled="true"') + '>' +
              '<span class="head"><span class="num">' + (l.index + 1) + '</span>' + (open ? '' : '<span class="lock">' + LOCK + '</span>') + '</span>' +
              '<span class="pad-title">' + esc(l.title) + '</span>' +
              stars(lp ? lp.stars : 0, 'small') + '</button></li>';
          }).join('') + '</ol></section>';
      }).join('') +
      '<section class="foot-links"><button class="btn ghost" data-go="kit">Test your kit and settings</button></section>' +
      '</main>';

    bindGo(root);
    V.$$('[data-lesson]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var l = V.lessonById(b.dataset.lesson);
        if (!V.isUnlocked(l)) { toast('Earn a star on the lesson before this one to unlock it.'); return; }
        App.go('lesson', { id: l.id });
      });
    });
    var c = V.$('[data-connect]', root);
    if (c) c.addEventListener('click', function () {
      V.input.connectMidi().then(function () {
        if (V.input.hasKit()) { toast('Connected to ' + V.input.devices[0]); App.go('home'); }
        else if (V.input.state === 'ready') toast('No kit found. Check the USB cable and that the module is switched on.');
        else if (V.input.state === 'denied') toast('MIDI access was blocked. Allow it in the browser’s site settings.');
      });
    });
  };

  /* ---------- Lesson intro ---------- */
  var PATTERN_NAMES = { A: 'Main beat', B: 'Part two', groove: 'Groove', crash: 'Crash bar', fill: 'Fill', fill16: 'Big fill', end: 'Last hit', ride: 'Ride groove', rideCrash: 'Ride with crash' };
  function countLabels(steps) {
    var per = steps / 4;
    var sub = { 1: [''], 2: ['', '&'], 3: ['', 'trip', 'let'], 4: ['', 'e', '&', 'a'] }[per] || null;
    var out = [];
    for (var i = 0; i < steps; i++) {
      if (!sub) { out.push(String(i + 1)); continue; }
      var k = i % per;
      out.push(k === 0 ? String(i / per + 1) : sub[k]);
    }
    return out;
  }

  function gridHtml(name, pat) {
    var lanes = V.LANES.filter(function (l) { return pat[l]; });
    var steps = String(pat[lanes[0]]).replace(/[\s|]/g, '').length;
    var per = steps / 4;
    var html = '<figure class="grid-fig"><figcaption>' + esc(PATTERN_NAMES[name] || name) + '</figcaption>' +
      '<div class="grid" style="--steps:' + steps + '">';
    lanes.forEach(function (l) {
      var s = String(pat[l]).replace(/[\s|]/g, '');
      html += '<span class="grid-label" style="--c:' + V.LANE[l].color + '">' + V.LANE[l].name + '</span>';
      for (var i = 0; i < steps; i++) {
        var ch = s[i];
        var on = ch && ch !== '-' && ch !== '.';
        html += '<span class="cell' + (on ? ' on' : '') + (i % per === 0 ? ' beat' : '') + (V.LANE[l].cymbal ? ' cym' : '') + '" style="--c:' + V.LANE[l].color + '">' +
          (on && (ch === 'R' || ch === 'L') ? ch : on && ch === 'o' ? '○' : '') + '</span>';
      }
    });
    html += '<span class="grid-label count">Count</span>' + countLabels(steps).map(function (c, i) {
      return '<span class="count-cell' + (i % per === 0 ? ' beat' : '') + '">' + c + '</span>';
    }).join('');
    return html + '</div></figure>';
  }

  Screens.lesson = function (params) {
    var l = V.lessonById(params.id);
    if (!l) return App.go('home');
    var prog = V.store.lessonProgress(l.id);
    var minBpm = Math.max(30, l.startBpm - 15);
    var maxBpm = l.bpm + 30;
    var bpm = V.clamp(params.bpm || (prog && prog.practiceBpm) || l.startBpm, minBpm, maxBpm);
    var uniq = [];
    l.form.forEach(function (n) { if (uniq.indexOf(n) < 0) uniq.push(n); });
    var formText = uniq.length === 1
      ? 'Played ' + l.form.length + ' times through.'
      : null;

    root.innerHTML = header() +
      '<main class="wrap lesson" style="--wc:' + l.world.color + '">' +
      '<button class="back" data-go="home">All lessons</button>' +
      '<div class="lesson-head">' +
      '<h1>' + esc(l.title) + '</h1>' +
      '<p class="muted">' + esc(l.world.title) + ', lesson ' + (l.index + 1) + ' of ' + V.LESSONS.length +
      (prog && prog.best ? '. Best score ' + Math.round(prog.best * 100) + '%' : '') + '</p>' +
      stars(prog ? prog.stars : 0, 'medium') +
      '</div>' +
      '<div class="lesson-grid">' +
      '<section class="how panel"><h2>How to play it</h2><ol class="steps">' +
      l.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      (l.tip ? '<p class="tip"><strong>Coach tip.</strong> ' + esc(l.tip) + '</p>' : '') +
      '</section>' +
      '<section class="pattern panel"><h2>The pattern</h2>' +
      uniq.map(function (n) { return gridHtml(n, l.patterns[n]); }).join('') +
      (formText ? '<p class="muted small">' + formText + '</p>' :
        '<p class="muted small">Bar order:</p><ol class="form-chips">' + l.form.map(function (n) { return '<li>' + esc(PATTERN_NAMES[n] || n) + '</li>'; }).join('') + '</ol>') +
      '</section></div>' +
      '<section class="play-panel panel">' +
      '<div class="tempo"><label for="bpm">Speed</label>' +
      '<button class="btn ghost sq" data-bpm="-5" aria-label="Slower">−</button>' +
      '<input type="range" id="bpm" min="' + minBpm + '" max="' + maxBpm + '" value="' + bpm + '">' +
      '<button class="btn ghost sq" data-bpm="5" aria-label="Faster">+</button>' +
      '<output id="bpm-out">' + bpm + ' BPM</output>' +
      '<span class="muted small">Full speed is ' + l.bpm + ' BPM</span></div>' +
      '<div class="modes">' +
      '<button class="mode" data-mode="listen"><strong>Listen</strong><span>Hear how it goes</span></button>' +
      '<button class="mode" data-mode="learn"><strong>Learn slowly</strong><span>Notes wait until you hit them</span></button>' +
      '<button class="mode" data-mode="practice"><strong>Practice</strong><span>Loops, and speeds up as you improve</span></button>' +
      '<button class="mode primary" data-mode="perform"><strong>Play for stars</strong><span>One go, scored</span></button>' +
      '</div></section></main>';

    bindGo(root);
    var range = V.$('#bpm', root), out = V.$('#bpm-out', root);
    function setBpm(v) { range.value = V.clamp(v, minBpm, maxBpm); out.textContent = range.value + ' BPM'; }
    range.addEventListener('input', function () { setBpm(+range.value); });
    V.$$('[data-bpm]', root).forEach(function (b) {
      b.addEventListener('click', function () { setBpm(+range.value + (+b.dataset.bpm)); });
    });
    V.$$('[data-mode]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        V.audio.ensure(); // unlock audio inside the tap (needed on iPad)
        var mode = b.dataset.mode;
        var chosen = +range.value;
        App.go('play', { lessonId: l.id, mode: mode, bpm: mode === 'learn' ? Math.min(chosen, l.startBpm) : chosen });
      });
    });
  };

  /* ---------- Play ---------- */
  var MODE_LABEL = { listen: 'Listening', learn: 'Learn slowly', practice: 'Practice', perform: 'Play for stars', calibrate: 'Hit the snare with each click' };

  function wantPads() {
    var s = V.store.settings.showPads;
    if (s === 'always') return true;
    if (s === 'never') return false;
    return !V.input.hasKit();
  }

  Screens.play = function (params) {
    var calibrate = params.mode === 'calibrate';
    var lesson = calibrate ? V.CALIBRATION : V.lessonById(params.lessonId);
    if (!lesson) return App.go('home');
    var mode = params.mode;
    var session = new V.Session({ lesson: lesson, mode: mode, bpm: params.bpm || lesson.bpm });
    var pads = wantPads();

    root.innerHTML =
      '<div class="play">' +
      '<div class="hud">' +
      '<button class="btn ghost hud-stop" data-stop>' + (mode === 'practice' ? 'Finish' : 'Stop') + '</button>' +
      '<div class="hud-title"><strong>' + esc(lesson.title) + '</strong><span>' + MODE_LABEL[mode] + '</span></div>' +
      '<div class="hud-tempo">' +
      (mode === 'practice' ? '<button class="btn ghost sq" data-tempo="-5" aria-label="Slower">−</button>' : '') +
      '<output class="bpm-out">' + session.bpm + ' BPM</output>' +
      (mode === 'practice' ? '<button class="btn ghost sq" data-tempo="5" aria-label="Faster">+</button>' +
        '<label class="toggle"><input type="checkbox" data-auto checked><span>Auto speed-up</span></label>' : '') +
      '</div>' +
      '<div class="hud-score" aria-live="off"><span class="acc">' + (mode === 'perform' || mode === 'practice' ? '0%' : '') + '</span></div>' +
      '<button class="btn ghost hud-pads" data-pads aria-pressed="' + pads + '">Pads</button>' +
      '</div>' +
      '<div class="progress"><div class="progress-fill"></div></div>' +
      '<div class="stage"><canvas aria-label="Note highway"></canvas></div>' +
      '<div class="touchpads"' + (pads ? '' : ' hidden') + '>' +
      V.HIGHWAY_LANES.map(function (l) {
        return '<button class="tp' + (session.usedLanes[l] ? '' : ' unused') + '" data-lane="' + l + '" style="--c:' + V.LANE[l].color + '">' + V.LANE[l].short + '</button>';
      }).join('') +
      '<button class="tp kick' + (session.usedLanes.kick ? '' : ' unused') + '" data-lane="kick" style="--c:' + V.LANE.kick.color + '">Kick</button>' +
      '</div></div>';

    var canvas = V.$('canvas', root);
    var hw = new V.Highway(canvas, session);
    var accEl = V.$('.acc', root);
    var fill = V.$('.progress-fill', root);
    var bpmOut = V.$('.bpm-out', root);
    var raf = 0, timer = 0, lastHud = 0, ended = false, aborted = false;
    var wake = null;

    var ro = new ResizeObserver(function () { hw.resize(); });
    ro.observe(canvas);

    var offHit = V.input.onHit(function (h) { hw.hitLane(h.lane); session.hit(h); });
    session.on('judge', function (ev) { hw.feedback(ev); });
    session.on('tempo', function (bpm) { bpmOut.textContent = bpm + ' BPM'; });
    session.on('loop', function (info) {
      if (info.sped) hw.showBanner('Nice! Speeding up to ' + info.bpm + ' BPM');
      else if (info.acc >= 0.9 && info.atTarget) hw.showBanner('Full speed and ' + Math.round(info.acc * 100) + '%. Try Play for stars');
      else hw.showBanner('That loop: ' + Math.round(info.acc * 100) + '%');
    });
    session.on('end', function (r) {
      ended = true;
      if (aborted) return;
      setTimeout(function () { finish(r); }, 350);
    });

    function finish(r) {
      if (mode === 'listen') return App.go('lesson', { id: lesson.id, bpm: session.startBpm });
      if (calibrate) return App.go('kit', { calibration: r });
      if (mode === 'practice' && r.total === 0) return App.go('lesson', { id: lesson.id });
      var rec = V.store.recordResult(lesson.id, r);
      App.go('results', { lessonId: lesson.id, result: r, rec: rec });
    }

    function frame() {
      var now = performance.now();
      session.update(now);
      hw.draw(now);
      fill.style.transform = 'scaleX(' + session.progress(now).toFixed(4) + ')';
      if ((mode === 'perform' || mode === 'practice') && now - lastHud > 200) {
        lastHud = now;
        var r = session.result();
        accEl.textContent = r.total ? Math.round(r.acc * 100) + '%' : '0%';
      }
      if (!ended) raf = requestAnimationFrame(frame);
    }
    // Keep audio scheduling going even if animation frames stall.
    timer = setInterval(function () { session.update(performance.now()); }, 25);

    V.$('[data-stop]', root).addEventListener('click', function () {
      if (mode === 'practice') { session.stop(); return; }
      aborted = true;
      session.stop();
      App.go(calibrate ? 'kit' : 'lesson', calibrate ? {} : { id: lesson.id, bpm: session.startBpm });
    });
    V.$$('[data-tempo]', root).forEach(function (b) {
      b.addEventListener('click', function () { session.setBpm(session.bpm + (+b.dataset.tempo)); });
    });
    var auto = V.$('[data-auto]', root);
    if (auto) auto.addEventListener('change', function () { session.autoSpeed = auto.checked; });
    var padsBtn = V.$('[data-pads]', root), padsEl = V.$('.touchpads', root);
    padsBtn.addEventListener('click', function () {
      padsEl.hidden = !padsEl.hidden;
      padsBtn.setAttribute('aria-pressed', String(!padsEl.hidden));
      requestAnimationFrame(function () { hw.resize(); });
    });
    V.$$('.tp', root).forEach(function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        V.input.emitHit(b.dataset.lane, 100, e.timeStamp || performance.now(), 'touch', null);
        b.classList.add('down');
        setTimeout(function () { b.classList.remove('down'); }, 110);
      });
    });

    function onVis() {
      if (document.hidden && !ended) { aborted = true; session.stop(); App.go(calibrate ? 'kit' : 'lesson', calibrate ? {} : { id: lesson.id }); }
    }
    document.addEventListener('visibilitychange', onVis);
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {}); } catch (e) { /* ignore */ }

    session.start();
    raf = requestAnimationFrame(frame);
    App.session = session;

    return function () {
      ended = true;
      cancelAnimationFrame(raf);
      clearInterval(timer);
      ro.disconnect();
      offHit();
      document.removeEventListener('visibilitychange', onVis);
      if (wake) { try { wake.release(); } catch (e) { /* ignore */ } }
      App.session = null;
    };
  };

  /* ---------- Results ---------- */
  function timingSentence(r) {
    if (r.hitsTimed < 6) return '';
    var m = Math.round(r.medianOffset);
    if (Math.abs(m) < 12) return 'Your timing sat right on the beat.';
    if (m < 0) return 'You tended to play a little early, by about ' + (-m) + ' ms. Relax and let each beat come to you.';
    return 'You tended to play a little late, by about ' + m + ' ms. Listen for the click and arrive with it.' +
      (m > 35 ? ' If this happens every time, run Check my timing on the Your kit page.' : '');
  }

  Screens.results = function (params) {
    var l = V.lessonById(params.lessonId);
    var r = params.result;
    var rec = params.rec || {};
    var next = V.nextLesson(l);
    var nextOpen = next && V.isUnlocked(next);
    var body = '';
    var actions = '';

    if (r.mode === 'learn') {
      body = '<h1>You learned it</h1>' +
        '<p class="lede">You found every note. Now play it in time with the click.</p>' +
        (r.wrong ? '<p class="muted">You tried ' + r.wrong + ' other drum' + (r.wrong === 1 ? '' : 's') + ' along the way. That’s how you learn the kit.</p>' : '');
      actions = '<button class="btn primary big" data-play="practice">Practice it</button>' +
        '<button class="btn" data-play="perform">Play for stars</button>';
    } else if (r.mode === 'practice') {
      var best = r.loops.reduce(function (m, x) { return Math.max(m, x.acc); }, 0);
      body = '<h1>Practice done</h1>' +
        '<div class="big-number">' + Math.round(r.acc * 100) + '<span>%</span></div>' +
        '<p class="lede">' + (r.loops.length ? r.loops.length + ' loop' + (r.loops.length === 1 ? '' : 's') + ' played. Best loop ' + Math.round(best * 100) + '%. ' : '') +
        'You finished at ' + r.bpm + ' BPM' + (r.bpm > r.startBpm ? ', up from ' + r.startBpm : '') + '.</p>' +
        '<p class="muted">' + timingSentence(r) + '</p>';
      actions = '<button class="btn primary big" data-play="perform" data-bpm="' + r.bpm + '">Play for stars at ' + r.bpm + ' BPM</button>' +
        '<button class="btn" data-play="practice" data-bpm="' + r.bpm + '">Keep practising</button>';
    } else {
      var head = ['Nearly there', 'You’ve got it', 'Great groove', 'Rock solid'][r.stars];
      var sub = [
        'Try it a little slower, or use Learn slowly to lock in the pattern.',
        'Play it again to tighten it up. 80% earns two stars.',
        r.capped ? 'Play at full speed (' + l.bpm + ' BPM) to earn the third star.' : 'So close. 92% earns three stars.',
        'That’s as good as it gets. Ready for the next one?'
      ][r.stars];
      if (r.stars === 2 && !r.capped && r.bpm < l.bpm) sub = 'So close. 92% at full speed (' + l.bpm + ' BPM) earns three stars.';
      body = stars(r.stars, 'huge') +
        '<h1>' + head + '</h1>' +
        '<div class="big-number">' + Math.round(r.acc * 100) + '<span>%</span></div>' +
        '<p class="lede">' + sub + '</p>' +
        (rec.newStars > 0 && nextOpen && r.stars > 0 && next ? '<p class="unlock">New lesson unlocked: ' + esc(next.title) + '</p>' : '') +
        '<dl class="breakdown">' +
        '<div><dt>Perfect</dt><dd>' + r.counts.perfect + '</dd></div>' +
        '<div><dt>Good</dt><dd>' + r.counts.good + '</dd></div>' +
        '<div><dt>Early or late</dt><dd>' + r.counts.ok + '</dd></div>' +
        '<div><dt>Missed</dt><dd>' + r.counts.miss + '</dd></div>' +
        '<div><dt>Extra hits</dt><dd>' + r.counts.extra + '</dd></div>' +
        '<div><dt>Best run</dt><dd>' + r.maxCombo + '</dd></div>' +
        '</dl>' +
        '<p class="muted">' + timingSentence(r) + ' Played at ' + r.bpm + ' BPM.</p>';
      var faster = Math.min(l.bpm, r.bpm + 5);
      actions = (nextOpen && r.stars > 0 ? '<button class="btn primary big" data-next>Next lesson: ' + esc(next.title) + '</button>' : '') +
        '<button class="btn' + (nextOpen && r.stars > 0 ? '' : ' primary big') + '" data-play="perform" data-bpm="' + r.bpm + '">Play again</button>' +
        (r.bpm < l.bpm && r.stars >= 2 ? '<button class="btn" data-play="perform" data-bpm="' + faster + '">Try at ' + faster + ' BPM</button>' : '') +
        (r.stars < 2 ? '<button class="btn" data-play="practice" data-bpm="' + Math.max(l.startBpm - 10, Math.min(r.bpm, l.startBpm)) + '">Practice it</button>' : '');
    }

    root.innerHTML = header() +
      '<main class="wrap results" style="--wc:' + l.world.color + '">' +
      '<p class="muted results-lesson">' + esc(l.title) + '</p>' +
      body +
      '<div class="actions">' + actions + '<button class="btn ghost" data-back>Back to lesson</button></div>' +
      '</main>';

    bindGo(root);
    V.$$('[data-play]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        V.audio.ensure();
        App.go('play', { lessonId: l.id, mode: b.dataset.play, bpm: +(b.dataset.bpm || r.bpm) });
      });
    });
    var n = V.$('[data-next]', root);
    if (n) n.addEventListener('click', function () { App.go('lesson', { id: next.id }); });
    V.$('[data-back]', root).addEventListener('click', function () { App.go('lesson', { id: l.id }); });
  };

  /* ---------- Your kit: connection, test, mapping, timing, settings ---------- */
  var KIT_SHAPES = {
    crash: { cx: 92, cy: 52, r: 40 },
    hihat: { cx: 52, cy: 132, r: 36 },
    snare: { cx: 140, cy: 182, r: 38 },
    tom1: { cx: 168, cy: 98, r: 30 },
    tom2: { cx: 238, cy: 98, r: 30 },
    ride: { cx: 330, cy: 64, r: 44 },
    tom3: { cx: 296, cy: 186, r: 40 },
    kick: { cx: 218, cy: 238, r: 0 }
  };
  function kitSvg() {
    var s = '<svg class="kit-svg" viewBox="0 0 400 290" role="img" aria-label="Drum kit diagram. Pads light up when you hit them.">';
    s += '<g data-lane="kick" style="--c:' + V.LANE.kick.color + '"><rect x="158" y="212" width="120" height="58" rx="18"/><text x="218" y="246">Kick</text></g>';
    Object.keys(KIT_SHAPES).forEach(function (l) {
      if (l === 'kick') return;
      var k = KIT_SHAPES[l], info = V.LANE[l];
      s += '<g data-lane="' + l + '" style="--c:' + info.color + '" class="' + (info.cymbal ? 'cym' : 'drum') + '">' +
        '<circle cx="' + k.cx + '" cy="' + k.cy + '" r="' + k.r + '"/>' +
        (info.cymbal ? '<circle class="bell" cx="' + k.cx + '" cy="' + k.cy + '" r="' + Math.round(k.r * 0.22) + '"/>' : '') +
        '<text x="' + k.cx + '" y="' + (k.cy + (info.cymbal ? k.r * 0.55 : 5)) + '">' + info.name + '</text></g>';
    });
    return s + '</svg>';
  }

  function segmented(name, label, options, current) {
    var cur = current !== undefined ? current : V.store.settings[name];
    return '<fieldset class="seg"><legend>' + label + '</legend><div class="seg-opts">' +
      options.map(function (o) {
        return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (cur === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
      }).join('') + '</div></fieldset>';
  }
  function check(name, label) {
    return '<label class="check"><input type="checkbox" name="' + name + '"' + (V.store.settings[name] ? ' checked' : '') + '><span>' + label + '</span></label>';
  }

  function connectionHtml() {
    var st = V.input.state;
    if (st === 'unsupported') {
      return '<p><strong>This browser can’t read USB drum kits.</strong></p>' +
        '<p class="muted">Safari on iPad and iPhone doesn’t support Web MIDI. Open Veytra in Chrome or Edge on a Mac, Windows PC, Chromebook or Android tablet to use your kit. On-screen pads and the computer keyboard still work here.</p>';
    }
    if (st === 'denied') return '<p><strong>MIDI access was blocked.</strong></p><p class="muted">Allow MIDI devices for this site in the browser’s site settings, then tap Connect kit again.</p>';
    if (V.input.hasKit()) {
      return '<p><strong>Connected.</strong> Veytra can hear:</p><ul class="devices">' +
        V.input.devices.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>';
    }
    if (st === 'ready') return '<p><strong>No kit found.</strong></p><p class="muted">Check the USB cable runs from the module’s USB port to this device and that the module is switched on. It should appear here straight away.</p>';
    return '<p>Plug your drum module into this device with a USB cable and switch it on.</p>';
  }

  var WIZARD_STEPS = [
    ['kick', 'Press the kick pedal'],
    ['snare', 'Hit the snare'],
    ['hihat', 'Hit the hi-hat with the pedal up'],
    ['hihat', 'Now press the hi-hat pedal down and hit the hi-hat again'],
    ['tom1', 'Hit tom 1 (the small one on the left)'],
    ['tom2', 'Hit tom 2'],
    ['tom3', 'Hit the floor tom'],
    ['crash', 'Hit the crash'],
    ['ride', 'Hit the ride']
  ];

  Screens.kit = function (params) {
    var s = V.store.settings;
    var cal = params && params.calibration;
    var calMsg = '';
    if (cal) {
      if (cal.hitsTimed < 8) calMsg = 'Not enough hits to measure. Try again and hit the snare with every click.';
      else {
        var ms = V.clamp(Math.round(cal.medianOffset), -80, 150);
        s.latencyMs = ms;
        V.store.saveSettings();
        calMsg = Math.abs(ms) < 10 ? 'Your timing setup is spot on, so no correction is needed.'
          : ms > 0 ? 'Your hits arrive about ' + ms + ' ms after the click. Veytra now corrects for that.'
          : 'Your hits land about ' + (-ms) + ' ms before the click. Veytra now corrects for that.';
      }
    }

    root.innerHTML = header() +
      '<main class="wrap kit">' +
      '<button class="back" data-go="home">All lessons</button>' +
      '<h1>Your kit</h1>' +
      '<div class="kit-grid">' +
      '<section class="panel connect"><h2>Connection</h2><div class="conn">' + connectionHtml() + '</div>' +
      (V.input.midiSupported ? '<button class="btn primary" data-connect>' + (V.input.hasKit() ? 'Check again' : 'Connect kit') + '</button>' : '') +
      '</section>' +
      '<section class="panel live"><h2>Test your pads</h2><p class="muted">Hit each pad. The matching drum lights up here.</p>' + kitSvg() +
      '<p class="readout" aria-live="polite">Waiting for a hit</p></section>' +
      '<section class="panel map"><h2>Map my kit</h2>' +
      '<p class="muted">If the wrong drum lights up, Veytra can learn your kit. It asks you to hit each pad in turn.</p>' +
      '<div class="row"><button class="btn" data-map' + (V.input.hasKit() ? '' : ' disabled') + '>Map my kit</button>' +
      (s.noteMap ? '<button class="btn ghost" data-map-reset>Use the standard map</button>' : '') + '</div>' +
      '<div class="wizard" hidden></div></section>' +
      '<section class="panel timing"><h2>Check my timing</h2>' +
      '<p class="muted">Play the snare along with 16 clicks. Veytra measures any delay from your kit and cables, then corrects for it.</p>' +
      (calMsg ? '<p class="cal-msg">' + calMsg + '</p>' : '') +
      '<button class="btn" data-calibrate>Check my timing</button>' +
      '<label class="slider"><span>Timing correction</span><input type="range" name="latencyMs" min="-80" max="150" value="' + s.latencyMs + '"><output>' + s.latencyMs + ' ms</output></label>' +
      '</section>' +
      '<section class="panel sound"><h2>Sound</h2>' +
      (V.audio.canChooseOutput()
        ? '<label class="picker"><span>Play Veytra’s sound through</span><select name="audioOutput"><option value="">The computer’s sound setting</option></select></label>' +
          '<div class="speakers-hidden" hidden><p class="muted small">Chrome only lists your speakers after you allow the microphone. Veytra doesn’t record anything; it switches the microphone straight off again.</p>' +
          '<button class="btn" data-show-speakers>Show my speakers</button></div>'
        : '<p class="muted">This browser always uses the computer’s sound setting. On a Mac, choose the speakers in System Settings, Sound, Output.</p>') +
      '<div class="row"><button class="btn ghost" data-test-sound>Play a test sound</button></div>' +
      segmented('appSounds', 'Hear your kit through these speakers', [['always', 'On'], ['auto', 'Off']],
        s.appSounds === 'always' ? 'always' : 'auto') +
      '<p class="muted small">On plays every pad you hit through the speakers above. Off leaves the drum sounds to the drum module and its headphones. The on-screen pads always make sound.</p>' +
      '</section>' +
      '<section class="panel settings"><h2>Settings</h2>' +
      segmented('strictness', 'Timing', [['relaxed', 'Relaxed'], ['normal', 'Normal'], ['strict', 'Strict']]) +
      segmented('noteSpeed', 'Note speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']]) +
      segmented('showPads', 'On-screen pads', [['auto', 'When no kit'], ['always', 'Always'], ['never', 'Never']]) +
      '<label class="slider"><span>Volume</span><input type="range" name="volume" min="0" max="1" step="0.05" value="' + s.volume + '"></label>' +
      check('metronome', 'Click track') +
      check('backing', 'Backing music') +
      check('unlockAll', 'Unlock every lesson (for grown-ups)') +
      '</section>' +
      '<section class="panel keys"><h2>No kit handy?</h2><p class="muted">On a computer keyboard, A S D F G H J play hi-hat, crash, snare, tom 1, tom 2, floor tom and ride. Space is the kick. On a tablet, use the on-screen pads.</p></section>' +
      '</div></main>';

    bindGo(root);
    var readout = V.$('.readout', root);
    var svg = V.$('.kit-svg', root);

    function light(lane) {
      var g = V.$('[data-lane="' + lane + '"]', svg);
      if (!g) return;
      g.classList.remove('lit');
      void g.getBoundingClientRect();
      g.classList.add('lit');
      setTimeout(function () { g.classList.remove('lit'); }, 180);
    }
    var offHit = V.input.onHit(function (h) {
      light(h.lane);
      if (h.source !== 'midi') readout.textContent = V.LANE[h.lane].name + ' (' + (h.source === 'keys' ? 'keyboard' : 'on-screen') + ')';
    });
    var offRaw = V.input.onRaw(function (e) {
      readout.textContent = 'Note ' + e.note + ', strength ' + e.vel + (e.lane ? ': ' + V.LANE[e.lane].name : ': not mapped yet');
    });
    var offStatus = V.input.onStatus(function () {
      V.$('.conn', root).innerHTML = connectionHtml();
      var m = V.$('[data-map]', root);
      if (m) m.disabled = !V.input.hasKit();
    });

    var cb = V.$('[data-connect]', root);
    if (cb) cb.addEventListener('click', function () { V.input.connectMidi(); });

    V.$('[data-calibrate]', root).addEventListener('click', function () {
      V.audio.ensure();
      App.go('play', { mode: 'calibrate', bpm: 90 });
    });

    // Settings
    // Speakers
    var outSel = V.$('select[name=audioOutput]', root);
    function fillOutputs() {
      if (!outSel) return Promise.resolve();
      return V.audio.listOutputs().then(function (outs) {
        var cur = s.audioOutput;
        var have = outs.some(function (o) { return o.id === cur; });
        outSel.innerHTML = '<option value="">The computer’s sound setting</option>' +
          outs.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.label) + '</option>'; }).join('') +
          (cur && !have ? '<option value="' + esc(cur) + '">' + esc(s.audioOutputLabel || 'Saved speakers') + (outs.length ? ' (not connected)' : '') + '</option>' : '');
        outSel.value = cur || '';
        V.$('.speakers-hidden', root).hidden = outs.length > 0;
      });
    }
    if (outSel) {
      fillOutputs();
      outSel.addEventListener('change', function () {
        var opt = outSel.options[outSel.selectedIndex];
        V.audio.setOutput(outSel.value, outSel.value ? opt.textContent : '').then(function (ok) {
          if (ok) { toast(outSel.value ? 'Sound now plays through ' + opt.textContent : 'Sound follows the computer’s setting'); V.audio.testSound(); }
          else toast('Couldn’t switch to that output. Check it’s connected.');
        });
      });
      V.$('[data-show-speakers]', root).addEventListener('click', function () {
        V.audio.revealOutputs().then(function (ok) {
          if (!ok) { toast('Microphone access was blocked, so Chrome won’t list the speakers.'); return; }
          fillOutputs();
        });
      });
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', fillOutputs);
      }
    }
    V.$('[data-test-sound]', root).addEventListener('click', function () { V.audio.testSound(); });

    V.$$('.settings input, .sound input, .timing input[type=range]', root).forEach(function (inp) {
      inp.addEventListener(inp.type === 'range' ? 'input' : 'change', function () {
        var k = inp.name;
        if (inp.type === 'checkbox') s[k] = inp.checked;
        else if (inp.type === 'range') s[k] = +inp.value;
        else s[k] = inp.value;
        if (k === 'volume') V.audio.setVolume(+inp.value);
        if (k === 'latencyMs') inp.nextElementSibling.textContent = inp.value + ' ms';
        V.store.saveSettings();
      });
    });

    // Mapping wizard
    var wiz = V.$('.wizard', root);
    var offWizard = null;
    function stopWizard() { if (offWizard) { offWizard(); offWizard = null; } wiz.hidden = true; }
    var reset = V.$('[data-map-reset]', root);
    if (reset) reset.addEventListener('click', function () { s.noteMap = null; V.store.saveSettings(); toast('Using the standard drum map'); App.go('kit'); });
    var mapBtn = V.$('[data-map]', root);
    mapBtn.addEventListener('click', function () {
      var map = {};
      var i = 0;
      var lastAt = 0;
      wiz.hidden = false;
      function render() {
        if (i >= WIZARD_STEPS.length) {
          var merged = Object.assign({}, V.input.defaultMap, map);
          s.noteMap = merged;
          V.store.saveSettings();
          stopWizard();
          toast('Kit mapped. Hit a pad to check it.');
          App.go('kit');
          return;
        }
        var st = WIZARD_STEPS[i], lane = st[0];
        wiz.innerHTML = '<p class="wiz-step">Step ' + (i + 1) + ' of ' + WIZARD_STEPS.length + '</p>' +
          '<p class="wiz-ask" style="--c:' + V.LANE[lane].color + '"><span class="swatch-dot"></span>' + st[1] + '</p>' +
          '<div class="row"><button class="btn ghost" data-skip>I don’t have this one</button><button class="btn ghost" data-cancel-map>Cancel</button></div>';
        V.$$('[data-lane]', svg).forEach(function (g) { g.classList.toggle('target', g.dataset.lane === lane); });
        V.$('[data-skip]', wiz).addEventListener('click', function () { i++; render(); });
        V.$('[data-cancel-map]', wiz).addEventListener('click', function () {
          V.$$('[data-lane]', svg).forEach(function (g) { g.classList.remove('target'); });
          stopWizard();
        });
      }
      if (offWizard) offWizard();
      offWizard = V.input.onRaw(function (e) {
        if (e.t - lastAt < 350 || i >= WIZARD_STEPS.length) return;
        lastAt = e.t;
        map[e.note] = WIZARD_STEPS[i][0];
        i++;
        render();
      });
      render();
    });

    return function () {
      offHit(); offRaw(); offStatus(); stopWizard();
      if (outSel && navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', fillOutputs);
      }
    };
  };

  /* ---------- boot ---------- */
  // App drum sounds for on-screen pads and keys (and kit hits if the player wants them).
  V.input.onHit(function (h) {
    var mode = V.store.settings.appSounds;
    if (mode === 'never') return;
    if (mode === 'auto' && h.source === 'midi') return;
    V.audio.drum(h.lane, null, h.vel, h.note === 46 || h.note === 26); // 46/26 = open hi-hat
  });
  V.input.onStatus(updateKitPills);

  function unlockAudio() {
    var c = V.audio.ensure();
    if (c && c.state === 'running') {
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    }
  }
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  V.input.autoConnect();
  App.go(V.store.active() ? 'home' : 'profiles');

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})(window.V);
