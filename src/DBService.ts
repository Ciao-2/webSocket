import mysql = require('mysql2');
export class DBService {
    static connection: any;
    static pingInterval: any;
    static DBStart() {
        try {
            this.connection = mysql.createConnection({
                host: 'localhost',
                user: 'root',
                database: 'dbtest',
                password: '123456'
            });
        } catch (error) {
            console.log('数据库连接失败:' + error);
        }
        // 连接
        this.connection.connect((err) => {
            if (err) {
                console.log('数据库连接失败:' + err);
                setTimeout(this.DBStart, 2000);
                return;
            }
            console.log('数据库连接成功！');
        });
        this.connection.on("error", this.handleError);

        // 每个小时查询一次数据库，保持数据库连接状态
        clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            console.log('查询select 1，保持数据库连接状态');
            this.connection.query('select 1', (err) => {
                if (err) {
                    console.log('ping error: ' + JSON.stringify(err));
                }
            });
        }, 60 * 60 * 1000);
    }
    //mysql发送错误后重新连接
    static handleError(err) {
        console.info(err.stack || err);
        DBService.DBStart();
    }

    static execute(sql: any, callback: any) {
        this.connection.query(
            sql,
            function (err, results, fields) {
                if (err) {
                    callback(err)
                } else {
                    for (let i = 0; i < results.length; i++) {
                        let result = results[i];
                        for (let key in result) {
                            let value = result[key]
                            if (Buffer.isBuffer(value)) {
                                let base64Str = value.toString('base64');
                                value = base64Str;
                            } else if (value instanceof Date) {
                                value = DBService.getTime("Y-M-D H:I:S", value);
                            }
                            result[key] = value;
                        }
                        results[i] = result;
                    }
                    callback(results)
                }
            }
        );
    }

    static fix2number(n) {
        return [0, n].join('').slice(-2);
    }
    static getTime(format, curdate) {
        // var curDate = new Date();
        if (format == undefined) return curdate;
        format = format.replace(/Y/i, curdate.getFullYear());
        format = format.replace(/m/i, this.fix2number(curdate.getMonth() + 1));
        format = format.replace(/d/i, this.fix2number(curdate.getDate()));
        format = format.replace(/H/i, this.fix2number(curdate.getHours()));
        format = format.replace(/i/i, this.fix2number(curdate.getMinutes()));
        format = format.replace(/s/i, this.fix2number(curdate.getSeconds()));
        format = format.replace(/ms/i, curdate.getMilliseconds());
        return format;
    }
}

