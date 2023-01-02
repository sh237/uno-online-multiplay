var createError = require('http-errors');
var express = require('express');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
//socket-io.jsにioを渡す
const socket_io_connect = require('./socket-io-connect');



const options = {
	useUnifiedTopology : true,
	useNewUrlParser : true
}

mongoose.connect('mongodb://127.0.0.1/test_db',options);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'DB connection error:'));
db.once('open', () => console.log('DB connection successful'));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const PORT = process.env.PORT || 5000
var app = express();
const server = http.createServer(app);
const io = socketio(server);
socket_io_connect(io);

app.use(cors());

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var roomsRouter = require('./routes/rooms');


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/rooms', roomsRouter );






server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));



