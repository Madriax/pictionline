/*
*
* AFFICHER SCORE + LANGUE + PEUT ETRE SYSTEME CONNEXION
*
*/

/* Appel des dépendance du serveur */
const express = require('express'); //Infrastructure Web
const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http); //Moteur temps-réel (communication en temps réel avec les clients)

const Sequelize = require('sequelize'); //Communication base de donnée
const sequelize = new Sequelize(process.env.DATABASE_URL, {
	host: 'ec2-54-217-205-90.eu-west-1.compute.amazonaws.com',
	dialect: 'postgres',
	protocol: 'postgres',
	port: 5432,
	logging: false
});

app.use(express.static('public'));


/* Initialisation des variables du code*/
var users = [];
var dessinateur;
var inGame = false;
var actual_player = 0;
var party_time = 15;
var counter = party_time;
var word = 0;
var word_fr = [];
var word_en = [];
var word_de = [];
var word_code = [];
var rooms = [];
var rooms_state = [];

/* VISUALISATION DE L'ARRAY ROOM =>
*		[[limite de joueur, joueur1, joueur2, joueur3], [limite de joueur, joueur1, joueur2]];
*		Pour afficher les joueurs, boucle for a partir de 1
*/

/* Configuration de la base de donnée */
const WordRequest = sequelize.define('words', {
	word: Sequelize.STRING,
	lang: Sequelize.STRING,
	verified: Sequelize.BOOLEAN
})
WordRequest.sync();

WordRequest.findAll().then(words => {
	words.forEach((word) => {
		switch (word.lang) {
			case 'fr':
				word_fr.push(word.word);
				break;
			case 'en':
				word_en.push(word.word);
				break;
			case 'de':
				word_de.push(word.word);
				break;
			default:
				console.log('Attention, une erreur est arrivé avec ce mot: ' + word.word + ' --> ' + word.lang);
		}
	});
}).catch(error => {
	console.log(error);
});

/* Fonctions néscessaires au programme */
function getPlayerBySid(socketid)
{
	let object = users.find(function(player){
	  	return (player.socketid == socketid);
	});
	return object;
}

function getPlayerByUsername(username)
{
	let object = users.find(function(player){
	  	return (player.pseudo == username);
	});
	return object;
}

function getRoomBySid(room_id)
{
	let object = rooms_state.find(function(room){
	  	return (room.id == room_id);
	});
	return object;
}

function remove(array, element)
{
	const index = array.indexOf(element);
	if (index !== -1)
	{
		array.splice(index, 1);
	}
}

function emitToRoom(id, emit, args = null)
{
	for(var i = 1; i < rooms[id].length; i++)
  	{
  		if (getPlayerByUsername(rooms[id][i]))
  		{
	  		io.to(getPlayerByUsername(rooms[id][i]).socketid).emit(emit, args);
	  	}
  	}
}

