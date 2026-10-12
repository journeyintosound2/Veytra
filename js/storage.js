'use strict';
/* Players, progress and settings, kept in this browser's localStorage. */
(function (V) {
  var PREFIX = 'veytra.';

  function read(key, def) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw == null ? def : JSON.parse(raw);
    } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) { /* storage blocked */ }
  }

  var DEFAULT_SETTINGS = {
    appSounds: 'auto',     // auto: only for on-screen pads and keys | always | never
    metronome: true,
    backing: true,
    volume: 0.8,
    latencyMs: 0,          // measured by "Check my timing"
    strictness: 'normal',  // relaxed | normal | strict
    showPads: 'auto',      // auto: when no kit is connected | always | never
    noteSpeed: 'normal',   // slow | normal | fast
    noteMap: null,         // {midiNote: lane} after "Map my kit"
    unlockAll: false
  };

  var store = V.store = {
    settings: Object.assign({}, DEFAULT_SETTINGS, read('settings', {})),
    profiles: read('profiles', []),
    activeId: read('active', null),
    progress: read('progress', {}),

    saveSettings: function () { write('settings', this.settings); },
    resetSettings: function () { this.settings = Object.assign({}, DEFAULT_SETTINGS); this.saveSettings(); },

    saveProfiles: function () { write('profiles', this.profiles); write('active', this.activeId); },
    active: function () {
      var id = this.activeId;
      return this.profiles.find(function (p) { return p.id === id; }) || null;
    },
    setActive: function (id) { this.activeId = id; this.saveProfiles(); },
    addProfile: function (name, color) {
      var p = {
        id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: name, color: color, created: Date.now()
      };
      this.profiles.push(p);
      this.activeId = p.id;
      this.saveProfiles();
      return p;
    },
    removeProfile: function (id) {
      this.profiles = this.profiles.filter(function (p) { return p.id !== id; });
      delete this.progress[id];
      if (this.activeId === id) this.activeId = this.profiles.length ? this.profiles[0].id : null;
      this.saveProfiles();
      write('progress', this.progress);
    },

    lessonProgress: function (lessonId, profileId) {
      var all = this.progress[profileId || this.activeId] || {};
      return all[lessonId] || null;
    },
    totalStars: function (profileId) {
      var all = this.progress[profileId || this.activeId] || {};
      return Object.keys(all).reduce(function (s, k) { return s + (all[k].stars || 0); }, 0);
    },
    recordResult: function (lessonId, r) {
      if (!this.activeId) return null;
      var all = this.progress[this.activeId] || (this.progress[this.activeId] = {});
      var cur = all[lessonId] || { stars: 0, best: 0, bestBpm: 0, plays: 0, learned: false, practiceBpm: null };
      var prevStars = cur.stars;
      cur.plays += 1;
      cur.last = Date.now();
      if (r.mode === 'learn') cur.learned = true;
      if (r.mode === 'practice') cur.practiceBpm = r.bpm;
      if (r.mode === 'perform') {
        cur.stars = Math.max(cur.stars, r.stars);
        if (r.acc > cur.best) cur.best = r.acc;
        if (r.stars > 0) cur.bestBpm = Math.max(cur.bestBpm, r.bpm);
      }
      all[lessonId] = cur;
      write('progress', this.progress);
      return { progress: cur, newStars: cur.stars - prevStars };
    }
  };

  // Keep at least one valid active player if profiles exist.
  if (!store.active() && store.profiles.length) store.setActive(store.profiles[0].id);
})(window.V);
