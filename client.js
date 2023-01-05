const io = require('socket.io-client');
const { SocketConst, Special, Color, DrawReason, checkMustCallDrawCard } = require('./socket-io-common');

const port = 5000;
const socket = io(`http://localhost:${port}`);

const clientId = process.argv[2];
const roomId = process.argv[3];
console.log(`clientId: ${clientId}  roomId: ${roomId}`);

var current_information = {room_name:"", player:"", player_id:"", cards:[], current_field:{color:"", special:"", number:0}};

/* イベント名                 ON              EMIT
  JOIN_ROOM                 
  RECEIVER_CARD               
  FIRST_PLAYER              完了     　　　　　
  COLOR_OF_WILD
  SHUFFLE_WILD
  NEXT_PLAYER
  PLAY_CARD
  DRAW_CARD
  PLAY_DRAW_CARD
  CHALLENGE
  PUBLIC_CARD
  SAY_UNO_AND_PLAY_CARD
  POINTED_NOT_SAY_UNO
  SPECIAL_LOGIC
  FINISH_TURN
  FINISH_GAME

  
*/





/*    実装済み                  */
let cardsGlobal = [];
socket.on(SocketConst.EMIT.FIRST_PLAYER, (dataRes) => {
  console.log(`${dataRes.first_player} is first player.`);
  console.log(dataRes);
});

socket.on(SocketConst.EMIT.RECEIVER_CARD, (dataRes) => {
  console.log(`${id} receive cards :`);
  console.log(dataRes);
  const cards = cardsGlobal || [];
  cardsGlobal = cards.concat(dataRes.cards_receive);
  console.log(`${SocketConst.EMIT.RECEIVER_CARD} cardsGlobal:`, cardsGlobal);
});

/*   ここまで  以下はテスト                 */




socket.on('connection', (socket) => {
    console.log('a user connected');
    socket.on(SocketConst.EMIT.FIRST_PLAYER, (data) => {
      console.log('first_player');
      console.log('in');
      console.log(data);
  });
});



socket.on(SocketConst.EMIT.DRAW_CARD, (data) => {
  if(data.is_draw){
    console.log("player:" + data.player + " draw card");
    if(data.can_play_draw_card){
      console.log("player:" + data.player + " can play draw card");
    }else{
      console.log("player:" + data.player + " can't play draw card");
    }
  }else{
    console.log("player:" + data.player + " can't draw card");
  }
});


socket.on(SocketConst.EMIT.NEXT_PLAYER, (data) => {
    console.log('next_player');
    current_information.current_field = data.card_before;
    current_information.cards = data.card_of_player;
    console.log("received_data : ",data);
    let is_must_call_draw_card = data.must_call_draw_card;
    let can_play_cards;
    if(is_must_call_draw_card){

      socket.emit(SocketConst.EMIT.DRAW_CARD, {}, (error, data) => {
        if (error) {
            console.log(error);
        }


      });
    }else{
      can_play_cards = getCanPlayCards(current_information.current_field, current_information.cards);
      //can_play_cardsの1枚目を出す
      if(can_play_cards.length > 0){
        socket.emit(SocketConst.EMIT.PLAY_CARD, {card_play:can_play_cards[0]}, (error, data) => {
          if (error) {
              console.log(error);
          }
        });
      }
  
    }


    // socket.emit('leave_room', { room_name: current_information.room_name, player_name: current_information.player}, (error, data) => {});
});


// Serverにメッセージを送信
socket.emit(SocketConst.EMIT.JOIN_ROOM, { room_name: roomId, player: clientId}, (error, data) => {
    if (error) {
        console.log(error);
    } else {
      console.log("join_room");
      console.log(data);
      current_information.room_name = data.room_name;
      current_information.player_id = data.your_id;
      current_information.player = data.player;
    }
});

//サーバーとの接続が切れたときの処理
socket.on('disconnect', () => {
    socket.emit('delete_data',{ data: { room_name: current_information.room_name, player: current_information.player}});
});

const isMustCallDrawCard = (current_field, cards) => {
  const is_must_call_draw_card = true;
  if(cards.filter((card) => {
    return card.special == Special.WILD || card.special == Special.WILD_DRAW_4 || card.special == Special.SHUFFLE_WILD || card.special == Special.WHITE_WILD;
  }).length > 0){
    is_must_call_draw_card = false;
  }else if(current_field.special == Special.SKIP){
    if(cards.filter((card) => {
      return card.color == current_field.color || card.special == Special.SKIP;
    }).length > 0){
      is_must_call_draw_card = false;
    }
  }else if(current_field.special == Special.DRAW_2){
    if(cards.filter((card) => {
      return card.color == current_field.color || card.special == Special.DRAW_2;
    }).length > 0){
      is_must_call_draw_card = false;
    }
  }else if(current_field.special == Special.REVERSE){
    if(cards.filter((card) => {
      return card.color == current_field.color || card.special == Special.REVERSE;
    }).length > 0){
      is_must_call_draw_card = false;
    }
  }
  else{
    //場のカードが数字カードの場合
    if(cards.filter((card) => {
      return card.color == current_field.color || card.number == current_field.number;
    }
    ).length > 0){
      is_must_call_draw_card = false;
    }
  }
  return is_must_call_draw_card;
}

const getCanPlayCards = (current_field, cards) => {
  let can_play_cards = cards.filter((card) => {
    if(card.color == current_field.color || card.special == Special.WILD || card.special == Special.WILD_DRAW_4 || card.special == Special.SHUFFLE_WILD || card.special == Special.WHITE_WILD){
      return true;
    }
    else if(current_field.special == Special.SKIP && card.special == Special.SKIP){
      return true;
    }else if(current_field.special == Special.DRAW_2 && card.special == Special.DRAW_2){
      return true;
    }else if(current_field.special == Special.REVERSE && card.special == Special.REVERSE){
      return true;
    }else if(card.number == current_field.number){
      return true;
    }
  });
  return can_play_cards;
}


