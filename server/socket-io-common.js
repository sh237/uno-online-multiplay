const Room = require('../room_data');


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

module.exports = {
    SocketConst: SocketConst,
    Special: Special,
    Color: Color,
    DrawReason: DrawReason,

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
    }
  };