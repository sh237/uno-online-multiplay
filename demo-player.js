const socketIoClient = require('socket.io-client');
const process = require('process');
const BlueBird = require('bluebird');

const SocketConst = {
  EMIT: {
    JOIN_ROOM: 'join-room',
    RECEIVER_CARD: 'receiver-card',
    FIRST_PLAYER: 'first-player',
    COLOR_OF_WILD: 'color-of-wild',
    SHUFFLE_WILD: 'shuffle-wild',
    NEXT_PLAYER: 'next-player',
    PLAY_CARD: 'play-card',
    DRAW_CARD: 'draw-card',
    PLAY_DRAW_CARD: 'play-draw-card',
    CHALLENGE: 'challenge',
    PUBLIC_CARD: 'public-card',
    SAY_UNO_AND_PLAY_CARD: 'say-uno-and-play-card',
    POINTED_NOT_SAY_UNO: 'pointed-not-say-uno',
    SPECIAL_LOGIC: 'special-logic',
    FINISH_TURN: 'finish-turn',
    FINISH_GAME: 'finish-game',
  },
};

const Special = {
  SKIP: 'skip',
  REVERSE: 'reverse',
  DRAW_2: 'draw_2',
  WILD: 'wild',
  WILD_DRAW_4: 'wild_draw_4',
  WILD_SHUFFLE: 'wild_shuffle',
  WHITE_WILD: 'white_wild',
};

const Color = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
  BLUE: 'blue',
  BLACK: 'black',
  WHITE: 'white',
};

const DrawReason = {
  DRAW_2: 'draw_2',
  WILD_DRAW_4: 'wild_draw_4',
  BIND_2: 'bind_2',
  NOTING: 'nothing',
};

const SPECIAL_LOGIC_TITLE = '○○○○○○○○○○○○○○○○○○○○○○○○○○○○';
const ARR_COLOR = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];
const TEST_TOOL_HOST_PORT = '3000';
const TIME_DELAY = 10;

console.log('Start demo player ...');

process.env.HOST = process.argv[2] || '';
process.env.DEALER = process.argv[3] || '';
process.env.PLAYER = process.argv[4] || '';

const host = process.env.HOST;
const room_name = process.env.DEALER;
const player = process.env.PLAYER;
const eventName = process.argv[5] || '';
const isTestTool = host.includes(TEST_TOOL_HOST_PORT);

console.log({ host, room_name, player, isTestTool, eventName });

const TEST_TOOL_EVENT_DATA = {
  'join-room': {
    player,
    room_name,
  },
  'play-card': {
    card_play: { color: 'red', number: 6 },
  },
  'color-of-wild': {
    color_of_wild: 'red',
  },
  'draw-card': {},
  'play-draw-card': {
    is_play_card: true,
  },
  'say-uno-and-play-card': {
    card_play: { color: 'red', number: 6 },
  },
  'pointed-not-say-uno': {
    target: 'Player 1',
  },
  challenge: {
    is_challenge: true,
  },
  'special-logic': {
    title: SPECIAL_LOGIC_TITLE,
  },
};

let id = '';
let cardsGlobal = [];
const unoDeclared = {};

if (!host) {
  console.log('Host missed');
  process.exit();
}
if (!room_name || !player) {
  console.log('Arguments invalid');
  // If test-tool, ignore exit
  if (!isTestTool) {
    process.exit();
  }
}

const client = socketIoClient.connect(host, {
  transports: ['websocket'],
});

/**
 * 共通エラー処理
 * @param {string} event イベント名
 * @param {object} err エラーオブジェクト
 * @returns
 */
function handleError(event, err) {
  if (!err) {
    return;
  }

  console.log(`${event} event failed!`);
  console.log(err);
}

