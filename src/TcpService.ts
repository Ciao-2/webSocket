import net = require('net');
import { DBService } from './DBService';
import { WebSocketTest } from './WebSocketTest';
export class Tcp_Server {
    startServer(port: number) {
        let tcp_server = net.createServer();  // 创建 tcp server
        let Sockets = {};
        let SocketID = 1;
        // 监听 端口
        tcp_server.listen(port, function () {
            console.log('TCP服务器监听端口' + port);
        });

        // 处理客户端连接
        tcp_server.on('connection', (socket) => {
            console.log(socket.address());
            Sockets[SocketID] = socket;
            let webSocket = new WebSocketTest();
            webSocket.webSocket = socket;
            webSocket.onData();
            //this.DealConnect(webSocket)
            SocketID++;

        })

        tcp_server.on('error', function () {
            console.log('tcp_server error!');
        })

        tcp_server.on('close', function () {
            console.log('tcp_server close!');
        })



    }
    // 处理每个客户端消息
    DealConnect(socket) {
        socket.on('data', (data) => {
            data = data.toString();
            // 向所有客户端广播消息
            // for (let i in Sockets) {
            //     Sockets[i].write(data);
            // }
            //this.onMessage(data, socket)
            // socket.write(data);
            console.log('服务端发送信息： %s', data);
        })

        // 客户端正常断开时执行
        socket.on('close', function () {
            console.log('client disconneted!');
        })
        // 客户端正异断开时执行
        socket.on("error", function (err) {
            console.log('client error disconneted!');
        });
    }
    onMessage(data, socket) {
        let database = JSON.parse(data.toString())
        let sql = database.sql;
        let socketIndex = database.socketIndex;
        DBService.execute(sql, (data: any) => {
            console.log(data)
            data[0].socketIndex = socketIndex;
            socket.write(JSON.stringify(data));
        });
    }
}
