const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const start = document.getElementById("startGame");
const lobby = document.getElementById("lobby");
const code = document.getElementById("gameCode");

let create = false;
let roomKey = "";

checkToken();
connectRoom();
checkCreator();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('getRoom', token);
        return;
    }

    start.disabled = true;
    start.style.backgroundColor = "#626262";
}

function checkCreator() {
    socket.emit('checkCreator', sessionStorage.getItem("room"));
}

function connectRoom() {
    var token = sessionStorage.getItem("room");

    if(token != null) {
        socket.emit('connectRoom', token);
        return;
    }
}

function removePlayer(event) {
    if(create) {
        var elm = event.target;
        var par = elm.parentNode;

        var player = par.dataset.player;

        socket.emit('removePlayer', roomKey, player);
    }
}

function startGame() {
    console.log("Start Game");

    showLoading();

    socket.emit('createCards', sessionStorage.getItem("room"));
}

function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none";
}

function serverCommunication() {
    socket.on('setRoom', (token) => {
        
        socket.emit('updateLobby', token.room);

        start.disabled = false;
        start.style.backgroundColor = "#27ae60";
    });

    socket.on('changeLobby', (players, gCode) => {
        lobby.innerHTML = "";
        code.textContent = `Game: ${gCode}`;
        roomKey = gCode;

        players.forEach(player => {
            let disb = ``;
            let styl = `style="background-color: red;"`;
            
            if(!create || player.creator) {
                disb = `disabled="true"`;
                styl = `style="background-color: #626262;"`;
            }

            const element = document.createElement('li');
            element.classList.add("lobby-item");
            element.setAttribute("data-player", player.playerId);
            element.innerHTML = `
                <span>${player.username}</span>
                <button class="removeBtn" ${disb} ${styl} onclick="removePlayer(event)"></button>
            `;

            lobby.appendChild(element);
        });
    });

    socket.on('playerJoined', () => {
        checkToken();
    });

    socket.on('getCreator', (creator) => {
        if(creator) {
            start.disabled = false;
            start.style.backgroundColor = "#27ae60";
        } else {
            start.disabled = true;
            start.style.backgroundColor = "#626262";
        }
        create = creator;
    });

    socket.on('setDeletePlayer', (id) => {
        let children = lobby.children;
        for(let child of children) {
            if(child.dataset.player === id) {
                lobby.removeChild(child);
            }
        }
    });

    socket.on('checkRemove', (id) => {
        socket.emit('getRemove', sessionStorage.getItem("room"), id);
    });

    socket.on('setRemove', () => {
        window.location.href = "http://localhost:3000/games";
        sessionStorage.removeItem("room");
    });

    socket.on('generatedCards', () => {
        hideLoading();
        window.location.href = "http://localhost:3000/phase1";
    });
}