/** イベント送信 */
function sendJoinRoom(data) {
  console.log(`${SocketConst.EMIT.JOIN_ROOM} dataReq: `, data);
  client.emit(SocketConst.EMIT.JOIN_ROOM, data, (err, res) => {
    if (err) {
      handleError(SocketConst.EMIT.JOIN_ROOM, err);
      return;
    } else {
      console.log('Client join room successfully!');
      console.log(res);
      id = res.your_id;
    }
  });
}

function sendColorOfWild(data) {
  console.log(`${SocketConst.EMIT.COLOR_OF_WILD} dataReq: `, data);
  client.emit(SocketConst.EMIT.COLOR_OF_WILD, data, (err) => {
    handleError(SocketConst.EMIT.COLOR_OF_WILD, err);
  });
}

function sendPlayCard(data) {
  console.log(`${SocketConst.EMIT.PLAY_CARD} dataReq: `, data);
  client.emit(SocketConst.EMIT.PLAY_CARD, data, (err) => {
    handleError(SocketConst.EMIT.PLAY_CARD, err);
  });
}

function sendDrawCard() {
  console.log(`${SocketConst.EMIT.DRAW_CARD} dataReq:`, {});
  client.emit(SocketConst.EMIT.DRAW_CARD, {}, (err) => {
    handleError(SocketConst.EMIT.DRAW_CARD, err);
  });
}

function sendPlayDrawCard(data) {
  console.log(`${SocketConst.EMIT.PLAY_DRAW_CARD} dataReq: `, data);
  client.emit(SocketConst.EMIT.PLAY_DRAW_CARD, data, (err) => {
    handleError(SocketConst.EMIT.PLAY_DRAW_CARD, err);
  });
}

function sendSayUnoPlayCard(data) {
  console.log(`${SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD} dataReq: `, data);
  client.emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, data, (err) => {
    handleError(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, err);
  });
}

function sendPointedNotSayUno(data) {
  console.log(`${SocketConst.EMIT.POINTED_NOT_SAY_UNO} dataReq: `, data);
  client.emit(SocketConst.EMIT.POINTED_NOT_SAY_UNO, data, (err) => {
    handleError(SocketConst.EMIT.POINTED_NOT_SAY_UNO, err);
  });
}

function sendChallenge(data) {
  console.log(`${SocketConst.EMIT.CHALLENGE} dataReq: `, data);
  client.emit(SocketConst.EMIT.CHALLENGE, data, (err) => {
    handleError(SocketConst.EMIT.CHALLENGE, err);
  });
}

function sendSpecialLogic(data) {
  console.log(`${SocketConst.EMIT.SPECIAL_LOGIC} dataReq: `, data);
  client.emit(SocketConst.EMIT.SPECIAL_LOGIC, data, (err) => {
    handleError(SocketConst.EMIT.SPECIAL_LOGIC, err);
  });
}

/**
 * cardPlayBeforeに基づき、プレイヤーの手札にある全てのカードを取得する関数です。
 * cardsValid は Skip、Draw_2、Reverse で構成されています。
 * cardsWild は Wild と Wild_shuffle と White_wild で構成されています。
 * cardsWild4 は Wild_draw_4 のみで構成されています。
 * cardPlayBefore is card before play of before Player.
 * mustCallDrawCard have value is true or false. If mustCallDrawCard = true, Player only call event draw-card to draw more cards from Desk.
 */
function getCardPlayValid(cardPlayBefore, cards, mustCallDrawCard) {
  let cardsValid = [];
  let cardsWild = [];
  let cardsWild4 = [];

  if (String(mustCallDrawCard) === 'true') {
    return {
      cardsValid,
      cardsWild,
      cardsWild4,
    };
  }

  for (const card of cards) {
    if (String(card.special) === Special.WILD_DRAW_4) {
      cardsWild4.push(card);
    } else if (
      String(card.special) === Special.WILD ||
      String(card.special) === Special.WILD_SHUFFLE ||
      String(card.special) === Special.WHITE_WILD
    ) {
      cardsWild.push(card);
    } else if (String(card.color) === String(cardPlayBefore.color)) {
      cardsValid.push(card);
    } else if (
      (card.special && String(card.special) === String(cardPlayBefore.special)) ||
      ((card.number || Number(card.number) === 0) &&
        Number(card.number) === Number(cardPlayBefore.number))
    ) {
      cardsValid.push(card);
    }
  }

  return {
    cardsValid,
    cardsWild,
    cardsWild4,
  };
}

