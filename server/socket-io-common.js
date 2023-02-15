const Room = require('../room_data');
const mongoose = require('mongoose');
const { io } = require('socket.io-client');

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
      SAY_UNO_AND_PLAY_DRAW_CARD: 'say-uno-and-play-draw-card',
      POINTED_NOT_SAY_UNO: 'pointed-not-say-uno',
      SPECIAL_LOGIC: 'special-logic',
      FINISH_TURN: 'finish-turn',
      FINISH_GAME: 'finish-game',
      NOTIFY_CARD: 'notify-card',
      TIME_OUT: 'time-out',
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
}
const Color = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
  BLUE: 'blue',
  BLACK: 'black',
  WHITE: 'white',
}
const DrawReason = {
    DRAW_2: 'draw_2',
    WILD_DRAW_4: 'wild_draw_4',
    BIND_2: 'bind_2',
    NOTING: 'nothing',
}
const shuffle = ([...array]) => {
    for (let i = array.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

module.exports = {
    SocketConst: SocketConst,
    Special: Special,
    Color: Color,
    DrawReason: DrawReason,

    runTransaction : async function ( operations, args) {
      let session;
      try {
          session = await mongoose.startSession();
          // args[0] = session;
          // Start a transaction
          session.startTransaction();
          // Perform operations in the transaction
          await operations(...args);
          // Commit the transaction
          await session.commitTransaction();
      } catch (error) {
          console.log("Transaction aborting due to error:", error);
          // Abort the transaction if something went wrong
          await session.abortTransaction();
          throw error;
      } finally {
          // End the session
          if (session) {
              await session.endSession();
          }
      }
  },

    getPreviousPlayer : function (room) {
        if(room.is_reverse){
            return room.players_info.find((player) => player._id == room.order[(room.current_player + 1) % room.players_info.length]);
        }else{
            return room.players_info.find((player) => player._id == room.order[(room.current_player - 1 + room.players_info.length) % room.players_info.length]);
        }
    },
  
    getNextPlayer : function (room) {
        if(room.is_reverse){
            return room.players_info.find((player) => player._id == room.order[(room.current_player - 1 + room.players_info.length ) % room.players_info.length]);
        }else{
            return room.players_info.find((player) => player._id == room.order[(room.current_player + 1) % room.players_info.length]);
        }
    },

    checkMustCallDrawCard : function(room,room_name, player_id) {
        if(!room){
            Room.findOne({room_name: room_name}, (error, room) => {
                if (error) {
                    console.error(error);
                    return;
                }
                room = room;
            });
        }
        let is_must_call_draw_card = true;
        let player = room.players_info.find((player) => {
            return player._id == player_id;
        });

        if (!player) {
            console.error('player not found: room_name=' + room_name + ', player_id=' + player_id);
            console.log('room.players_info:', room.players_info);
            return;
        }

        if(player.cards.filter((card) => {
            return card.special == Special.WILD || card.special == Special.WILD_DRAW_4 || card.special == Special.SHUFFLE_WILD || card.special == Special.WHITE_WILD;
        }).length > 0){
            is_must_call_draw_card = false;
        }else if(room.current_field.special == Special.SKIP){
            if(player.cards.filter((card) => {
            return card.color == room.current_field.color || card.special == Special.SKIP;
            }).length > 0){
            is_must_call_draw_card = false;
            }
        }else if(room.current_field.special == Special.DRAW_2){
            if(player.cards.filter((card) => {
            return card.color == room.current_field.color || card.special == Special.DRAW_2;
            }).length > 0){
            is_must_call_draw_card = false;
            }
        }else if(room.current_field.special == Special.REVERSE){
            if(player.cards.filter((card) => {
            return card.color == room.current_field.color || card.special == Special.REVERSE;
            }).length > 0){
            is_must_call_draw_card = false;
            }
        }
        else{
            //場のカードが数字カードの場合
            if(player.cards.filter((card) => {
            return card.color == room.current_field.color || card.number == room.current_field.number;
            }
            ).length > 0){
            is_must_call_draw_card = false;
            }
        }
        return is_must_call_draw_card;
    },

    shuffle : this.shuffle,

    insideInitDeck : function(room)  {
        let deck = [];
        for(let c=0; c<4; c++){
          let color = "";
          switch(c){
            case 0:10
              color = Color.RED;
              break;
            case 1:
              color = Color.YELLOW;
              break;
            case 2:
              color = Color.GREEN;
              break;
            case 3:
              color = Color.BLUE;
              break;
          }
          //数字カード76枚の設定
          for(let n=1; n<20; n++){
            deck.push({color: color, special: null, number: n%10});
          }
          //ドロー2 8枚の設定
          for(let n=0; n<2; n++){
            deck.push({color: color, special: Special.DRAW_2, number: null});
          }
          //リバース 8枚の設定
          for(let n=0; n<2; n++){
            deck.push({color: color, special: Special.REVERSE, number: null});
          }
          //スキップ 8枚の設定
          for(let n=0; n<2; n++){
            deck.push({color: color, special: Special.SKIP, number: null});
          }
        }
        //ワイルドカード 4枚の設定
        for(let n=0; n<4; n++){
          deck.push({color: null, special: Special.WILD, number: null});
        }
        //ワイルドドロー4 4枚の設定
        for(let n=0; n<4; n++){
          deck.push({color: null, special: Special.WILD_DRAW_4, number: null});
        }
        //シャッフルワイルドカード 1枚の設定
        deck.push({color: null, special: Special.WILD_SHUFFLE, number: null});
        //白いワイルドカード 3枚の設定
        for(let n=0; n<3; n++){
          deck.push({color: null, special: Special.WHITE_WILD, number: null});
        }
        room.deck = deck;
        //ランダムにdeckとorderを並び替える
        room.deck = shuffle(room.deck);
      },

  };