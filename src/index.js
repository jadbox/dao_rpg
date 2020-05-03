require("dotenv").config();
console.log("DAO_RPG_TOKEN", process.env.DAO_RPG_TOKEN);
const { Game } = require("./game");
const TelegramBot = require("node-telegram-bot-api");

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.DAO_RPG_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

console.log("starting engine");
// Matches "/echo [whatever]"

bot.onText(/\/echo (.+)/, (msg, match) => {
  console.log(msg.from.username);
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/end/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!rooms[chatId] || !rooms[chatId].game) {
    return;
  }

  rooms[chatId].game.quit();

  rooms[chatId] = Room(); // clear out room

  send(chatId, "game ended");
});

bot.onText(/\/start (.+)/, (msg, match) => {
  console.log(msg.from.username);
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  const chatId = msg.chat.id;
  if (rooms[chatId]) {
  }

  const resp =
    "Welcome raid party! Who's going to join this raid? Say: /join or just join."; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Join the party
bot.onText(/\/join/, (msg, match) => {
  const chatId = msg.chat.id;
  const user = msg.from.username;
  if (!user || user === "undefined") {
    bot.sendMessage(
      chatId,
      `Please set up a Telegram username first in your Telegram settings.`
    );
    return;
  }
  const room = (rooms[chatId] = rooms[chatId] || Room());
  rooms[chatId] = room;

  if (room.game) {
    bot.sendMessage(chatId, "sorry, game has already started");
    return;
  }

  room.players[user] = Player(user);

  bot.sendMessage(
    chatId,
    `${msg.from.username} thanks for joining. Type /play ONLY once everyone has joined.`
  );
});

// Leave the party
bot.onText(/\/leave/, (msg, match) => {
  const chatId = msg.chat.id;
  const user = msg.from.username;

  const room = (rooms[chatId] = rooms[chatId] || Room());
  rooms[chatId] = room;

  if (room.game) {
    bot.sendMessage(chatId, "sorry, game has already started");
    return;
  }

  delete room.players[user];

  bot.sendMessage(
    chatId,
    `${msg.from.username} left the party.`
  );
});

function Room() {
  return {
    players: {},
    game: null,
  };
}
function Player(name) {
  return {
    hp: 8,
    hpMax: 8,
    dm: 3,
    name: name,
  };
}
let rooms = {};

const send = (chatId, msg) => {
  if (!msg) return;

  // Date.now() + ':' +
  console.log(chatId, msg);
  bot.sendMessage(chatId, msg);
};

const sendPoll = async (chatId, question, pollOptions, options) => {
  const open_period = (options.open_period = options.open_period || 10);
  const players = options.players;

  // console.log("sendPoll", chatId, question, pollOptions, options);
  const p = await bot.sendPoll(chatId, question, pollOptions, options);
  const id = p.poll.id; // message_id;
  // console.log("p", p);

  let lastPoll = [];
  let total_voter_count = 0;
  let timeOut = null;

  return new Promise((res) => {
    const onTimeOut = () => {
      if (timeOut) clearTimeout(timeOut);
      timeOut = null;
      // console.log("poll finished", lastPoll);
      lastPoll.sort(function (a, b) {
        return b.voter_count - a.voter_count;
      });
      const winner = lastPoll.length > 0 ? lastPoll[0].text : pollOptions[0];
      let voter_count = lastPoll.length > 0 ? lastPoll[0].voter_count : 0;
      const rmsg = `Proposal <${String(
        winner
      ).toUpperCase()}> won with ${voter_count} vote.`;

      // send(chatId, rmsg);
      bot.removeListener("poll", onPoll);
      res(winner);
    };

    var onPoll = (poll) => {
      // console.log("poll.message_id!==id", poll, poll.id, id);
      if (poll.id !== id) return; //  || poll.is_closed===false
      lastPoll = [...poll.options];
      total_voter_count = poll.total_voter_count;
      // console.log("total_voter_count === players", total_voter_count, players);
      if (total_voter_count === players) onTimeOut();
    };

    timeOut = setTimeout(onTimeOut, open_period * 1000);
    bot.on("poll", onPoll);
  });
  // bot.on('message', console.log.bind(console));
};

bot.onText(/\/(stop|pause)/i, (msg, match) => {
  const chatId = msg.chat.id;

  let room = rooms[chatId];
  if (!room || !room.game) {
    bot.sendMessage(chatId, `Game not started yet.`);
    return;
  }

  room.game.pause();
  send(chatId, `Game is stopped. /play to resume or /end to end quest.`);
});

bot.onText(/\/(play)/i, (msg, match) => {
  const chatId = msg.chat.id;
  const user = msg.from.username;

  let room = rooms[chatId];

  if (!room || !room?.players[user]) {
    bot.sendMessage(
      chatId,
      `Pleae join the quest first before starting by using /join`
    );
    return;
  }

  if (room.game) {
    room.game.resume();
    send(chatId, `Game is resuming...`);
    return;
  }

  const game = (room.game = new Game(room));

  const _sendMsg = send.bind(this, chatId);
  const _sendPoll = sendPoll.bind(this, chatId);

  const onGameEnded = () => {
    // _sendMsg('Game Over.');
    if (rooms[chatId]) rooms[chatId] = null;
  };
  const _sendSticked = (id, type) => {
    console.log("_sendSticked", id, type);
    if (type === "sticker") bot.sendSticker(chatId, id);
    else if (type === "animation" || true) bot.sendDocument(chatId, id);
  };

  game.start(_sendMsg, _sendPoll, onGameEnded, _sendSticked);
  bot.sendMessage(chatId, `Game is starting- good luck! /stop to stop.`);
});

bot.onText(/[\/]?(attack|kill|swing|⚔️|🤺|🏹|🗡|🔫|⛓|🔪|🧨)/i, (msg, match) => {
  const chatId = msg.chat.id;
  const user = msg.from.username;
  let room = rooms[chatId];
  if (!room?.game) {
    // send(chatId, "no game created");
    return;
  }

  room.game.act(user, "attack");
});

bot.onText(/[\/]?(aid|heal|1up|🍿|🛡|💊|🥪) (.*)/i, (msg, match) => {
  const chatId = msg.chat.id;
  const room = rooms[chatId];
  const user = msg.from.username;

  if (match[1]?.toLowerCase() === "1up") {
    // console.log("room.game?.state?.name", match[1]);
    if (!room?.game) return;
    if (room?.game?.state?.name !== "battle") return;
  }
  if (!room?.game) {
    send(chatId, "no game created");
    return;
  }

  // console.log("match", match, match[2]);

  const params = match[2].replace("@", "");
  room.game.act(user, "aid", params);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on("message", (msg, match) => {
  const chatId = msg.chat.id;

  if (!match?.type) return;
  if (!msg?.sticker?.file_id && !msg?.animation?.file_id) return;
  console.log("match type", match?.type);
  console.log("Sticker", msg?.sticker?.file_id);
  console.log("Animation", msg?.animation?.file_id, msg?.animation);
});

bot.onText(/\/test/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendDocument(
    chatId,
    "CgACAgQAAxkBAAIGnF6kwDGFj_M0kZ-skV-Kuoe-L_xvAAJrAgACrEAsUZcOPnnrs47BGQQ"
  );
});

bot.onText(/\/start/, (msg, match) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `Welcome to DAO RPG! Type /join to form a new party.`
  );
});

bot.onText(/\/help/, (msg, match) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `Basic commands:\nAttack: /attack\nheal: /heal PLAYER_NAME`
  );
});
