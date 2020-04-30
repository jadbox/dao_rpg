const NUM_BATTLES = 2; // number of battles before boss
const SPEED = 2000 * 2.00;

const MOBS_STATS = {
  rat: { hp: 3, dm: 2 },
  skeleton: { hp: 3, dm: 2 },
  slug: { hp: 1, dm: 1 },
};
const MOBS = Object.keys(MOBS_STATS);
Object.keys(MOBS_STATS).forEach(k=>MOBS_STATS[k].name = k);

const BOSS_STATS = {
  'giant orc': { hp: 10, dm: 3 }
};
Object.keys(BOSS_STATS).forEach(k=>BOSS_STATS[k].name = k);

function State(name) {
  return {
    name: name,
    mobs: [],
    ticks: 0,
    path: "",
  };
}

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
    this.gstate = { path: '', numBattles: 0 };
    this.ended = false;
    this.started = false;
  }

  start(send, sendPoll, endGame, sendSticker) {
    if (this.loop) throw new Error("already started");

    console.log("starting game");
    this.send = send;
    this.sendPoll = sendPoll;
    this.endGame = endGame;
    this.sendSticker = sendSticker;

    sendSticker(
      "CgACAgQAAxkBAAIGol6kwbLtpQ5_uc2a8bLHKNB4lsAuAAJWAgACoz3tUtSzYsQxjrI1GQQ"
    );

    this.resume();
  }

  async poll(msg, optionPoll, options) {
    this.pause();
    options = options || { open_period: 10 };
    options.players = this.playersLen;
    const result = await this.sendPoll(msg, optionPoll, options);
    this.resume();
    if(this.ended) throw new Error('game ended');
    return result;
  }

  resume() {
    if (this.started) return;
    if (this.ended) {
      return;
    }
    this.loop = setInterval(this._run.bind(this), SPEED);
    this.started = true;
    // this._run();
  }

  quit() {
    this.pause();
    if(!this.ended) this.endGame();
    this.ended = true;
  }

  pause() {
    if (this.started) clearInterval(this.loop);
    this.loop = null;
    this.started = false;
  }

  act(player, cmd, params) {
    let action = null;
    let p = this.players[player];

    if (!p) {
      this.send(`Sorry, ${player} is not in the quest.`);
      return;
    }

    if (p.hp === 0) {
      this.send(
        `Sorry, ${player} is dead. Someone can heal ${player} by "/heal ${player}".`
      );
      return;
    }

    switch (cmd) {
      case "aid": {
        if (!params) {
          this.send(`${player} aid who?`);
          return;
        }

        const target = params;
        if (this.playersNames.indexOf(target) === -1) {
          this.send(`${player} invalid aid target: ${target}`);
          return;
        }
        const tp = this.players[target];

        console.log("aiding", params[0]);
        if (tp.hp === tp.hpMax) {
          this.send(`${target} is at max health of ${tp.hp}.`);
          return;
        }
        tp.hp += 1;
        tp.hp = Math.min(tp.hp, tp.hpMax);
        this.send(
          `💊${player} gave 1hp to ${target}.\n${target} now has ${tp.hp}.`
        );
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
          action += `\n💀${mob.name} has died!`;
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
  _genBoss() {
    const bossNames = Object.keys(BOSS_STATS);
    return bossNames[rint(bossNames.length, 0)];
  }
  _makeBoss(mob) {
    mob = mob || this._genBoss();
    return Object.assign({}, BOSS_STATS[mob]);
  }
  async _run() {
    let action = null;

    // all dead
    if (
      this.state.name !== "dead" &&
      this.playersArr.every((x) => x.hp === 0)
    ) {
      this.state = State("dead");
    }

    let statename = this.state.name;

    this.state.ticks++;
    const ticks = this.state.ticks;
    // console.log("statename", this.state.ticks);

    switch (statename) {
      case "dead":
        if (this.state.ticks !== 1) return;
        this.sendSticker(
          "CgACAgQAAxkBAAIG3l6kwuORUguOafjfk6GJKWV_SaXuAAIiAgAC3uj0Ulw22nzaA9W9GQQ"
        );
        action = `⚰️⚰️⚰️Party has died :( \n Press /start to begin again.`;
        this.quit();
				break;
			case "traveling":
        if(this.gstate.numBattles===NUM_BATTLES+1) {
          this.send('You\'ve completed the quest! Press /join to join in on a new mission.');
          this.quit();
          this.state = State("traveling");
          break;
        }
        // overwise carry into start
      case "start":
        // battle transition
        // if at start of traveling stage or random fork

        if (ticks === 1 || (Math.random() > .7 && ticks % 2 === 1) ) {
          let l = null;
          if (
            this.gstate.path?.indexOf("dungeon") > -1
          ) {
            l = await this.poll(
              "You're in a dungeon. There are two old doors in front of you:",
              [
                "through the left dungeon door",
                "through the right dungeon door",
                "down the dungeon stairs",
                "end game",
              ]
            );
          } else if (
            this.gstate.path?.indexOf("forest") > -1
          ) {
            l = await this.poll(
              "You're in the forest. Where does the party go now?",
              [
                "along a forest river",
                "following the forest road",
                "end game",
              ]
            );
          } else { // if(!this.gstate.path) 
            l = await this.poll("Where does the party go?", [
              "into the dungeon",
              "into the dark forest",
              "end game",
            ]);
          }

          if (l === "end game") {
            this.quit();
            action = `game ended. Type /start to begin.`;
            break;
          }

          this.gstate.path = l;
          if (l === "into the dungeon") {
            this.sendSticker(
              "CgACAgQAAxkBAAIHfF6kx7Flv1xxkY3hnZAjE4FzVzYTAAJpAgAD6u1SwfbnP55tLsUZBA"
            );
          } else if (l === "into the dark forest") {
            this.sendSticker(
              "CgACAgQAAxkBAAIHfl6kyC3bqdc4or1uBgvmUhJ5dewQAAIiAgACXlXtUmMc11QVRzApGQQ"
            );
          }

          action = `The party travels ${l}!`;
          break;
        }
        if (
          (this.state.ticks > 2 && Math.random() > 0.5) ||
          this.state.ticks === 6
        ) {
          this.state = State("battle");

          const list = Array(rint(3, 1)).fill(0);
          // const mob = this._genMob();
          let mobs = [];

          // Make boss
          if(this.gstate.numBattles===NUM_BATTLES) {
            mobs = [this._makeBoss()];
            this.send('You approach the boss! Get ready!');
          } else {
            mobs = list.map((_) => this._makeMob());
          }

          this.state.mobs = mobs;

          this.sendSticker(
            "CgACAgQAAxkBAAIGsV6kwf1tL9MAAe0ThA8x2NnqI6SNJwACawIAAqxALFGXDj5567OOwRkE"
          );

          if (mobs.length === 1) action = `You see a ceature approach: a ${mobs[0].name}!`;
          if (mobs.length === 2) action = `You see two creatures approaching: a ${mobs[0].name} and a ${mobs[1].name}!`;
          else
            action = `You see a band of ${mobs.map((x) => x.name).join(", ")} approaching!`;

          action += " Type /attack to get it!";
          break;
        }
        action = "The party travels for awhile.";
        break;
      case "battle":
        if (this.state.mobs.length === 0) {
          action = `🎉Battle was won! Found ${rint(100, 0)} gold 💰💰💰`;

          this.gstate.numBattles++;
          this.state = State("traveling");

          this.sendSticker(
            "CgACAgQAAxkBAAIHkF6kyGV6ZVQ6OuV0GPbveB-y_pVlAAJqAgACmu8sUbwLetsPCbbzGQQ"
          );
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
