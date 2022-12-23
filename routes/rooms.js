var express = require('express');
var router = express.Router();
const Room = require('../room_data');

router.get('/', async (req, res) => {
	const room_data = await Room.find({});
	res.json(room_data);
});

module.exports = router;
