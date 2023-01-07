const mongoose = require('mongoose');

const RoomSchema = mongoose.Schema({
    room_name:String,
    deck:[{color:String,special:String,number:Number}],
    current_field:{color:String,special:String,number:Number},
    number_of_player:Number,
    order:[String],
    is_reverse:Boolean,
    current_player:Number,
    players_info:[{player_name:String, socket_id:String,cards:[{color:String,special:String,number:Number}]}],
    binded_players:[{player_id:String, remain_turn:Number}],
    number_turn_play:Number,//何ターン目か(仕様書に書いてあった)
    number_card_play:Number,//何枚場に出たか(仕様書に書いてあった)
    uno_declared:[String],//uno宣言したプレイヤーのid
});

module.exports = mongoose.model('Room',RoomSchema);