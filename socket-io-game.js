const { update } = require('./room_data');
const Room = require('./room_data');
const { SocketConst, Special, Color, DrawReason, checkMustCallDrawCard } = require('./socket-io-common');

module.exports = (io) => {
  io.on('connection', socket => {
    socket.on(SocketConst.EMIT.DRAW_CARD, () => {
        //soket_idからルーム、プレイヤーの検索を行う
        Room.findOne(
          { players_info: { $elemMatch: { socket_id: socket.id } } }, (error, room) => {
            if (error) {
              console.error(error);
              return;
            }
            if(room != null){
              let player = room.players_info.find((player) => {
                return player.socket_id == socket.id;
              });
              console.log('inside draw card');
              //ドローできるのかサーバー側でも確認
              console.log('checkMustCallDrawCard', checkMustCallDrawCard(room, room.room_name, player._id));
              if(checkMustCallDrawCard(room, room.room_name, player._id)){
                //ドローする
                let draw_card = room.deck.shift();
                //ドローしたカードをプレイヤーの手札に加える

                // room.players_info.find((player) => {
                //   return player.socket_id == socket.id;
                // }).cards.push(draw_card);
                player.cards.push(draw_card);
                //saveする
                room.save();
                socket.emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:draw_card});
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, });
              }else{
                //ドローしない
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:false});
              }
            }
          });
        });

        socket.on(SocketConst.EMIT.PLAY_CARD, (data) => {
          //data: {card_play:{color:String,special:String,number:Number}}
          //まずこのカードをプレイできるのか確認する
          //soket_idからルーム、プレイヤーの検索を行う
          Room.findOne(
            { players_info: { $elemMatch: { socket_id: socket.id } } }, (error, room) => {
              if (error) {
                console.error(error);
                return;
              }
              if(room != null){
                let player = room.players_info.find((player) => {
                  return player.socket_id == socket.id;
                });
                //プレイヤーが持っているカードの中にこのカードがあるか確認する
                let index = player.cards.findIndex((card) => {
                  return card.color == data.card_play.color && card.special == data.card_play.special && card.number == data.card_play.number;
                });
                console.log("index:" + index);
                if(index != -1){
                  //プレイヤーが持っているカードの中にこのカードがある
                  //カードを場に出す
                  room.current_field = data.card_play;
                  room.number_card_play++;
                  //カードをプレイヤーの手札から削除する
                  player.cards.splice(index,1);
                  //出したカードが数字ならなにもしない、特殊なら処理を行う

                  if(data.card_play.special == Special.DRAW_2){
                    //2枚ドローする
                    let draw_card1 = room.deck.shift();
                    let draw_card2 = room.deck.shift();
                    //ドローしたカードを次のプレイヤーの手札に加える
                    //次のプレイヤーを取得する
                    let next_player = getNextPlayer(room);
                    updateCurrentPlayer(room);

                    next_player.cards.push(draw_card1);
                    next_player.cards.push(draw_card2);
                    
                    //カードを場に出したことをクライアントに通知する
                    io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:data.card_play});
                    //saveする
                    room.save();

                    io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:next_player._id, is_draw:true, can_play_card:false, reason:DrawReason.DRAW_TWO});
                    //次のプレイヤーにドローしたカードを通知する
                    io.to(next_player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:[draw_card1, draw_card2],is_penalty:false});
                  }
                  else if(data.card_play.special == Special.SKIP){
                    //次のプレイヤーをスキップする
                    if(room.is_reverse){
                      if(room.current_player == 0){
                        room.current_player = 2;
                      }else if(room.current_player == 1){
                        room.current_player = 3;
                      }else{
                        room.current_player = room.current_player - 2;
                      }
                    }else{
                      if(room.current_player == 2){
                        room.current_player = 0;
                      }else if(room.current_player == 3){
                        room.current_player = 1;
                      }else{
                        room.current_player = room.current_player + 2;
                      }
                    }

                    //カードを場に出したことをクライアントに通知する
                    io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:data.card_play});
                    //saveする
                    room.save();
                  }
                  else if(data.card_play.special == Special.REVERSE){
                    //逆方向にする
                    room.is_reverse = !room.is_reverse;
                    //current_playerを変更する
                    updateCurrentPlayer(room);
                    //カードを場に出したことをクライアントに通知する
                    io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:data.card_play});
                    //saveする
                    room.save();
                  }
                  else if(data.card_play.special == Special.WILD){
                    //色をクライアントに選ばせる
                    socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});

                    //クライアントから色を受け取る
                    socket.on(SocketConst.EMIT.COLOR_OF_WILD, (data) => {
                      room.current_field.color = data.color_of_wild;
                    });

                    //一定時間待ち、カードを場に出したことをクライアントに通知する
                    waitForChangeColor(room);

                    updateCurrentPlayer(room);
                    io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:data.card_play});
                    //saveする
                    room.save();
                  }
                  else if(data.card_play.special == Special.WILD_DRAW_4){
                    //まず次のプレイヤーを取得する
                    let next_player = getNextPlayer(room);
                    //4枚ドローする
                    let draw_card1 = room.deck.shift();
                    let draw_card2 = room.deck.shift();
                    let draw_card3 = room.deck.shift();
                    let draw_card4 = room.deck.shift();
                    //ドローしたカードを次のプレイヤーの手札に加える
                    next_player.cards.push(draw_card1);
                    next_player.cards.push(draw_card2);
                    next_player.cards.push(draw_card3);
                    next_player.cards.push(draw_card4);
                    
                    //色をクライアントに選ばせる
                    socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});

                    //一定時間待ち、色を受け取る
                    waitForChangeColor(room);

                    updateCurrentPlayer(room);
                    io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:data.card_play});
                    //saveする
                    room.save();

                    io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:next_player._id, is_draw:true, can_play_card:false, reason:DrawReason.WILD_DRAW_4});
                    //次のプレイヤーにドローしたカードを通知する
                    io.to(next_player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:[draw_card1, draw_card2, draw_card3, draw_card4],is_penalty:false});
                  }
                  else if(data.card_play.special == Special.WILD_SHUFFLE){

                  }

                }else{
                  //プレイヤーが持っているカードの中にこのカードがない
                  //ペナルティを与える (2枚ドロー)
                  //2枚ドローする
                  let draw_card1 = room.deck.shift();
                  let draw_card2 = room.deck.shift();
                  //ドローしたカードをプレイヤーの手札に加える
                  player.cards.push(draw_card1);
                  player.cards.push(draw_card2);

                  //ドローしたことをクライアントに通知する
                  socket.emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive: [draw_card1, draw_card2], is_penalty:true});
                }
              }
        });
    });
    const getNextPlayer = (room) => {
      if(room.is_reverse){
        if(room.current_player == 0){
          return room.players_info[3];
        }else{
          return room.players_info[room.current_player - 1];
        }
      }else{
        if(room.current_player == 3){
          return room.players_info[0];
        }else{
          return room.players_info[room.current_player + 1];
        }
      }
    }

    const updateCurrentPlayer = (room) => {
      //current_playerを変更する
      if(room.is_reverse){
        if(room.current_player == 0){
          room.current_player = 3;
        }else{
          room.current_player = room.current_player - 1;
        }
      }else{
        if(room.current_player == 3){
          room.current_player = 0;
        }else{
          room.current_player = room.current_player + 1;
        }
      }
    };
    const waitForChangeColor = (room) => {
      return new Promise((resolve, reject) => {
        let TIMEOUT = 300000;
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timed out while waiting for change color event`));
        }, TIMEOUT);
    
        socket.on(SocketConst.EMIT.COLOR_OF_WILD, (data) => {
          clearTimeout(timeoutId);
          room.current_field.color = data.color_of_wild;
          resolve(data);
        });
      });
    };


      
  });


}



