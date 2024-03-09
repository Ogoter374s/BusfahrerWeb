const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const statistic = document.getElementById('statList');
const play = document.getElementById("playGame");
const join = document.getElementById("joinGame");

let counter = 0;
let accountId = 4;
let user = "User";

checkToken();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("token");

    if(token != null) {
        socket.emit('getToken', token);
        return;
    }

    input.disabled = true;
    
    play.disabled = true;
    join.disabled = true;

    play.style.backgroundColor = "#626262";
    join.style.backgroundColor = "#626262";
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(input.value) {
        const clientOffset = `${socket.id}-${counter++}`;
        let msg = "#" + user + ": " + input.value
        socket.emit('chat message', msg, clientOffset);
        input.value = '';
    }
});

function watchGame() {
    console.log("Watch Game");
}

function settingMenu() {
    console.log("Settings Menu")
}

function serverCommunication() {
    socket.on('chat message', (msg, serverOffset) => {
        const item = document.createElement('li');
        item.textContent = msg;

        messages.appendChild(item);

        if(document.body.scrollHeight > 900) {
            messages.removeChild(messages.firstChild);
            socket.emit('remove message');
        }

        socket.auth.serverOffset = serverOffset;
    });

    socket.on('setAccount', (data) => {
        statistic.innerHTML = "";
        let login = document.getElementById("loginN");

        let element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Games Played: ${data.numbGames}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Games Busfahrer: ${data.numbBusfahrer}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Schlucke Verteilt: ${data.givenSchluck}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Schlucke Bekommen: ${data.recievedSchluck}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Schlucke Selbst: ${data.selfSchluck}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Anzahl Exen: ${data.numbEx}</p>`;
        statistic.appendChild(element);

        login.value = data.login;
        user = data.login;

        play.disabled = false;
        join.disabled = false;

        play.style.backgroundColor = "#27ae60";
        join.style.backgroundColor = "#3578e4";
    });

    socket.on('setToken', (token) => {
        console.log("Get Account");
        socket.emit('getAccount', token);
    });
}
