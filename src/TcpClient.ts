import net = require('net');
import { createHash } from 'crypto';
export class Tcp_Client {
    protected tcp_client;
    protected index = 1;
    protected status = 0;
    dataBuff: Buffer = null;
    finData: Buffer = null;
    resolvemap = new Map<number, Function>();
    protected secKey = null;
    connectRpcServer(ip,port) {
        // 指定连接的tcp server ip，端口
        let options = {
            host: ip,
            port: port
        }

        this.tcp_client = new net.Socket();

        // 连接 tcp server
        this.tcp_client.connect(options, () => {
            try {
                this.secKey = "ZeZID6Il7W4S7b1dY6/8LQ=="
                this.tcp_client.write("GET / HTTP/1.1\r\nHost: "+ip+":"+port+"\r\nConnection: Upgrade\r\nPragma: no-cache\r\nCache-Control: no-cache\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36\r\nUpgrade: websocket\r\nOrigin: http://socket.ldoweb.com\r\nSec-WebSocket-Version: 13\r\nAccept-Encoding: gzip, deflate, br\r\nAccept-Language: zh-CN,zh;q=0.9,zh-TW;q=0.8,en-US;q=0.7,en;q=0.6\r\nSec-WebSocket-Key: " + this.secKey + "\r\nSec-WebSocket-Extensions: permessage-deflate; client_max_window_bits\r\n\r\n")
            } catch (error) {
                console.error("error:" + error)
            }
        })

        // 接收数据
        this.tcp_client.on('data', (data) => {
            // console.log(data.toString())
            this.onMessage(data);
            // console.log('客户端接收数据: %s', data.toString());
        })

        this.tcp_client.on('end', function () {
            console.log('data end!');
        })

        this.tcp_client.on('error', function (err) {
            console.log('tcp_client error!:' + err);
        })
    }



    onMessage(data) {
        // let database = JSON.parse(data.toString());
        // let socketIndex = database[0].socketIndex;
        // if (socketIndex) {
        //     delete database[0].socketIndex
        //     this.resolvemap.get(socketIndex)(database);
        // }
        if (this.status == 0) {
            let key = this.handshake(data).trim();
            let GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
            let digest = createHash('sha1')
                .update(this.secKey + GUID)
                .digest('base64');

            if (key == digest) {
                this.status = 1;
            } else {
                this.status = 2;
                this.tcp_client.destroy();
            }
        } else if (this.status == 1) {
            console.log("--------------" + data)
            if (data.length > 2) {
                if (!this.checkDataLength(data)) {
                    console.log("数据长度对应不上,保存数据不处理")
                    return null;
                }
                data = this.dataBuff;
                let fin = (data[0] & 0x80) === 0x80 //是否为消息的最后一条数据
                console.log("是否为服务端消息的最后一条数据:" + fin)
                let opcode = data[0] & 0x0f
                let isMask = (data[1] & 0x80) === 0x80// 是否有掩码
                let payloadLength = data[1] & 0x7f
                let leng = 0;
                let zijie = 2;
                let maskingKey = Buffer.alloc(4);
                if (payloadLength <= 125) {
                    leng = payloadLength;
                } else if (payloadLength == 126) {
                    leng = data.slice(2, 4).readUInt16BE(0);
                    zijie += 2;
                } else if (payloadLength == 127) {
                    leng = data.slice(2, 10).readDoubleBE(0);
                    zijie += 8;
                }
                let dataBase = Buffer.alloc(leng);
                if (isMask) {
                    maskingKey = data.slice(zijie, zijie + 4)
                    zijie += 4;
                    dataBase = data.slice(zijie, zijie + leng);

                    for (let i = 0; i < leng; i++) {
                        dataBase[i] ^= maskingKey[i % 4];
                    }
                } else {
                    dataBase = data.slice(zijie, zijie + leng);
                }
                this.dataBuff = null;
                this.processorData(opcode, dataBase, fin);
            }
        }
    }

    /**
     * 解析握手数据
     * @param data 握手数据
     */
    handshake(data: any) {
        let handshake = data.toString();
        if (handshake.indexOf("\r\n\r\n") == -1) {
            return null;
        }
        if (handshake.substring(0, 12) != "HTTP/1.1 101") {
            return null;
        }
        if ((handshake.split("Upgrade").length - 1) < 2) {
            return null;
        }
        let upgrade = handshake.indexOf("Upgrade");
        let webSocketStr = handshake.substring(upgrade + 9, upgrade + 18);

        let connectionStr = handshake.substring(upgrade - 12, upgrade - 1);
        if (webSocketStr != "websocket") {
            if (connectionStr != "Connection:") {
                return null;
            }
            let upgradeIndex = this.find(handshake, "Upgrade", 2)
            let webSocketStr2 = handshake.substring(upgradeIndex + 9, upgradeIndex + 18);
            if (webSocketStr2 != "websocket") {
                return null;
            }
        }
        let indexConnection = handshake.indexOf("Connection:");
        let StrConnection = handshake.substring(indexConnection + 12, indexConnection + 19)
        if (StrConnection != "Upgrade") {
            return null;
        }
        let indexAccept = handshake.indexOf("Sec-WebSocket-Accept:");
        let indexAcceptLast = handshake.indexOf("=");
        let key = handshake.substring(indexAccept + 21, indexAcceptLast + 1);
        return key;
    }

