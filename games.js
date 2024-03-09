const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const gameCont = document.getElementById("games");

checkToken();

function checkToken() {
    var token = sessionStorage.getItem("token");

    if(token != null) {
        socket.emit('getToken', token);
        return;
    }
}

function joinGame(event) {
    var elm = event.target;
    var par = elm.parentNode;

    var roomkey = par.children[0].textContent;
    var watch = false;

    showLoading();

    socket.emit('joinGame', roomkey, sessionStorage.getItem("token"), watch);
}

function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none";
}

serverCommunication();

function serverCommunication() {
    socket.on('setToken', (token) => {
        socket.emit('updateGames');
    });

    socket.on('setRoom', (token) => {
        hideLoading();
        window.location.href = "http://localhost:3000/join";
    });

    socket.on('setGames', (games) => {
        gameCont.innerHTML = "";

        games.forEach(game => {
            const element = document.createElement('li');
            element.classList.add("game-item");
            element.innerHTML = `
                <span>${game.roomName}</span>
                <label>
                    <input type="checkbox" name="myCheckbox" value="checked">
                    Watch
                </label>
                <button class="joinBtn" onclick="joinGame(event)"></button>
            `;

            gameCont.appendChild(element);
        });
    });

    socket.on('joinedGame', (token) => {
        sessionStorage.setItem("room", token);
        if(token != null) {
            socket.emit('getRoom', token);
        }
    });
}