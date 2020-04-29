import { createMachine, interpret } from 'xstate';

function newState() {
  return interpret(toggleMachine)
    .onTransition((state) => console.log(`state: ${state.value}`))
    .start();
}

module.exports = { run: worldMachine };
// ===================

const worldMachine = Machine({
  id: 'adventure',
  initial: 'start',
  context: {
    retries: 0,
  },
  states: {
    start: {
      on: {
        LEFT: 's1_1',
        RIGHT: 's1_2',
      },
      context: {
          a: "test"
      },
    },
    s1_1: {
      on: {
        LEFT: 's2_1',
      },
    },
    s2_1: {
      on: {
        LEFT: 'success',
      },
    },
    s1_2: {
      on: {
        RIGHT: 'success',
      },
    },
    success: {
      type: 'final',
    },
    failure: {
      type: 'final',
    },
  },
});
