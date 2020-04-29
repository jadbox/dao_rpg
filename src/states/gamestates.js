import { createMachine, interpret } from 'xstate';

function newState() {
  return interpret(toggleMachine)
    .onTransition((state) => console.log(`state: ${state.value}`))
    .start();
}

module.exports = { run: gameMachine };
// ===================

const gameMachine = Machine({
    id: 'adventure',
    initial: 'traveling',
    context: {
      retries: 0
    },
    states: {
      start: {
        
      },
      traveling: {
        on: {
          ENCOUNTER: 'battle'
        }
      },
      battle: {
        on: {
          WIN: 'success',
          RUN: 'failure',
          TPK: 'tpk'
        }
      },
      success: {
        type: 'final'
      },
      tpk: {
        type: 'final'
      },
      failure: {
        on: {
          RETRY: {
            target: 'traveling',
            actions: assign({
              retries: (context, event) => context.retries + 1
            })
          },
          END: {
            target: 'tpk'
          }
        }
      }
    }
  });
