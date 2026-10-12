'use strict';
/* Veytra core: shared namespace, kit lanes and small helpers. */
window.V = window.V || {};

(function (V) {
  // Lanes on the note highway, left to right as seen from the drum stool.
  V.HIGHWAY_LANES = ['hihat', 'crash', 'snare', 'tom1', 'tom2', 'tom3', 'ride'];
  // The kick is drawn as a bar across every lane.
  V.LANES = V.HIGHWAY_LANES.concat(['kick']);

  V.LANE = {
    hihat: { name: 'Hi-hat',    short: 'HH', color: '#FFD23F', key: 'a', cymbal: true },
    crash: { name: 'Crash',     short: 'CR', color: '#FF9F1C', key: 's', cymbal: true },
    snare: { name: 'Snare',     short: 'SN', color: '#FF4F79', key: 'd' },
    tom1:  { name: 'Tom 1',     short: 'T1', color: '#3EC6FF', key: 'f' },
    tom2:  { name: 'Tom 2',     short: 'T2', color: '#4E7BFF', key: 'g' },
    tom3:  { name: 'Floor tom', short: 'T3', color: '#A06BFF', key: 'h' },
    ride:  { name: 'Ride',      short: 'RD', color: '#2ED3B7', key: 'j', cymbal: true },
    kick:  { name: 'Kick',      short: 'KK', color: '#B8F35A', key: ' ' }
  };

  V.KEY_TO_LANE = {};
  V.LANES.forEach(function (lane) { V.KEY_TO_LANE[V.LANE[lane].key] = lane; });

  V.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  V.clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  V.$ = function (sel, root) { return (root || document).querySelector(sel); };
  V.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Tiny event emitter.
  V.emitter = function () {
    var fns = new Set();
    return {
      on: function (fn) { fns.add(fn); return function () { fns.delete(fn); }; },
      emit: function () {
        var args = arguments;
        fns.forEach(function (f) { try { f.apply(null, args); } catch (e) { console.error(e); } });
      }
    };
  };

  // Named events: on('judge', fn) / emit('judge', data).
  V.events = function () {
    var map = {};
    return {
      on: function (name, fn) {
        (map[name] = map[name] || new Set()).add(fn);
        return function () { map[name].delete(fn); };
      },
      emit: function (name) {
        var args = Array.prototype.slice.call(arguments, 1);
        (map[name] || []).forEach(function (f) { try { f.apply(null, args); } catch (e) { console.error(e); } });
      }
    };
  };

  V.laneList = function (lanes) {
    var names = lanes.map(function (l) { return V.LANE[l].name.toLowerCase(); });
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  };
})(window.V);
