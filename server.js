const { WebSocketServer } = require("ws");
const http = require("http");
const url = require("url");
const { v4: uuidv4 } = require("uuid");

const server = http.createServer();
const wsServer = new WebSocketServer({ server });
const port = 8000;

const connections = {};
const users = {}; // Agora armazena os personagens também

const BroadcastUsers = () => {
    const userList = Object.values(users)
        .filter(user => user.character !== null) // Remove usuários sem personagem
        .map(user => ({
            username: user.username,
            character: user.character
        }));
    
    console.log("User List broadcast");
    console.log(userList);

    const message = JSON.stringify({
        type: "user_list",
        users: userList
    });

    Object.values(connections).forEach(connection => {
        connection.send(message);
    });
};

const handleMessage = (bytes, uuid) => {
    try {
        const message = JSON.parse(bytes.toString());

        console.log(message)
        if (message.type === "set_username") {
            users[uuid].username = message.username;
            users[uuid].character = message.character || null; // Armazena o personagem do usuário
            BroadcastUsers();
        } if (message.type === "update") {
            users[uuid].username = message.username;
            users[uuid].character = message.character || null; // Armazena o personagem do usuário
            BroadcastUsers();
        } else {
            users[uuid].data = message;
        }


    } catch (error) {
        console.error("Erro ao processar mensagem:", error);
    }
};

const handleClose = uuid => {
    if (users[uuid]) {
        console.log(`User "${users[uuid].username}" has disconnected`);
    }

    delete connections[uuid];
    delete users[uuid];

    BroadcastUsers();
};

wsServer.on("connection", (connection, request) => {
    const { username } = url.parse(request.url, true).query;

    if (username == undefined) {
        connection.close()
        return
    }

    const uuid = uuidv4();

    connections[uuid] = connection;
    users[uuid] = { username: username || `User-${uuid.slice(0, 5)}`, character: null };

    console.log(`"${users[uuid].username}" has connected! ID: ${uuid}`);

    connection.send(JSON.stringify({
        type: "welcome",
        message: `Bem-vindo, ${users[uuid].username}!`,
        userId: uuid
    }));

    connection.on("message", message => handleMessage(message, uuid));
    connection.on("close", () => handleClose(uuid));

    BroadcastUsers();
});

server.listen(port, () => {
    console.log(`WebSocket server running on ws://localhost:${port}`);
});