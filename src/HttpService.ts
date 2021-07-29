import http = require('http');
import { DBService } from './DBService';
export class HttpService {
    static httpStart(port) {
        let server = http.createServer((request, response) => {
            console.log(request.method + ': ' + request.url);
            let url = request.url || "";
            response.writeHead(200, { 'Content-Type': 'text/html;charset=utf8' });
            if (request.url !== "/favicon.ico") {
                let data = this.getQueryString(url)
                DBService.execute(data, (data: any) => {
                    // 将HTTP响应200写入response, 同时设置Content-Type: text/html:
                    response.write(JSON.stringify(data));
                    response.end();
                });
            }
        });
        // 让服务器监听8080端口:
        server.listen(port);
        console.log('服务器地址: http://127.0.0.1:8080/');
    }
    static getQueryString(url: String) {
        let theRequest: any = {};
        if (url.indexOf("?") != -1) {
            var str = url.substr(2);
            let strs = str.split("&");
            for (var i = 0; i < strs.length; i++) {
                //theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
                theRequest[strs[i].split("=")[0]] = unescape(strs[i].substr(strs[i].split("=")[0].length + 1));
            }
        }
        return theRequest;
    }
}