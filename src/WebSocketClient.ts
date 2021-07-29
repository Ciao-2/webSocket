import * as ws from 'ws';
export class webSocketClient {
   static main() {
        // 创建 WebSocket 客户端
        const webSocketClient = new ws('ws://127.0.0.1:8082');

        webSocketClient.on('open', () => {
            setTimeout(() => {
                webSocketClient.send('123');
                webSocketClient.send('321');
            }, 1000);
            console.log('web socket opened');
        });

        webSocketClient.on('message', (data) => {
            console.log(data);
            // setTimeout(() => {
            //     webSocketClient.send('terminate');
            // }, 5000);
        });

        webSocketClient.on('error', (error: Error) => {
            console.log(error);
        });

        webSocketClient.on('close', () => {
            console.log('???');
        });

        webSocketClient.on('ping', (data) => {
            console.log('ping' + data);
        });

        webSocketClient.on('pong', (data) => {
            console.log('pong' + data);
        });
    }
}