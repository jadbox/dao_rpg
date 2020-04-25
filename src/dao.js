class Dao {
    constructor(room) {
        this.proposal = [];
        this.state = {name:'start', proposals:[]};
    }
    add(p) {
        this.state.proposals.add(p);
        this.state = DaoState('vote');
    }
    act(player, cmd) {
        const result = null;

        return result;
    }
    run() {

    }
}

function DaoState(name) {
    return {name, proposals:[]};
}

let ID = 0;
class Proposal {
    constructor(title) {
        this.id = ++ID;
        this.title = title;
        this.votes = [0, 0]; // yes, no
    }
    
}

module.exports = {Proposal, DAO};