const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3,
});

const statisticGlobal = document.getElementById('statGlobalList');
const statistic = document.getElementById('statSelfList');

checkToken();

serverCommunication();

function checkToken() {
    var token = sessionStorage.getItem("token");

    if(token != null) {
        socket.emit('getToken', token);
        return;
    }
}

function serverCommunication() {
    socket.on('setStatistic', (global, self) => {
        statistic.innerHTML = "";
        statisticGlobal.innerHTML = "";
        
        //Self Statistic
        let element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Games Played: ${self.numbGames}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Games Busfahrer: ${self.numbBusfahrer}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Schlucke Verteilt: ${self.givenSchluck}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Schlucke Bekommen: ${self.recievedSchluck}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Schlucke Selbst: ${self.selfSchluck}</p>`;
        statistic.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Anzahl Exen: ${self.numbEx}</p>`;
        statistic.appendChild(element);

        //Global Statistic
        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Most Games Played: ${global.mostGames}</p>`;
        statisticGlobal.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Most Times Busfahrer: ${global.mostBusfahrer}</p>`;
        statisticGlobal.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Most Self Schluck: ${global.mostSelfSchluck}</p>`;
        statisticGlobal.appendChild(element);

        element = document.createElement("p");
        element.innerHTML = `<p class="statisticItem">Most Number of Exen: ${global.mostEx}</p>`;
        statisticGlobal.appendChild(element);
    });

    socket.on('setToken', (token) => {
        socket.emit('getStatistic', token);
    });
}