/* Coeur du programme, réception et emission des sockets aux clients */
io.on('connection', (socket) => {

	/* Connexion */
	socket.on('log', (pseudo) => {
		if (getPlayerByUsername(pseudo) === null || getPlayerByUsername(pseudo) === undefined) {
			console.log("NOUVELLE CONNEXION: " + pseudo);
			users.push({socketid:socket.id, pseudo:pseudo, inRoom: false, victoires: 0});
			io.to(socket.id).emit('login_ok');
			io.to(socket.id).emit('update_rooms', rooms, rooms_state);
		} else {
			io.to(socket.id).emit('error_login');
		}
	});

	/* Déconnexion */
	socket.on('disconnect', () => {
		let player = getPlayerBySid(socket.id); 
		if(player)
		{
			console.log("DECONNEXION: " + player.pseudo);
			if (player.inRoom !== false)
			{
				if (rooms[player.inRoom].length === 2) {
					rooms.splice(player.inRoom, 1)
					remove(rooms_state, rooms_state[player.inRoom]);
				} else {
					if (rooms_state[player.inRoom].drawer !== player.pseudo) {
						if (rooms[player.inRoom].length === 3) {
							io.to(getPlayerByUsername(rooms_state[player.inRoom].drawer).socketid).emit('stopbeginoption');
							emitToRoom(player.inRoom, 'wait_for_players');
						}
					} else {
						if (rooms[player.inRoom].indexOf(player.pseudo)+1 > rooms[player.inRoom].length) {
							rooms_state[player.inRoom].drawer = rooms[player.inRoom][1];
						} else {
							rooms_state[player.inRoom].drawer = rooms[player.inRoom][rooms[player.inRoom].indexOf(player.pseudo)+1];
						}
					}
					remove(rooms[player.inRoom], player.pseudo);
					emitToRoom(player.inRoom, 'update_players', rooms[player.inRoom]);
				}
				io.emit('update_rooms',rooms, rooms_state);
				users.forEach((e) => {
					if (e.inRoom !== false && player.inRoom < e.inRoom) {
						e.inRoom--;
					}
				});
			}
			remove(users,player);
		}
  	});

  	socket.on('leaveroom', () => {
		let player = getPlayerBySid(socket.id); 
		if(player)
		{
			if (player.inRoom !== false)
			{
				if (rooms[player.inRoom].length === 2) {
					rooms.splice(player.inRoom, 1)
					remove(rooms_state, rooms_state[player.inRoom]);
				} else {
					if (rooms_state[player.inRoom].drawer !== player.pseudo) {
						if (rooms[player.inRoom].length === 3) {
							io.to(getPlayerByUsername(rooms_state[player.inRoom].drawer).socketid).emit('stopbeginoption');
							emitToRoom(player.inRoom, 'wait_for_players');
						}
					} else {
						if (rooms[player.inRoom].indexOf(player.pseudo)+1 > rooms[player.inRoom].length) {
							rooms_state[player.inRoom].drawer = rooms[player.inRoom][1];
						} else {
							rooms_state[player.inRoom].drawer = rooms[player.inRoom][rooms[player.inRoom].indexOf(player.pseudo)+1];
						}
					}
					remove(rooms[player.inRoom], player.pseudo);
					emitToRoom(player.inRoom, 'update_players', rooms[player.inRoom]);
				}
				io.emit('update_rooms',rooms, rooms_state);
				users.forEach((e) => {
					if (e.inRoom !== false && player.inRoom < e.inRoom) {
						e.inRoom--;
					}
				});
				player.inRoom = false;
			}
		}
  	});

	/*  Utilisateur rejoinds une salle */
  	socket.on('joinRoom', (id) => {
  		let player = getPlayerBySid(socket.id);
  		if (player)
  		{
  			if (rooms[id] && rooms[id].length-1 < rooms[id][0] && player.inRoom === false)
  			{
  				rooms[id].push(player.pseudo)
  				player.inRoom = id;
  				console.log(player.pseudo + ' rejoinds la salle ' + id);
  				io.emit('update_rooms',rooms, rooms_state);
  				io.to(player.socketid).emit('joinroom');
  				emitToRoom(id, 'update_players', rooms[id]);
  				if (rooms[id].length > 2)
  				{
  					emitToRoom(id, 'game_ready_to_start');
  					io.to(getPlayerByUsername(rooms_state[id].drawer).socketid).emit('beginoption');
  				} else {
  					emitToRoom(id, 'wait_for_players');
  				}
  			}
  		}
  	});

  	/* Utilisateur crée un salle */
  	socket.on('create_room', (nbr_players, lang) => {
	  	let player = getPlayerBySid(socket.id);
  		if (player)
  		{	
	  		if (nbr_players <= 10 && nbr_players >= 2 && player.inRoom === false)
	  		{
	  			if (lang == 'de' || lang == 'fr' || lang == 'en')
	  			{
		  			rooms.push([nbr_players, player.pseudo]);
		  			player.inRoom = rooms.length-1;
		  			rooms_state.push({counter: party_time, lang: lang, ingame: false, word: false, drawer: player.pseudo});
		  			io.emit('update_rooms',rooms, rooms_state);
		  			io.to(player.socketid).emit('joinroom');
		  			io.to(player.socketid).emit('wait_for_players');
		  			emitToRoom(player.inRoom, 'update_players', rooms[player.inRoom]);
		  		}
	  		}
	  	}
  	});

  	/* Dessinateur clique pour dessiner */
	socket.on('mouse', (data) => {
		let player = getPlayerBySid(socket.id);
    	if (player)
    	{
    		if (player.inRoom !== false)
    		{
    			if (player.pseudo == rooms_state[player.inRoom].drawer && rooms_state[player.inRoom].word !== false)
    			{
    				emitToRoom(player.inRoom, 'mouse', data);
    			}
    		}
    	}
    });

	/* Dessinateur change de couleur */
    socket.on('changeColor', (data) => {
    	let player = getPlayerBySid(socket.id);
    	if (player)
    	{
    		if (player.inRoom !== false)
    		{
    			if (player.pseudo == rooms_state[player.inRoom].drawer && rooms_state[player.inRoom].word !== false)
    			{
    				emitToRoom(player.inRoom, 'update_color', data);
    			}
    		}
    	}
    });

    /* Dessinateur change la taille du pinceau */
    socket.on('changeTaille', (data) => {
    	let player = getPlayerBySid(socket.id);
    	if (player)
    	{
    		if (player.inRoom !== false)
    		{
    			if (player.pseudo == rooms_state[player.inRoom].drawer && rooms_state[player.inRoom].word !== false)
    			{
    				emitToRoom(player.inRoom, 'update_taille', data);
    			}
    		}
    	}
    });

    /* Dessinateur efface tout le tableau */
    socket.on('clearall', () => {
    	let player = getPlayerBySid(socket.id);
    	if (player)
    	{
    		if (player.inRoom !== false)
    		{
    			if (player.pseudo == rooms_state[player.inRoom].drawer && rooms_state[player.inRoom].word !== false)
    			{
    				emitToRoom(player.inRoom, 'clear');
    			}
    		}
    	}
    });

   	/* Utilisateur envois un message */
    socket.on('message', (data) => {
    	let player = getPlayerBySid(socket.id);
    	if (player)
    	{
    		if (player.inRoom !== false)
    		{
	    		if (data.message == rooms_state[player.inRoom].word && player.pseudo != rooms_state[player.inRoom].drawer)
	    		{
	    			rooms_state[player.inRoom].counter = 0;
	    			player.victoires++;
	    			emitToRoom(player.inRoom, 'update_players', rooms[player.inRoom]);
	    			response = Object.assign(data, {sender:player.pseudo});
	    			emitToRoom(player.inRoom, 'receive_answer', response)
	    		} else {
		    		response = Object.assign(data, {sender:player.pseudo});
		    		emitToRoom(player.inRoom, 'receive_message', response);
		    	}
		    }
    	}
    });

    /* Dessinateur commence la partie */
    socket.on('commencer', (data) => {
    	let player = getPlayerBySid(socket.id);
    	if (player)
    	{
    		if (player.inRoom !== false)
    		{
	    		if (player.pseudo == rooms_state[player.inRoom].drawer && rooms_state[player.inRoom].counter == party_time)
	    		{
	    			io.to(player.socketid).emit('stopbeginoption');
	    			rooms_state[player.inRoom].inGame = true;
	    			switch (rooms_state[player.inRoom].lang) {
	    				case 'fr':
		    				randomIndex = Math.ceil(Math.random() * word_fr.length-1);
		    				word = word_fr[randomIndex];
		    				break;
		    			case 'en':
		    				randomIndex = Math.ceil(Math.random() * word_en.length-1);
		    				word = word_en[randomIndex];
		    				break;
		    			case 'de':
		    				randomIndex = Math.ceil(Math.random() * word_de.length-1);
		    				word = word_de[randomIndex];
		    				break;
		    			default:
		    				randomIndex = Math.ceil(Math.random() * word_en.length-1);
		    				word = word_en[randomIndex];
		    		}
		    		
	    			rooms_state[player.inRoom].word = word;
	    			response_drawer = {word};
	    			word_code.length = 0;
	    			word_code[0] = word[0];
	    			for (var i = 1; i < word.length; i++) { if(word[i] === ' ') { word_code[i] = ' '; } else if(word[i] === '-') { word_code[i] = '-'; } else { word_code[i] = "_"; } }
	    			response_player = {indice:word_code}
	    			emitToRoom(player.inRoom, 'sendindice', response_player);
	    			io.to(player.socketid).emit('receivemot', response_drawer);
		    	}
		    }
    	}
    });
});


/* Timer du programme */
var timer_thread = setInterval(() =>
{
	rooms_state.forEach((e, i) => {
		if (e.inGame)
		{
			if (e.word != 0 && e.counter > 0)
			{
				e.counter--;
				emitToRoom(i, 'timer', e.counter);
			}

			if(e.counter == 0)
			{
				word = {indice: e.word}
				emitToRoom(i, 'sendindice', word);
				e.word = false;
				e.counter = party_time;
				if ((rooms[i].indexOf(e.drawer)+1) >= rooms[i].length) {
					e.drawer = rooms[i][1];
				} else {
					ancien = rooms[i][rooms[i].indexOf(e.drawer)]
					e.drawer = rooms[i][rooms[i].indexOf(e.drawer)+1];
				}
				io.to(getPlayerByUsername(e.drawer).socketid).emit('beginoption');
				emitToRoom(i, 'clear');
			}

			if (users.length < 2)
			{
				e.inGame = false;
			}

		}
	});
},1000);

/* Utilisation du port 4000 pour le serveur (à modifier en fonction de la configuration de la machine hébergant le serveur) */
http.listen(4000);