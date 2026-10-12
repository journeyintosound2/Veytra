'use strict';
/*
 * The drum course. All grooves and exercises here are original or are basic
 * drumming patterns (rock beat, four-on-the-floor) that belong to everyone.
 *
 * How to write a lesson
 *   patterns: named one-bar grids. Each lane string is one bar long:
 *             4 characters = quarter notes, 8 = eighths, 16 = sixteenths.
 *             x = hit, R/L = hit with that hand, o = open hi-hat, - = rest.
 *             Spaces are ignored, so 'x-x- x-x-' is fine.
 *   form:     the order the bars are played in.
 *   bpm:      full speed (needed for the third star). startBpm: where practice starts.
 *   chords:   optional backing chords, one per bar. style: eighths | pulse | dance | half.
 */
(function (V) {
  var ROCK = { hihat: 'xxxxxxxx', snare: '--x---x-', kick: 'x---x---' };
  var ROCK_CRASH = { crash: 'x-------', hihat: '-xxxxxxx', snare: '--x---x-', kick: 'x---x---' };
  var TOM_FILL_8 = { snare: 'RL------', tom1: '--RL----', tom2: '----RL--', tom3: '------RL', kick: 'x-------' };
  var TOM_FILL_16 = { snare: 'RLRL------------', tom1: '----RLRL--------', tom2: '--------RLRL----', tom3: '------------RLRL', kick: 'x---------------' };
  var FINISH = { crash: 'x---', kick: 'x---' };

  V.WORLDS = [
    {
      id: 'kit', title: 'Meet the kit', color: '#FFD23F',
      blurb: 'Find every drum, then play your first steady beats.',
      lessons: [
        {
          id: 'hello-kit', title: 'Hello, kit', bpm: 60, startBpm: 45,
          steps: [
            'Each coloured lane on screen matches one part of your kit.',
            'When a note lands on the line at the bottom, hit that drum.',
            'The wide green bar is the kick drum. Press the pedal with your right foot.'
          ],
          tip: 'Put a small coloured sticker on each pad so it matches its lane. It makes reading the screen much easier.',
          patterns: {
            A: { hihat: 'x---', snare: '-x--', tom1: '--x-', tom2: '---x' },
            B: { tom3: 'x---', crash: '-x--', ride: '--x-', kick: '---x' }
          },
          form: ['A', 'B', 'A', 'B']
        },
        {
          id: 'steady-snare', title: 'Steady snare', bpm: 70, startBpm: 55,
          steps: [
            'Count out loud: 1, 2, 3, 4.',
            'Hit the snare on every count.',
            'Swap hands each time. The letters on the notes show which hand: R for right, L for left.'
          ],
          tip: 'Let the stick bounce back up off the pad, like dribbling a basketball.',
          patterns: { A: { snare: 'RLRL' } },
          form: ['A', 'A', 'A', 'A'],
          chords: ['C', 'C', 'F', 'G'], style: 'half'
        },
        {
          id: 'boom', title: 'Boom', bpm: 70, startBpm: 55,
          steps: [
            'Rest your right foot on the kick pedal.',
            'Press down with the front of your foot on every count.',
            'Keep your heel on the pedal for now. It gives you more control.'
          ],
          tip: 'Sit so your knees are about level with your hips and both feet reach the pedals easily.',
          patterns: { A: { kick: 'xxxx' } },
          form: ['A', 'A', 'A', 'A'],
          chords: ['Am', 'Am', 'F', 'G'], style: 'half'
        },
        {
          id: 'boom-chick', title: 'Boom chick', bpm: 80, startBpm: 60,
          steps: [
            'Kick on 1 and 3.',
            'Snare on 2 and 4.',
            'Say it while you play: boom, chick, boom, chick.'
          ],
          tip: 'Beats 2 and 4 are called the backbeat. Almost every pop and rock song puts the snare there.',
          patterns: { A: { snare: '-x-x', kick: 'x-x-' } },
          form: ['A', 'A', 'A', 'A'],
          chords: ['C', 'G', 'Am', 'F'], style: 'pulse'
        },
        {
          id: 'hat-highway', title: 'Hi-hat highway', bpm: 80, startBpm: 60,
          steps: [
            'Use your right hand only.',
            'Play the hi-hat on every count and every "and": 1 & 2 & 3 & 4 &.',
            'Keep each hit the same volume, like a ticking clock.'
          ],
          tip: 'Keep your left foot pressing the hi-hat pedal so it sounds closed and tight.',
          patterns: { A: { hihat: 'xxxxxxxx' } },
          form: ['A', 'A', 'A', 'A'],
          chords: ['G', 'Em', 'C', 'D']
        }
      ]
    },
    {
      id: 'grooves', title: 'First grooves', color: '#FF4F79',
      blurb: 'Hands and feet together. This is where it starts to sound like a band.',
      lessons: [
        {
          id: 'two-hands', title: 'Two hands', bpm: 75, startBpm: 55,
          steps: [
            'Right hand plays the hi-hat on every count and "and".',
            'Left hand plays the snare on 2 and 4.',
            'On 2 and 4, both hands hit at the same moment.'
          ],
          tip: 'Cross your right hand over your left so it can reach the hi-hat.',
          patterns: { A: { hihat: 'xxxxxxxx', snare: '--x---x-' } },
          form: ['A', 'A', 'A', 'A'],
          chords: ['C', 'G', 'Am', 'F']
        },
        {
          id: 'rock-beat', title: 'Your first rock beat', bpm: 85, startBpm: 60,
          steps: [
            'Start with the hi-hat and snare from the last lesson.',
            'Add the kick on 1 and 3.',
            'If it feels tricky, use Learn slowly. The notes wait for you.'
          ],
          tip: 'This beat powers thousands of songs. Once it feels easy, try it with your eyes closed.',
          patterns: { A: ROCK },
          form: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
          chords: ['C', 'G', 'Am', 'F']
        },
        {
          id: 'extra-kick', title: 'Extra kick', bpm: 85, startBpm: 60,
          steps: [
            'Same rock beat, with one more kick.',
            'Count 1 & 2 & 3 & 4 &.',
            'The new kick lands on the "and" straight after 3.'
          ],
          tip: 'The new kick and the hi-hat land together. Listen for them as one sound.',
          patterns: { A: { hihat: 'xxxxxxxx', snare: '--x---x-', kick: 'x---x-x-' } },
          form: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
          chords: ['Am', 'F', 'C', 'G']
        },
        {
          id: 'crash-landing', title: 'Crash landing', bpm: 85, startBpm: 60,
          steps: [
            'Start every group of four bars with a crash instead of the hi-hat.',
            'Hit the crash and the kick together on beat 1.',
            'Then go straight back to the hi-hat.'
          ],
          tip: 'A crash tells everyone a new part of the song is starting.',
          patterns: { crash: ROCK_CRASH, groove: ROCK },
          form: ['crash', 'groove', 'groove', 'groove', 'crash', 'groove', 'groove', 'groove'],
          chords: ['C', 'G', 'Am', 'F']
        },
        {
          id: 'ride-along', title: 'Ride along', bpm: 90, startBpm: 65,
          steps: [
            'Move your right hand from the hi-hat to the ride cymbal.',
            'Everything else stays the same as the extra-kick beat.',
            'The ride makes the music feel bigger and more open.'
          ],
          tip: 'Hit the ride about halfway between the edge and the centre.',
          patterns: { A: { ride: 'xxxxxxxx', snare: '--x---x-', kick: 'x---x-x-' } },
          form: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
          chords: ['F', 'C', 'G', 'Am']
        }
      ]
    },
    {
      id: 'toms', title: 'Around the toms', color: '#3EC6FF',
      blurb: 'Fills are the drummer’s moment to shine. Learn to travel around the kit.',
      lessons: [
        {
          id: 'tom-tour', title: 'Tom tour', bpm: 70, startBpm: 50,
          steps: [
            'Travel from the snare to the floor tom, one drum per count.',
            'Move your arms, not just your wrists.',
            'Look at the next drum just before you hit it.'
          ],
          tip: 'Toms go from high to low. The further right you go, the deeper the sound.',
          patterns: { A: { snare: 'R---', tom1: '-L--', tom2: '--R-', tom3: '---L' } },
          form: ['A', 'A', 'A', 'A']
        },
        {
          id: 'tom-slide', title: 'Tom slide', bpm: 70, startBpm: 50,
          steps: [
            'Two hits on each drum: right, then left.',
            'Go snare, tom 1, tom 2, floor tom.',
            'Keep every note evenly spaced.'
          ],
          tip: 'If your arms get tangled, start the whole fill with your right hand every time.',
          patterns: { A: { snare: 'RL------', tom1: '--RL----', tom2: '----RL--', tom3: '------RL' } },
          form: ['A', 'A', 'A', 'A'],
          chords: ['Em', 'C', 'G', 'D']
        },
        {
          id: 'groove-fill', title: 'Groove and fill', bpm: 80, startBpm: 60,
          steps: [
            'Play three bars of rock beat.',
            'On the fourth bar, play the tom slide.',
            'Land on a crash and kick to start again.'
          ],
          tip: 'The hardest part is coming out of the fill. Keep counting so you land right on 1.',
          patterns: { crash: ROCK_CRASH, groove: ROCK, fill: TOM_FILL_8, end: FINISH },
          form: ['crash', 'groove', 'groove', 'fill', 'crash', 'groove', 'groove', 'fill', 'end'],
          chords: ['C', 'Am', 'F', 'G']
        },
        {
          id: 'sixteen', title: 'Sixteen steps', bpm: 60, startBpm: 45,
          steps: [
            'Sixteenth notes are four even hits on every count.',
            'Count: 1 e & a, 2 e & a, 3 e & a, 4 e & a.',
            'Swap hands the whole way through.'
          ],
          tip: 'Even and steady beats fast and messy. Start slow and let the speed come to you.',
          patterns: { A: { snare: 'RLRLRLRLRLRLRLRL' } },
          form: ['A', 'A', 'A', 'A'],
          chords: ['Am', 'G', 'F', 'E'], style: 'half'
        },
        {
          id: 'big-finish', title: 'Big finish', bpm: 75, startBpm: 50,
          steps: [
            'Three bars of rock beat, then a sixteenth-note fill.',
            'Four hits on each drum: snare, tom 1, tom 2, floor tom.',
            'Finish on the crash and kick.'
          ],
          tip: 'Practise the fill on its own in Sixteen steps first if it feels too quick.',
          patterns: { crash: ROCK_CRASH, groove: ROCK, fill: TOM_FILL_16, end: FINISH },
          form: ['crash', 'groove', 'groove', 'fill', 'crash', 'groove', 'groove', 'fill', 'end'],
          chords: ['G', 'D', 'Em', 'C']
        }
      ]
    },
    {
      id: 'dance', title: 'Dance floor', color: '#2ED3B7',
      blurb: 'New feels for new styles: dance, half-time and pop.',
      lessons: [
        {
          id: 'four-floor', title: 'Four on the floor', bpm: 110, startBpm: 85,
          steps: [
            'Kick on every count: 1, 2, 3, 4.',
            'Hi-hat on every "and", in between the kicks.',
            'Snare on 2 and 4, together with the kick.'
          ],
          tip: 'Notes with a ring above them are open hi-hats. Lift your hi-hat foot a little for those.',
          patterns: { A: { hihat: '-o-o-o-o', snare: '--x---x-', kick: 'x-x-x-x-' } },
          form: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
          chords: ['Am', 'F', 'C', 'G'], style: 'dance'
        },
        {
          id: 'half-time', title: 'Half-time', bpm: 90, startBpm: 65,
          steps: [
            'The snare moves to beat 3 only.',
            'Kick on 1 and on the "and" after 2.',
            'It feels slower and heavier, even at the same speed.'
          ],
          tip: 'Lean into the snare on 3. That big gap before it is what makes half-time feel huge.',
          patterns: { A: { hihat: 'xxxxxxxx', snare: '----x---', kick: 'x--x----' } },
          form: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
          chords: ['Em', 'C', 'G', 'D'], style: 'half'
        },
        {
          id: 'pop-groove', title: 'Pop groove', bpm: 90, startBpm: 65,
          steps: [
            'Hi-hat on every count and every "and".',
            'Kick on 1, the "and" after 2, and 3.',
            'Snare on 2 and 4.'
          ],
          tip: 'Use Learn slowly to find where the new kick fits before playing at speed.',
          patterns: { A: { hihat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-----x-x-------' } },
          form: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
          chords: ['C', 'G', 'Am', 'F'], style: 'pulse'
        },
        {
          id: 'encore', title: 'Encore', bpm: 90, startBpm: 65,
          steps: [
            'This one puts everything together.',
            'Hi-hat groove, a tom fill, then over to the ride for the second half.',
            'Finish with the big sixteenth-note fill and a crash.'
          ],
          tip: 'You have played every part of this before. Take a breath, count yourself in, and enjoy it.',
          patterns: {
            crash: ROCK_CRASH, groove: ROCK, fill: TOM_FILL_8,
            rideCrash: { crash: 'x-------', ride: '-xxxxxxx', snare: '--x---x-', kick: 'x---x-x-' },
            ride: { ride: 'xxxxxxxx', snare: '--x---x-', kick: 'x---x-x-' },
            fill16: TOM_FILL_16, end: FINISH
          },
          form: ['crash', 'groove', 'groove', 'fill', 'rideCrash', 'ride', 'ride', 'fill16', 'end'],
          chords: ['C', 'G', 'Am', 'F']
        }
      ]
    }
  ];

  // Flat list with world info, used for unlocking and "next lesson".
  V.LESSONS = [];
  V.WORLDS.forEach(function (w) {
    w.lessons.forEach(function (l) {
      l.world = w;
      l.index = V.LESSONS.length;
      V.LESSONS.push(l);
    });
  });
  V.lessonById = function (id) { return V.LESSONS.find(function (l) { return l.id === id; }) || null; };
  V.isUnlocked = function (lesson) {
    if (V.store.settings.unlockAll || lesson.index === 0) return true;
    var prev = V.LESSONS[lesson.index - 1];
    var p = V.store.lessonProgress(prev.id);
    return !!(p && p.stars > 0);
  };
  V.nextLesson = function (lesson) { return V.LESSONS[lesson.index + 1] || null; };

  // Special exercise for "Check my timing".
  V.CALIBRATION = {
    id: '_calibrate', title: 'Timing check', bpm: 90, startBpm: 90,
    patterns: { A: { snare: 'xxxx' } },
    form: ['A', 'A', 'A', 'A']
  };
})(window.V);
