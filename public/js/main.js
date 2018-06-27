var socket = io.connect('http://localhost:4000'); //Appel du serveur socketio

/* Récupération des élements de la page pour le code */
var login = document.querySelector('#login'),
  menu = document.querySelector('#menu'),
  roomlist = document.querySelector('#roomlist'),
  gameroom = document.querySelector('#gameroom'),
  error_login = document.querySelector('#errorlogin'),

  btn_createRoom = document.querySelector('#btn_createRoom'),
  createRoom = document.querySelector('#createRoom'),
  addroom = document.querySelector('#addroom'),
  numberplayer = document.querySelector('#numberplayer'),
  lang = document.querySelector('#lang'),
  btn_cancel = document.querySelector('#cancel'),

  index = document.querySelector('#index'),
  pseudo = document.querySelector('#inputUsername'),
  btn = document.querySelector('#connect'),
  players = document.querySelector('#players'),
  canvaswidth = document.querySelector('#canvas').offsetWidth,
  canvasheight = document.querySelector('#canvas').offsetHeight,
  stylo = document.querySelector('#stylo'),
  gomme = document.querySelector('#gomme'),
  tailleselector = document.querySelector('#taille'),
  timer = document.querySelector('#timer'),
  dessinateur = document.querySelector('#dessinateur'),
  clearall = document.querySelector('#clearall'),
  outputmesssage = document.querySelector('#tchat'),
  sendmessage = document.querySelector('#sendmessage'),
  commencer = document.querySelector('#commencer'),
  indice = document.querySelector('#indice'),
  disconnect = document.querySelector('#disconnect'),

  /* Déclaration de variable pour le programme */
  r = 0,
  g = 0,
  b = 0,
  taille = 10;

function hide(elements) {
  elements.style.visibility = "hidden";
  elements.style.display = "none";
}

function show(elements) {
  elements.style.visibility = "visible";
  elements.style.display = "block";
}

window.onload = function () {
   hide(error_login);
   hide(gameroom);
   hide(commencer);
   hide(menu);
   hide(createRoom);
}

function updatecolor(color)
{
  socket.emit('changeColor', {
    r: color.rgb[0],
    g: color.rgb[1],
    b: color.rgb[2]
  });
}

btn_createRoom.addEventListener('click', (e) => {
  hide(menu);
  show(createRoom);
});

addroom.addEventListener('click', (e) => {
  if (numberplayer.value >= 2 && numberplayer.value <= 10)
  {
    socket.emit('create_room', numberplayer.value, lang[lang.selectedIndex].getAttribute('name'));
  }
})

cancel.addEventListener('click', (e) => {
  hide(createRoom);
  show(menu);
})

disconnect.addEventListener('click', (e) => {
  socket.emit('leaveroom');
  hide(gameroom);
  hide(createRoom);
  show(index);
  show(menu);
});

commencer.addEventListener('click', (e) => {
    socket.emit('commencer');
});

pseudo.addEventListener('keydown', (e) => {
  if (e.keyCode == 13)
  {
    e.preventDefault();
    if (pseudo.value.length <= 20 && pseudo.value.length > 3)
    {
      socket.emit('log', pseudo.value);
    }
  }
});

sendmessage.addEventListener('keydown', (e) => {
  if (e.keyCode == 13)
  {
    e.preventDefault();
    if (sendmessage.value.length > 1)
    {
      socket.emit('message', {
        message: sendmessage.value
      });
      sendmessage.value = '';
    }
  }
});

gomme.addEventListener('click', () => {
  socket.emit('changeColor', {
    r: 255,
    g: 255,
    b: 255
  });
});
stylo.addEventListener('click', () => {
  socket.emit('changeColor', {
    r: 0,
    g: 0,
    b: 0
  });
});

clearall.addEventListener('click', () => {
  socket.emit('clearall');
});

tailleselector.addEventListener('change', (event) => {
  socket.emit('changeTaille', event.target.value);
});

btn.addEventListener('click', () => {
  if (pseudo.value.length <= 20 && pseudo.value.length > 3)
  {
    socket.emit('log', pseudo.value);
  }
});

function joinRoom(id) {
  if (id) {
  	console.log('trying to join room id: ' + (id-1));
    socket.emit('joinRoom', (id-1));
  }
}