/**
 * 乱数取得
 * @param {number} num
 * @returns
 */
function randomByNumber(num) {
  return Math.floor(Math.random() * num);
}

/**
 * プレイヤーのカードを削除する機能。
 * 例：プレイヤー1が赤9と黄8の2枚のカードを持っている。プレイヤー1が赤9をプレイ→プレイヤー1は黄8を残す。
 */
function removeCardOfPlayer(cardPlay, cardsOfPlayer) {
  let isRemove = false;
  const newCardsOfPlayer = [];
  for (const cardValidate of cardsOfPlayer) {
    if (isRemove) {
      newCardsOfPlayer.push(cardValidate);
      continue;
    } else if (cardPlay.special) {
      if (cardPlay.color === cardValidate.color && cardPlay.special === cardValidate.special) {
        isRemove = true;
        continue;
      } else {
        newCardsOfPlayer.push(cardValidate);
        continue;
      }
    } else {
      if (
        cardPlay.color === cardValidate.color &&
        Number(cardPlay.number) === Number(cardValidate.number)
      ) {
        isRemove = true;
        continue;
      } else {
        newCardsOfPlayer.push(cardValidate);
        continue;
      }
    }
  }

  return newCardsOfPlayer;
}

function executePlay(total, playCards) {
  const cardPlay = playCards[randomByNumber(playCards.length)];
  const data = { card_play: cardPlay };
  if (total === 2) {
    // call event say-uno-and-play-card
    sendSayUnoPlayCard(data);
  } else {
    // call event play-card
    sendPlayCard(data);
  }
}

async function determineIfExecutePointedNotSayUno(number_card_of_player) {
  let target;
  for (const [k, v] of Object.entries(number_card_of_player)) {
    if (v === 1) {
      target = k;
      break;
    } else if (Object.keys(unoDeclared).indexOf(k) > -1) {
      delete unoDeclared[k];
    }
  }

  if (target && target !== id && Object.keys(unoDeclared).indexOf(target) === -1) {
    sendPointedNotSayUno({ target });
    await BlueBird.delay(TIME_DELAY);
  }
}

/* イベント受信 */
client.on('connect', () => {
  console.log('Client connect successfully!');
  if (isTestTool) {
    if (!eventName) {
      console.log('Not found event name');
      return;
    }
    const eventData = TEST_TOOL_EVENT_DATA[eventName];
    if (eventName && !eventData) {
      console.log('Undefined event name');
      return;
    }
    switch (eventName) {
      case SocketConst.EMIT.JOIN_ROOM:
        sendJoinRoom(eventData);
        return;
      case SocketConst.EMIT.COLOR_OF_WILD:
        sendColorOfWild(eventData);
        return;
      case SocketConst.EMIT.PLAY_CARD:
        sendPlayCard(eventData);
        return;
      case SocketConst.EMIT.DRAW_CARD:
        sendDrawCard(eventData);
        return;
      case 'play-draw-card':
      case SocketConst.EMIT.PLAY_DRAW_CARD:
        sendPlayDrawCard(eventData);
        return;
      case SocketConst.EMIT.CHALLENGE:
        sendChallenge(eventData);
        return;
      case SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD:
        sendSayUnoPlayCard(eventData);
        return;
      case SocketConst.EMIT.POINTED_NOT_SAY_UNO:
        sendPointedNotSayUno(eventData);
        return;
      case SocketConst.EMIT.SPECIAL_LOGIC:
        sendSpecialLogic(eventData);
        return;
    }
  } else {
    // メインシステムに接続
    const dataJoinRoom = {
      room_name,
      player,
    };
    sendJoinRoom(dataJoinRoom);
  }
});

