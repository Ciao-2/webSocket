import net = require('net');
import url = require('url');
import { createHash } from 'crypto';
import { RingBuffer } from './RingBuffer';
export class WebSocketTest {
    status = 0;//tcp连接状态 0:未握手   1:握手成功   2:断开连接  3:HTTP长连接
    webSocket: net.Socket = null;
    dataBuff: RingBuffer = null;
    finData: Buffer = null;
    constructor() {
        this.dataBuff = new RingBuffer();
    }
    onData() {
        this.webSocket.on('data', (data: Buffer) => {
            this.dataBuff.writeData(data);
            let leng = this.processPacket(this.dataBuff);//判断数据是否结束   结束获取结束的位置
            while (leng != -1) {
                this.analysisPacket(leng) //解析数据
                leng = this.processPacket(this.dataBuff);
            }

        })
    }

    /**
     * 解析数据
     * @param leng 需要解析数据结束位置
     */
    analysisPacket(leng: number) {
        let data = this.dataBuff.readDateBytes(leng);
        if (this.status == 0) {
            let key = this.handshake(data)
            if (key) {
                this.dataBuff.empty()
                let str = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + this.WebSocketAccept(key) + "\r\n" + "\r\n";
                this.webSocket.write(str);
                this.status = 1;
            } else {
                let ConValue = this.analysisHTTP(data)
                if (ConValue) {
                    let body = "<html>\r\n<body>\r\n<h1>Hello,world</h1>\r\n</body>\r\n</html>";
                    let buff = "HTTP/1.1 200 OK\r\nContent-Type:text/html\r\nContent-Length:" + body.length + "\r\nConnection:" + ConValue.ConnectionValue + "\r\n\r\n" + body
                    this.webSocket.write(buff);
                    if (ConValue.ConnectionValue == "keep-alive") {
                        console.log(ConValue.ConnectionValue)
                        this.status = 3;
                    } else if (ConValue.ConnectionValue == "close") {
                        console.log(ConValue.ConnectionValue)
                        this.status = 2;
                        this.webSocket.destroy();
                    }
                } else {
                    this.status = 2;
                    this.webSocket.destroy();
                }
            }
        } else if (this.status == 1) {
            let fin = (data[0] & 0x80) === 0x80 //是否为消息的最后一条数据
            console.log("是否为客户端消息的最后一条数据:" + fin)
            let opcode = data[0] & 0x0f
            let isMask = (data[1] & 0x80) === 0x80// 是否有掩码
            let payloadLength = data[1] & 0x7f
            let Dataleng = 0;   //真实数据长度
            let startLeng = 2;//data开始的位置 要加上头部两个字节
            if (payloadLength <= 125) {
                Dataleng = payloadLength;
            } else if (payloadLength == 126) {
                Dataleng = data.readUInt16BE(2);
                startLeng += 2;
            } else if (payloadLength == 127) {
                Dataleng = data.readDoubleBE(2);
                startLeng += 8;
            }
            if (isMask) {
                let maskIndex = startLeng; //掩码开始位置
                startLeng += 4;
                for (let i = 0; i < Dataleng; i++) {
                    data[startLeng + i] ^= data[maskIndex + (i % 4)];
                }
            }
            this.processorData(opcode, data, fin, startLeng, Dataleng);
        } else if (this.status == 3) {
            let ConValue = this.analysisHTTP(data)
            if (ConValue) {
                let body = "<html>\r\n<body>\r\n<h1>Hello,world</h1>\r\n</body>\r\n</html>";
                let buff = "HTTP/1.1 200 OK\r\nContent-Type:text/html\r\nContent-Length:" + body.length + "\r\nConnection:" + ConValue.ConnectionValue + "\r\n\r\n" + body
                this.webSocket.write(buff);
                if (ConValue.ConnectionValue == "close") {
                    console.log(ConValue.ConnectionValue)
                    this.status = 2;
                    this.webSocket.destroy();
                }
            } else {
                this.status = 2;
                this.webSocket.destroy();
            }
        }
    }
    /**
     * 检查是否足够数据长度解析
     */
    processPacket(dataBuff: RingBuffer) {
        let leng = dataBuff.getBufferDataLength();//获取总数据的长度
        let data = dataBuff.readDateBytes(leng);
        dataBuff.rollBack(leng);
        if (this.status == 0 || this.status == 3) {
            let endIndex = data.indexOf("\r\n\r\n");
            if (endIndex == -1) {
                return -1;
            } else {
                return endIndex + 4;
            }
        } else if (this.status == 1) {
            let leng = this.checkDataLength(data);
            if (leng == -1) {
                return -1;
            } else {
                return leng;
            }
        }


        // let buf = Buffer.alloc(10)
        // let readIndex = 0
        // let readByte = function () {
        //     return buf[readIndex++]
        // }
        // //端绪
        // // 0000 0001         0000 0010
        // //   1    2
        // let readShort = function () {
        //     let res = (buf[readIndex] << 8) & (buf[readIndex + 1])
        //     readIndex += 2
        //     return res
        // }
    }