socket.on('login_ok', () => {
  hide(login);
  show(menu);
});

socket.on('error_login', () => {
  error_login.innerHTML = "Ce pseudo est déjà utilisé";
  show(error_login);
})

socket.on('joinroom', () => {
	hide(index);
	show(gameroom);
})

socket.on('wait_for_players', () => {
  indice.innerHTML = "En attente d'un autre joueur";
});

socket.on('game_ready_to_start', () => {
  indice.innerHTML = "En attente de début de la partie";
});

socket.on('timer', (data) => {
  timer.innerHTML = data;
});

socket.on('beginoption', () => {
  show(commencer);
});

socket.on('stopbeginoption', () => {
  hide(commencer);
});

socket.on('sendindice', (data) => {
  indice.innerHTML = '';
  console.log(data.indice);
  for (var i = 0; i < data.indice.length; i++)
  {
    if (data.indice[i] === ' ') {
      console.log('ouais');
      indice.innerHTML += '&nbsp;&nbsp;';
    } else {
      indice.innerHTML += data.indice[i] + ' ';
    }
  }
})

socket.on('receivemot', (data) => {
  indice.innerHTML = "Mot a dessiner: " + data.word;
  tailleselector.value = 25;
})


socket.on('receive_message', (data) => {
  message = data.message;
  from = data.sender;
  outputmesssage.innerHTML += "<p id='message'><strong>" + from + ":</strong>" + message + "</p>";
  outputmesssage.scrollTop = outputmesssage.scrollHeight;
});

socket.on('receive_answer', (data) => {
  message = data.message;
  from = data.sender;
  outputmesssage.innerHTML += "<p id='message'><strong>Félicitation " + from + " ! </strong>Le mot était: \"" + message + "\" ! Tu gagnes un point</p>";
  outputmesssage.scrollTop = outputmesssage.scrollHeight;
});

socket.on('update_players', (data) => {
  var usersList = '';
  for (var i = 1; i < data.length; i++)
  {
    usersList += '<li>' + data[i];
    console.log(data[i]);
  }
  players.innerHTML = usersList;
});

socket.on('update_rooms', (data_room, data_roomstate) => {
  roomlist.innerHTML = '';
  if (data_room.length > 0) {
    console.log(data_room);
    for (var i = 0; i < data_room.length; i++) {

      switch (data_roomstate[i].lang)
      {
        case 'fr':
          room_lang = 'Français';
          break;
        case 'en':
          room_lang = 'English';
          break;
        case 'de':
          room_lang = 'Deutsch';
          break;
        default:
          room_lang = '?';
      }
      var compteur = 0;
      for (var j = 0; j < data_room[i].length - 1; j++) {
        compteur++;
      }
        if (compteur >= data_room[i][0])
        {
          roomlist.innerHTML += '<btn onclick="joinRoom(' + (i+1) + ');" disabled="" class="btn btn-primary btn-sm" style="margin:3px;">' + room_lang + ' | ' + compteur + '/' + data_room[i][0] + '</button>';
        } else {
          roomlist.innerHTML += '<btn onclick="joinRoom(' + (i+1) + ');" class="btn btn-primary btn-sm" style="margin:3px;">' + room_lang + ' | ' + compteur + '/' + data_room[i][0] + '</button>';
        }
    }
  } else {
    roomlist.innerHTML = 'Il \'y a actuellement aucune salle de jeux. Vous pouvez cependez en créer une en cliquant sur le bouton ci-dessus';
  }
});

socket.on('update_color', (data) => {
  r = data.r,
  g = data.g,
  b = data.b
});

socket.on('update_taille', (data) => {
  taille = data;
});

function setup() {
  var canvas = createCanvas(canvaswidth, canvasheight);
  canvas.parent('canvas');
  socket.on('mouse', (data) => {
      fill(r,g,b);
      noStroke();
      ellipseMode(RADIUS);
      ellipse(data.mouseX,data.mouseY,taille,taille);
  });
  socket.on('clear', () => {
    clear();
  });
}
function draw() {
    if (mouseIsPressed) {
      socket.emit('mouse', {
      mouseX: mouseX,
      mouseY: mouseY
    });
   }
}