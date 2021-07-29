export class RingBuffer {

    private buffData: Buffer = null;
    private writeIndex = 0;
    private readIndex = 0;

    /**
     * 写入数据到buff
     * @param data 
     */
    writeData(data: Buffer) {
        if (!this.buffData) {
            this.buffData = Buffer.alloc(data.length + 1)
            Buffer.from(data).copy(this.buffData);
            this.writeIndex = data.length;
        } else {
            if (this.writeIndex <= this.readIndex - 1) {
                if (this.writeIndex + data.length < this.readIndex - 1) {
                    data.copy(this.buffData, this.writeIndex)
                    this.writeIndex += data.length;
                } else {
                    let buffer = Buffer.alloc(this.buffData.length + data.length);
                    let houDataLength = this.buffData.length - this.readIndex   //原数据后面未读取的数据长度
                    for (let i = 0; i < houDataLength; i++) {       //把buffer后面未读取的数据添加到一个新的buffer里面
                        buffer[i] = this.buffData[this.readIndex + i];
                    }
                    for (let i = 0; i < this.writeIndex; i++) { //把buffer前面未读取的数据添加到一个新的buffer里面
                        buffer[houDataLength + i] = this.buffData[i]
                    }
                    let OriginalDataLeng = houDataLength + this.writeIndex;  //原数据长度
                    data.copy(buffer, OriginalDataLeng);
                    this.writeIndex = OriginalDataLeng + data.length//新数据已写长度等于原数据长度加上新数据长度
                    this.readIndex = 0;//重置已读数据
                }
            } else {
                if (data.length + this.writeIndex < this.buffData.length) {
                    data.copy(this.buffData, this.writeIndex)
                    this.writeIndex += data.length;
                } else {
                    if (this.buffData.length - this.writeIndex + this.readIndex - 1 >= data.length) {   //判断剩下的空间和已读空间是否足够储存数据
                        let houKongLeng = this.buffData.length - this.writeIndex;   //获取原数据后剩下的空间
                        for (let i = 0; i < houKongLeng; i++) { //把剩下的空间都加上数据
                            this.buffData[this.writeIndex + i] = data[i];
                        }
                        for (let l = 0; l < data.length - houKongLeng; l++) {   //剩下的新数据加到已读数据区域
                            this.buffData[l] = data[houKongLeng + l];
                        }
                        this.writeIndex = data.length - houKongLeng;
                    } else {
                        let buffer = Buffer.alloc(this.buffData.length + data.length);
                        let dataLength = this.writeIndex - this.readIndex;  //获取原数据未读长度
                        for (let i = 0; i < dataLength; i++) {
                            buffer[i] = this.buffData[this.readIndex + i];  //把原未读数据加到新BUff前面
                        }
                        data.copy(buffer, dataLength);
                        this.buffData = buffer;
                        this.writeIndex = dataLength + data.length;
                        this.readIndex = 0;//重置已读数据
                    }
                }

            }
        }
    }
    /**
     * 读取一个字节
     */
    readDateByte() {
        let index = this.readIndex;
        this.readIndex = this.addReadIndex();
        return this.buffData[index];
    }
    /**
     * 读下标新增1
     */
    addReadIndex() {
        return this.readIndex + 1 == this.buffData.length ? 0 : this.readIndex + 1;
    }
    /**
     * 读取num个字节
     * @param num 字节数
     */
    readDateBytes(num: number) {
        let buffer = Buffer.alloc(num);
        for (let i = 0; i < num; i++) {
            buffer[i] = this.readDateByte();
        }
        return buffer;
    }
    /**
     * 清空读写下标
     */
    empty() {
        this.writeIndex = 0;
        this.readIndex = 0;
    }

    /**
     * 获取buffer全部可读数据长度
     */
    getBufferDataLength() {
        if (this.writeIndex == this.readIndex) {
            return 0;
        }
        if (this.writeIndex > this.readIndex) {
            return this.writeIndex - this.readIndex;
        } else if (this.writeIndex < this.readIndex) {
            return this.writeIndex + (this.buffData.length - this.readIndex);
        }
    }
    /**
     * 回退读取数据的下标
     * @param leng 需要回退的长度
     */
    rollBack(leng: number) {
        if (leng <= this.readIndex) {
            this.readIndex -= leng
        } else {
            this.readIndex = this.buffData.length - (leng - this.readIndex);
        }
    }
}