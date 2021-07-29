import { DBService } from "./DBService";
import { Tcp_Server } from "./TcpService";
import { HttpService } from "./HttpService";
import { webSocketClient } from "./WebSocketClient";
import { Tcp_Client } from "./TcpClient";
export class test {
    static async main() {
        // DBService.DBStart();
        // HttpService.httpStart(8081);
        let tcp_Server = new Tcp_Server();
        tcp_Server.startServer(8082);

        // setTimeout(async function () {
        //     webSocketClient.main();
        //     }, 1000);
        // let tcp_Client = new Tcp_Client();
        // tcp_Client.connectRpcServer("127.0.0.1",8082);

        // // setInterval(async function () {
        // //     let data = await tcp_Client.webSend("123321",1,true,0);
        // //     console.log(data)
        // // }, 3000);

        // setTimeout(async function () {
        //     let data = await tcp_Client.webSend("123456",0,true,0);
        // }, 1000);
        // setTimeout(async function () {
        //     let data = await tcp_Client.webSend("7890",0,true,1);
        // }, 1000);

        // setTimeout(async function () {
        //     let data = await tcp_Client.send({ sql: "select * from players_1" });
        //     console.log(data)
        // }, 1000);

    }
}
test.main();
