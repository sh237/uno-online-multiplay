# uno-online-multiplay

The purpose of "uno-online-multiplay" is to visually verify the usefulness of the algorithms created for ALGORI.
Since "uno-online-multiplay" implements most of the server-side processing provided by ALGORI, you can validate your own algorithms locally.

# DEMO

First, a server must be set up, and clients connect to it to play the game.It can connect to the server through a client with its own implemented algorithm. Or a person can play through the GUI.



https://user-images.githubusercontent.com/78858054/222879847-334da763-a404-4e55-886d-1e9f06f2ce29.mov




In the above demonstration, all clients are not code that implements the algorithm, but people manipulating the GUI.

# Features

You can debug the code you have implemented for ALGORI. 
You can find flaws in your code and algorithms by operating through the GUI yourself.

# Requirement

## server side
* bluebird         ^3.7.2
* cookie-parser　  ~1.4.4
* cors　           ^2.8.5
* debug            ~2.6.9
* express          ~4.16.1
* http-errors      ~1.6.3
* jade             ~1.11.0
* mongoose         ^6.8.1
* morgan           ~1.9.1
* socket.io        ^4.5.4
* socket.io-client ^4.5.4
* typescript       ^4.9.4

## client side
* @testing-library/jest-dom   ^5.16.5
* @testing-library/react      ^13.4.0
* @testing-library/user-event ^13.5.0
* react                       ^18.2.0
* react-dom                   ^18.2.0
* react-router-dom            ^6.6.1 
* react-scripts                5.0.1
* web-vitals                  ^2.1.4


# Installation

On the server side, use the following command under root, and on the client side, use the following command under client.

```bash
npm install
```

# Usage

## server side
On the server side, you can start the server on port 3002 by executing the following command under root.

```bash
node app.js
```

If the connection is lost during the process, it is necessary to initialize the db, so access "http://localhost:3002/rooms/delete" with the GET method once. You can also check the value of the db by accessing "http://localhost:3002/rooms" with the GET method.

## client side

On the client side, a client that can be operated via GUI can be launched by using the following commands under the client.

```bash
npm start
```

If you are debugging with code that you have implemented yourself instead of using the GUI, you need to make the connection of that code to the server.

# Note

We made it faithful to the ALGORI specifications, but the handling of penalties, etc. is inadequate. There is a great deal of difference in behavior from the dealer provided in the tournament.

# Author

* Shunya Nagashima
* Twitter : -
* Email : syun864297531@gmail.com

* Naoto Sugiura

# License

"uno-online-multiplay" is under [MIT license].

Thank you!