    /**
     * 
     * @param opcode   操作码
     * @param dataBase 全部数据长度
     * @param fin 是否是结束侦
     * @param startLeng 真实数据开始位置
     * @param dataLength 真实数据长度
     */
    processorData(opcode, data: Buffer, fin: boolean, startLeng: number, dataLength: number) {
        let dataBase = Buffer.alloc(dataLength);
        for (let i = 0; i < dataLength; i++) {
            dataBase[i] = data[startLeng + i];
        }
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
                    this.socketSend(data, opcode, false, 1);
                    console.log("收到客户端多帧数据为：" + data.toString())
                }
                break;
            case 1:
                this.socketSend(dataBase, opcode, false, 1);
                console.log("收到客户端发送的文本数据：" + dataBase.toString())
                break;
            case 8:
                console.log("收到客户端断开连接的请求，关闭连接")
                this.webSocket.destroy();
                break;
            case 9:
                console.log("ping")
                break;
            case "A":
                console.log("pong")
                break;
            default:
                console.log("opcode:" + opcode)
                break;
        }
    }
    /**
     * 发送socket数据
     * @param buffData 需要发送的socket信息内容
     * @param opcode 操作码
     * @param isMasked 是否有掩码
     * @param isFin 是否结束
     */
    socketSend(buffData: Buffer, opcode: number, isMasked: boolean, isFin: number) {
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
        this.webSocket.write(buffAll);
    }

    /**
     * 检查发送的数据长度是否正确   数据长度足够的话获得需要处理的长度
     * @param data 
     */
    checkDataLength(data: Buffer) {
        if (data.length < 2) {
            return -1;
        }
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
            dataLength += data.readInt16BE(2)
        } else if (payloadLength == 127) {
            dataLength += 8;
            dataLength += data.readDoubleBE(2)
        }
        if (data.length < dataLength) {
            return -1;
        } else {
            return dataLength;
        }
    }

    /**
     * 根据Sec-WebSocket-Key获取Sec-WebSocket-Accept
     * @param key Sec-WebSocket-Key
     */
    public WebSocketAccept(key: String) {
        let GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        const digest = createHash('sha1')
            .update(key + GUID)
            .digest('base64');
        return digest;
    }
    /**
     * 解析握手数据
     * @param data 握手数据
     */
    handshake(data: Buffer) {
        let handshake = data.toString();
        if (handshake.substring(0, 14) != "GET / HTTP/1.1") {
            return null;
        }
        if (handshake.indexOf("Host") == -1) {
            return null;
        }
        if ((handshake.split("Upgrade").length - 1) < 2) {
            return null;
        }
        let upgrade = handshake.indexOf("Upgrade");
        let webSocketStr = handshake.substring(upgrade + 9, upgrade + 18).toUpperCase();

        let connectionStr = handshake.substring(upgrade - 12, upgrade - 1);
        if (webSocketStr != "WEBSOCKET") {
            if (connectionStr != "Connection:") {
                return null;
            }
            let upgradeIndex = this.find(handshake, "Upgrade", 2)
            let webSocketStr2 = handshake.substring(upgradeIndex + 9, upgradeIndex + 18).toUpperCase();
            if (webSocketStr2 != "WEBSOCKET") {
                return null;
            }
        }
        let indexConnection = handshake.indexOf("Connection:");
        let StrConnection = handshake.substring(indexConnection + 12, indexConnection + 19).toUpperCase();
        if (StrConnection != "UPGRADE") {
            return null;
        }
        let indexVersion = handshake.indexOf("Sec-WebSocket-Version:");
        let strVersion = handshake.substring(indexVersion + 23, indexVersion + 25);

        if (strVersion != "13") {
            return null;
        }

        let indexKey = handshake.indexOf("Sec-WebSocket-Key:");
        let indexKeyLast = handshake.indexOf("==");
        let key = handshake.substring(indexKey + 19, indexKeyLast + 2);
        return key;
    }
    /**
     * 获取第num个cha在str出现的位置下标
     * @param str 原字符串
     * @param cha 需要查询的字符
     * @param num 第几个出现的位置
     */
    find(str: string, cha: string, num: number) {
        var x = str.indexOf(cha);
        for (var i = 1; i < num; i++) {
            x = str.indexOf(cha, x + 1);
        }
        return x;
    }



    analysisHTTP(data) {
        // let analysisData = data.toString();
        // if (analysisData.substring(0, 3) != "GET") {
        //     return tang;
        // }
        // if (analysisData.indexOf("Host") == -1) {
        //     return xue;
        // }
        // if (analysisData.indexOf("HTTP/1.1") == -1) {
        //     return feng;
        // }
        // let index = analysisData.indexOf("Connection");
        // let str = analysisData.substring(index);
        // let indexRN = str.indexOf("/r/n");
        // let ConnectionValue = str.substring(0, indexRN);
        // if (ConnectionValue) {
        //     return ConnectionValue;
        // }
        // return "close";

        let analysis = data.toString();
        let index = analysis.indexOf("\r\n");
        let requestLine = analysis.substring(0, index);//请求行
        let kongIndex = analysis.indexOf("\r\n\r\n");
        let header = analysis.substring(index + 2, kongIndex);//请求唐雪凤的头
        let getindex = requestLine.indexOf("GET");
        let versionIndex = requestLine.indexOf("HTTP/1.1");
        if (getindex == -1) {
            return null;
        }
        if (versionIndex == -1) {
            return null;
        }
        let conIndex = header.indexOf("Connection:")
        let ConnectionValue = header.substring(conIndex + 11, header.indexOf("\r\n", conIndex)).trim();
        let urlbase = requestLine.substring(getindex + 4, versionIndex + 1);
        let urlData = url.parse(urlbase);
        return { requestLine: requestLine, header: header, ConnectionValue: ConnectionValue, urlData: urlData };
    }
}


