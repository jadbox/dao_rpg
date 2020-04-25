const { Game } = require('./game');
const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = '1195063908:AAFmB45q7IivgLMC64x8nopRyk7yaJNnGsA';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

console.log('starting engine');
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

bot.onText(/\/start (.+)/, (msg, match) => {
  console.log(msg.from.username);
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = "Welcome raid party! Who's going to join this raid? Say: /join or just join."; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Join the party
bot.onText(/\/join/, (msg, match) => {
    const chatId = msg.chat.id;
    const room = rooms[chatId] = rooms[chatId] || Room();
    rooms[chatId] = room;

    if(room.game) {
        bot.sendMessage(chatId, 'sorry, game has already started');
        return;
    }

    const user = msg.from.username;
    room.players[user] = Player(user);

    bot.sendMessage(chatId, `${msg.from.username} thanks for joining. Type /play once everyone has joined.`);
});

function Room() {
    return {
        players: {},
        game: null
    };
}
function Player(name) {
    return {
        hp: 30,
        hpMax: 30,
        dm: 3,
        name: name
    }
}
let rooms = {};

const onState = (chatId, state) => {
    if(!state) return;
    console.log(Date.now() + ':' + chatId, state);
    bot.sendMessage(chatId, state);
}

bot.onText(/\/(stop|pause)/, (msg, match) => {
    const chatId = msg.chat.id;
  
    let room = rooms[chatId];
    if(!room || !room.game) {
        bot.sendMessage(chatId, `Game not started yet.`);
        return;
    }
    
    room.game.stop();
    bot.sendMessage(chatId, `Game is stopped. /play to resume.`);
});

bot.onText(/\/play/, (msg, match) => {
  const chatId = msg.chat.id;

  let room = rooms[chatId];

  if(room && room.game) {
      room.game.resume();
      bot.sendMessage(chatId, `Game is resuming...`);
      return;
  }
  if(!room) {
    // bot.sendMessage(chatId, 'must /join the party first');
    room = rooms[chatId] = Room();

    const user = msg.from.username;
    room.players[user] = Player(user);
    // return;   
  }

  const game = room.game = new Game(room);

  
  game.start( onState.bind(this, chatId) );
  bot.sendMessage(chatId, `Game is starting- good luck! /stop to stop.`);
});

bot.onText(/[\/]?(attack|kill|swing)/, (msg, match) => {
    const chatId = msg.chat.id;
    let room = rooms[chatId];
    const user = msg.from.username;

    room.game.act(user, "attack");
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  // console.log(msg.from.username, match[0]);

  // send a message to the chat acknowledging receipt of their message
  // bot.sendMessage(chatId, 'Received your message');
});
