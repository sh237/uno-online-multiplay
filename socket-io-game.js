const Room = require('./room_data');
const { SocketConst, Special, Color, DrawReason, checkMustCallDrawCard } = require('./socket-io-common');

module.exports = (io) => {
  io.on('connection', socket => {
    // socket.on(SocketConst.EMIT.DRAW_CARD, () => {
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
                socket.emit(SocketConst.EMIT.RECEIVER_CARD, {card:draw_card});
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, });
              }else{
                //ドローしない
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:false});
              }
            }
          });
        });
    






}



