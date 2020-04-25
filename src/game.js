const MOBS = ["rat", "skeleton", "slug"];
const MOBS_STATS = { rat: {hp: 1, name: 'rat', dm: 1}, skeleton: {hp:1, name: 'skeleton', dm: 1}, slug: {hp:1, name: 'slug', dm: 1}};

function State(name) {
    return {
        name: name,
        mobs: [],
        ticks: 0
    }
}

const SPEED = 3500 * 1;

class Game {
    constructor(room) {
        console.log('Game room', room);
        this.room = room || { players: {'jadbox':{name:'jadbox', hp: 20, dm: 3 }} };
        this.players = this.room.players;
        this.playersArr = Object.keys(this.room.players);
        this.playersLen = this.playersArr.length;
        this.state = State('start');
    }
    // onState (event) => ()
    start(onState) {
        if(this.loop) throw new Error('already started');

        console.log('starting game');
        this.onState = onState;

        this.resume();
    }

    resume() {
        this.loop = setInterval(this._run.bind(this), SPEED);
        this.started = true;
    }
    stop() {
        clearInterval(this.loop);
        this.started = false;
    }

    act(player, cmd) {
        let action = null;
        let p = this.players[player];

        switch(cmd) {
            case "attack": {
                if(!this.state.mobs?.length) {
                    action =`${player} can't find anything here to attack.`;
                    break;
                }
                const mobIx = rint(this.state.mobs.length);
                const mob = this.state.mobs[mobIx];
                const dm = rint(p.dm, 1);

                action =`${player} attacks ${mob.name} for ${dm}!`;

                mob.hp -= dm;
                if(mob.hp>0) action += ` ${mob.name} has ${mob.hp}hp left.`;
                else {
                    action += ` ${mob.name} has died!`;
                    this.state.mobs = this.state.mobs.filter(x=>x.hp > 0);
                }
            }
        }


        if(action && this.onState) this.onState(action);
    }
    _genMob() {
        return MOBS[rint(MOBS.length, 0)];
    }
    _makeMob(mob){
        mob = mob || this._genMob();
        return Object.assign({}, MOBS_STATS[ mob ]);
    }
    _run() {
        let action = null;
        const statename = this.state.name;
        this.state.ticks++;

        switch(statename) {
            case "start":
                // battle transition
                if(this.state.ticks === 1) {
                    action = "The party be begins walking down the road.";
                    break;
                }
                if(Math.random() > .3) {
                    this.state = State("battle");

                    const list = Array(rint(3, 1)).fill(0);
                    // const mob = this._genMob();
                    const mobs = list.map( _ => this._makeMob() );
                    this.state.mobs = mobs;

                    if(mobs.length === 1) action =`You see a ${mobs[0].name}!`;
                    else action =`You see a band of ${mobs.map(x=>x.name).join(', ')}!`;
                    break;
                }
                action = "The party travels for awhile."
                break;
            case "battle":
                if(this.state.mobs.length === 0) {
                    action = `Battle was won! Found ${rint(100,0)} gold.`;
                    this.state = State("start");
                    break;
                }
                const rnd = Math.random();
                const mobIx = rint(this.state.mobs.length);
                const mob = this.state.mobs[mobIx];

                if(rnd > .5) {
                    if(this.state.mobs.length === 0) {
                        break;
                    }
                    
                    const player = this.playersArr[rint(this.playersLen)];

                    const playerO = this.players[player];
                    const dm = rint(mob.dm, 1);
                    action =`${mob.name} attacks ${player} for ${dm}!`;
                    
                    playerO.hp -= dm;
                    if(playerO.hp>0) action += ` ${player} has ${playerO.hp}hp left.`;
                    else action += ` ${player} has died!`;

                    break;
                }
                else {
                    if(rnd > .7) action = `${mob.name} prepares an attack...`;
                    else action = null; // say nothing
                    break;
                }
        }
        
        
        

        if(action && this.onState) this.onState(action);
    }
}

module.exports = { Game: Game };

function rint(max, min) {
    min = min || 0;
    max = max - min;
    return Math.floor( Math.random() * max + min);
}