client.on('disconnect', (dataRes) => {
  console.log('Client disconnect:');
  console.log(dataRes);
  process.exit();
});

client.on(SocketConst.EMIT.JOIN_ROOM, (dataRes) => {
  console.log(`join room : dataRes:`, dataRes);
});

client.on(SocketConst.EMIT.RECEIVER_CARD, (dataRes) => {
  console.log(`${id} receive cards :`);
  console.log(dataRes);
  const cards = cardsGlobal || [];
  cardsGlobal = cards.concat(dataRes.cards_receive);
  console.log(`${SocketConst.EMIT.RECEIVER_CARD} cardsGlobal:`, cardsGlobal);
});

client.on(SocketConst.EMIT.FIRST_PLAYER, (dataRes) => {
  console.log(`${dataRes.first_player} is first player.`);
  console.log(dataRes);
});

client.on(SocketConst.EMIT.COLOR_OF_WILD, () => {
  const colorOfWild = ARR_COLOR[randomByNumber(ARR_COLOR.length)];
  const data = { color_of_wild: colorOfWild };
  sendColorOfWild(data);
});

client.on(SocketConst.EMIT.SHUFFLE_WILD, (dataRes) => {
  console.log(`${id} receive cards from shuffle wild.`);
  console.log(dataRes);
  cardsGlobal = dataRes.cards_receive;
  console.log(`${SocketConst.EMIT.SHUFFLE_WILD} cardsGlobal:`, cardsGlobal);
});

client.on(SocketConst.EMIT.PLAY_CARD, (dataRes) => {
  const cardPlay = dataRes.card_play;
  console.log(
    `${dataRes.player} play card ${cardPlay.color} ${cardPlay.special || cardPlay.number}.`,
  );
  console.log(`${SocketConst.EMIT.PLAY_CARD} dataRes:`, dataRes);
  if (dataRes.player === id && cardPlay) {
    cardsGlobal = removeCardOfPlayer(cardPlay, cardsGlobal);
    console.log('cardsGlobal after: ', cardsGlobal);
  }
});

client.on(SocketConst.EMIT.DRAW_CARD, (dataRes) => {
  console.log(`${SocketConst.EMIT.DRAW_CARD} dataRes:`, dataRes);
  if (dataRes.player === id) {
    if (dataRes.can_play_draw_card) {
      const data = { is_play_card: true };
      sendPlayDrawCard(data);
    } else {
      console.log(`${dataRes.player} can not play draw card.`);
    }
  }
});

client.on(SocketConst.EMIT.PLAY_DRAW_CARD, (dataRes) => {
  console.log(`${SocketConst.EMIT.PLAY_DRAW_CARD} dataRes:`, dataRes);
  console.log(`${dataRes.player} play draw card.`);
  if (dataRes.player === id && dataRes.is_play_card) {
    cardsGlobal = removeCardOfPlayer(dataRes.card_play, cardsGlobal);
  }
});

client.on(SocketConst.EMIT.CHALLENGE, (dataRes) => {
  if (dataRes.is_challenge) {
    if (dataRes.is_challenge_success) {
      console.log(`${dataRes.challenger} challenge successfully!`);
    } else {
      console.log(`${dataRes.challenger} challenge failed!`);
    }
  } else {
    console.log(`${dataRes.challenger} no challenge.`);
  }
});

client.on(SocketConst.EMIT.PUBLIC_CARD, (dataRes) => {
  console.log(`Public card of player ${dataRes.card_of_player}.`);
  console.log(dataRes.cards);
});