    /**
    * 检查发送的数据长度是否正确
    * @param data 
    */
    checkDataLength(data: Buffer) {
        let isMask = (data[1] & 0x80) === 0x80
        let payloadLength = data[1] & 0x7f
        let dataLength = 2;
        if (isMask) {
            dataLength += 4;
        }
        if (payloadLength <= 125) {
            dataLength += payloadLength;
        } else if (payloadLength == 126) {
            dataLength += 2;
            dataLength += data.slice(2, 4).readUInt16BE(0);
        } else if (payloadLength == 127) {
            dataLength += 8;
            dataLength += data.slice(2, 10).readDoubleBE(0);
        }
        if (this.dataBuff == null) {
            this.dataBuff = data;
        } else {
            let totalLength = this.dataBuff.length + data.length;
            this.dataBuff = Buffer.concat([this.dataBuff, data], totalLength);
        }
        if (this.dataBuff.length < dataLength) {
            return null;
        }
        return this.dataBuff;
    }

    async send(data) {
        let _this = this;
        return new Promise((resolve, reject) => {
            let socketIndex = _this.index;
            data.socketIndex = socketIndex;
            _this.index++
            _this.tcp_client.write(JSON.stringify(data))
            _this.resolvemap.set(socketIndex, resolve);
        })
    }

    webSend(data, opcode: number, isMasked: boolean, isFin) {
        let buffData = Buffer.from(data);
        let length = buffData.length;
        let index = 2;
        if (length >= 126 && length <= 65535) {
            index += 2;  //Payload length需要加16bit 2个字节
            length += 2;
        } else if (length > 65535) {
            index += 8;//Payload length需要加64bit 8个字节
            length += 8;
        }
        let Masked = 0;
        if (isMasked) {
            length += 4
            Masked = 0x80;
        }
        let fin = 0;
        if (isFin) {
            fin = 0x80;
        }
        let buffAll = Buffer.alloc(length + 2);
        buffAll[0] = fin | opcode;
        if (index == 2) {
            buffAll[1] = Masked | buffData.length;
        } else if (index == 4) {
            buffAll[1] = Masked | 126;
            buffAll.writeInt16BE(buffData.length, 2)
        } else if (index = 10) {
            buffAll[1] = Masked | 127;
            buffAll.writeDoubleBE(buffData.length, 2)
        }

        if (isMasked) {
            let maskedKeyNumber = Math.floor(Math.random() * 8999 + 1000)
            let maskedKey = Buffer.from(maskedKeyNumber.toString());
            maskedKey.copy(buffAll, index, 0, 4);
            index += 4;
            for (let i = 0; i < buffData.length; i++) {
                buffData[i] ^= maskedKey[i % 4];
            }
        }
        buffData.copy(buffAll, index, 0, buffData.length);
        // this.tcp_client.write(buffAll.slice(0,6));

        // setTimeout(async ()=> {
        //     this.tcp_client.write(buffAll.slice(6,buffAll.length));
        // }, 1000);
        this.tcp_client.write(buffAll);
        // 一帧分成两段数据发

        //一段数据 分成两针来发

    }
    find(str, cha, num) {
        var x = str.indexOf(cha);
        for (var i = 1; i < num; i++) {
            x = str.indexOf(cha, x + 1);
        }
        return x;
    }

    processorData(opcode, dataBase, fin) {
        switch (opcode) {
            case 0:
                console.log("帧数据为：" + dataBase.toString())
                if (this.finData == null) {
                    this.finData = dataBase;
                } else {
                    let totalLength = this.finData.length + dataBase.length;
                    this.finData = Buffer.concat([this.finData, dataBase], totalLength);
                }
                if (fin) {
                    let data = this.finData;
                    this.finData = null;
                   // this.webSend(data, opcode, true, 1);
                    //console.log("收到服务端多帧数据为：" + data.toString())
                }
                break;
            case 1:
                //this.webSocket.write("12312312")
                //his.webSend(dataBase, opcode, true, 1);
                console.log("收到服务端发送的文本数据：" + dataBase.toString())
                break;
            case 8:
                console.log("收到服务端断开连接的请求，关闭连接")
                this.tcp_client.destroy();
                break;
            case 9:
                break;
            case "A":
                break;
            default:
                break;
        }
    }
}