const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    player: String,
    room_name: String,
});



UserSchema.static('getUsersInRoom', function(room_name, callback) {
    return this.find({room_name:room_name}, callback);
});

UserSchema.static('getUserByPlayer', function(player, callback) {
    return this.find({player:player}, callback);
});

module.exports = mongoose.model('User',UserSchema);