client.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, (dataRes) => {
  const cardPlay = dataRes.card_play;
  console.log(
    `${dataRes.player} play card ${cardPlay.color} ${
      cardPlay.special || cardPlay.number
    } and say UNO.`,
  );

  unoDeclared[dataRes.player] = true;

  if (dataRes.player === id && cardPlay) {
    cardsGlobal = removeCardOfPlayer(cardPlay, cardsGlobal);
    console.log('cardsGlobal after: ', cardsGlobal);
  }
});

client.on(SocketConst.EMIT.POINTED_NOT_SAY_UNO, (dataRes) => {
  if (String(dataRes.have_say_uno) === 'true') {
    console.log(`${dataRes.player} have say UNO.`);
  } else if (String(dataRes.have_say_uno) === 'false') {
    console.log(`${dataRes.player} no say UNO.`);
  }
});

client.on(SocketConst.EMIT.FINISH_TURN, (dataRes) => {
  console.log(`Finish turn ${dataRes.turn_no}.`);
  if (dataRes.winner) {
    console.log(`Winner turn ${dataRes.turn_no} is ${dataRes.winner}.`);
  } else {
    console.log(`Finish turn. No winner is this turn.`);
  }
  cardsGlobal = [];
});

client.on(SocketConst.EMIT.FINISH_GAME, (dataRes) => {
  console.log(dataRes);
  console.log(`Winner of game ${dataRes.winner}, turn win is ${dataRes.turn_win}.`);
});

client.on(SocketConst.EMIT.NEXT_PLAYER, async (dataRes) => {
  console.log(`${SocketConst.EMIT.NEXT_PLAYER} dataRes:`, dataRes);
  await BlueBird.delay(TIME_DELAY);
  console.log(`${dataRes.next_player} is next player. turn: ${dataRes.number_turn_play}`);

  await determineIfExecutePointedNotSayUno(dataRes.number_card_of_player);

  console.log('Run NEXT_PLAYER ...');
  // refresh cardsGlobal
  cardsGlobal = dataRes.card_of_player;
  console.log(cardsGlobal);
  const cards = cardsGlobal;
  const cardPlayBefore = dataRes.card_before;

  // playWiledDraw4Turnの直後のターンの場合 プレイの前にChallengeができます。
  // ただし、ホワイトワイルド（bind_2）の効果が発動している間はチャレンジができません。
  if (dataRes.draw_reason === DrawReason.WILD_DRAW_4) {
    // random challenge or not
    const numRandom = randomByNumber(2);
    const data = {
      is_challenge: numRandom ? true : false,
    };
    sendChallenge(data);
    // numRandom = 1の場合、プレイの前にChallengeすることを意味します。そして、ディーラーからのChallengeの結果を待ちます。
    if (numRandom) {
      return;
    }
  }

  const { cardsValid, cardsWild, cardsWild4 } = getCardPlayValid(
    cardPlayBefore,
    cards,
    dataRes.must_call_draw_card,
  );

  const specialLogicNumRundom = randomByNumber(10);
  if (specialLogicNumRundom === 0) {
    sendSpecialLogic({ title: SPECIAL_LOGIC_TITLE });
  }

  if (String(dataRes.must_call_draw_card) === 'true') {
    // If must_call_draw_card = true, Player must be call event draw_card
    sendDrawCard();
    return;
  } else if (cardsValid.length > 0) {
    //  If cardsValid.length > 0, Player can play card from array cardsValid
    executePlay(cards.length, cardsValid);
    return;
  } else if (cardsWild.length > 0) {
    // cardsWild.length > 0, Player can play card from array cardsWild
    executePlay(cards.length, cardsWild);
    return;
  } else if (cardsWild4.length > 0) {
    // If cardsWild4.length > 0, Player can play card from array cardsWild4
    executePlay(cards.length, cardsWild4);
    return;
  } else {
    // 有効なカードがない場合、プレイヤーはイベントDRAW_CARDを呼び出す必要があります。
    // 詳細はプレイヤー仕様書を参照してください。
    sendDrawCard();
    return;
  }
});

module.exports = {
  getCardPlayValid,
  Color,
  Special,
};
