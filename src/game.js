const MOBS = ["rat", "skeleton", "slug"];
const MOBS_STATS = {
  rat: { hp: 1, name: "rat", dm: 1 },
  skeleton: { hp: 1, name: "skeleton", dm: 1 },
  slug: { hp: 1, name: "slug", dm: 1 },
};

function State(name) {
  return {
    name: name,
    mobs: [],
    ticks: 0,
  };
}

const SPEED = 3500 * 1;

class Game {
  constructor(room) {
    console.log("Game room", room);
    this.room = room || {
      players: { jadbox: { name: "jadbox", hpMax: 10, hp: 10, dm: 3 } },
    };
    this.players = this.room.players;
    this.playersNames = Object.keys(this.room.players);
    this.playersArr = Object.values(this.room.players);
    this.playersLen = this.playersNames.length;
    this.state = State("start");
  }
  // onState (event) => ()
  start(send, sendPoll, endGame) {
    if (this.loop) throw new Error("already started");

    console.log("starting game");
    this.send = send;
    this.sendPoll = sendPoll;
    this.endGame = endGame;

    this.resume();
  }

  async poll(msg, optionPoll, options) {
    this.stop();
    options = options || { open_period: 10 };
    options.players = this.playersLen;
    const result = await this.sendPoll(msg, optionPoll, options);
    this.resume();
    return result;
  }

  resume() {
    this.loop = setInterval(this._run.bind(this), SPEED);
    this.started = true;
    this._run();
  }
  stop() {
    clearInterval(this.loop);
    this.started = false;
  }

  act(player, cmd, params) {
    let action = null;
    let p = this.players[player];

    switch (cmd) {
        case "aid": {
            if(!params) {
                this.send(`${player} aid who?`);
                return;
            }

            const target = params;
            if(this.playersNames.indexOf(target) === -1) {
                this.send(`${player} invalid aid target: ${target}`);
                return;
            }
            const tp = this.players[target];

            console.log('aiding', params[0]);
            if(tp.hp === tp.hpMax) {
                this.send(`${target} is at max health of ${tp.hp}.`);
                return;
            }
            tp.hp += 1;
            tp.hp = Math.min(tp.hp, tp.hpMax);
            this.send(`💊${player} gave 1hp to ${target}.\n${target} now has ${tp.hp}.`);
        }
      case "attack": {
        if (!this.state.mobs?.length) {
          action = `${player} can't find anything here to attack.`;
          break;
        }
        const mobIx = rint(this.state.mobs.length);
        const mob = this.state.mobs[mobIx];
        const dm = rint(p.dm, 1);

        action = `⚔️${player} attacks ${mob.name} for ${dm}!`;

        mob.hp -= dm;
        if (mob.hp > 0) action += ` ${mob.name} has ${mob.hp}hp left.`;
        else {
          action += `\n$💀{mob.name} has died!`;
          this.state.mobs = this.state.mobs.filter((x) => x.hp > 0);
        }
      }
    }

    if (action && this.send) this.send(action);
  }
  _genMob() {
    return MOBS[rint(MOBS.length, 0)];
  }
  _makeMob(mob) {
    mob = mob || this._genMob();
    return Object.assign({}, MOBS_STATS[mob]);
  }
  async _run() {
    let action = null;

    // all dead
    if (this.state.name !== "dead" && this.playersArr.every((x) => x.hp === 0)) {
      this.state = State("dead");
    }

    let statename = this.state.name;

    this.state.ticks++;

    switch (statename) {
        case "dead":
            if (this.state.ticks !== 1) return;
            action = `⚰️⚰️⚰️Party has died :( \n Press /start to begin again.`;
            this.endGame();
            this.stop();
            break;
      case "start":
        // battle transition
        if (this.state.ticks === 1) {
          const l = await this.poll("Where does the party go?", [
            "north",
            "east",
            "south",
            "west",
          ]);

          action = `The party begins walking ${l} down the road.`;
          break;
        }
        if (Math.random() > 0.3) {
          this.state = State("battle");

          const list = Array(rint(3, 1)).fill(0);
          // const mob = this._genMob();
          const mobs = list.map((_) => this._makeMob());
          this.state.mobs = mobs;

          if (mobs.length === 1) action = `You see a ${mobs[0].name}!`;
          else
            action = `You see a band of ${mobs.map((x) => x.name).join(", ")}!`;
          break;
        }
        action = "The party travels for awhile.";
        break;
      case "battle":
        if (this.state.mobs.length === 0) {
          action = `🎉Battle was won! Found ${rint(100, 0)} gold 💰💰💰`;
          this.state = State("start");
          break;
        }
        const rnd = Math.random();
        const mobIx = rint(this.state.mobs.length);
        const mob = this.state.mobs[mobIx];

        if (rnd > 0.5) {
          if (this.state.mobs.length === 0) {
            break;
          }

          const player = this.playersNames[rint(this.playersLen)];

          const playerO = this.players[player];
          const dm = rint(mob.dm, 1);
          action = `🥊 The ${mob.name} attacks ${player} for ${dm}! Press /attack now!`;

          playerO.hp -= dm;
          if (playerO.hp > 0) action += `\n${player} has ${playerO.hp}hp left.`;
          else action += `\n⚰️${player} has died!`;

          break;
        } else {
          if (rnd > 0.7) action = `${mob.name} prepares an attack...`;
          else action = null; // say nothing
          break;
        }
    }

    if (action && this.send) this.send(action);
  }
}

module.exports = { Game: Game };

function rint(max, min) {
  min = min || 0;
  max = max - min;
  return Math.floor(Math.random() * max + min);
}
