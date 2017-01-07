"use strict";
var child_process_1 = require("child_process");
var Promise = require("bluebird");
var _ = require("lodash");
var net = require("net");
var mpvdaemon = (function () {
    function mpvdaemon(conf) {
        this.playlist = [];
        this.track = 0;
        this.uri = "";
        this.daemonized = false;
        this.playing = false;
        this.mpv_process = false;
        this.socketfile = "/tmp/mpvsocket";
        this.socketconf = "--input-unix-socket";
        if (conf) {
            if (conf.socketfile)
                this.socketfile = conf.socketfile;
            if (conf.socketconf)
                this.socketconf = conf.socketconf;
        }
    }
    mpvdaemon.prototype.start = function (play_path) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (!that.daemonized) {
                try {
                    child_process_1.spawn("mpv", ["--idle", that.socketconf + "=" + that.socketfile], { detached: true });
                    setTimeout(function () {
                        that.daemonized = true;
                        that.mpv_process = net.createConnection(that.socketfile);
                        that.mpv_process.on("connect", function () {
                            if (play_path) {
                                that.play(play_path).then(function (a) {
                                    resolve(a);
                                }).catch(function (err) {
                                    reject(err);
                                });
                            }
                            else {
                                resolve(true);
                            }
                        });
                    }, 5000);
                }
                catch (err) {
                    reject(err);
                }
            }
            else if (play_path) {
                try {
                    that.play(play_path);
                    resolve(true);
                }
                catch (err) {
                    reject(err);
                }
            }
            else {
                reject({ error: "player is running" });
            }
        });
    };
    mpvdaemon.prototype.stop = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            try {
                that.mpv_process.kill();
                that.daemonized = false;
                that.track = 0;
                that.playlist = [];
                that.playing = false;
                that.uri = "";
                resolve(true);
            }
            catch (err) {
                reject({ error: err });
            }
        });
    };
    mpvdaemon.prototype.play = function (play_path) {
        var that = this;
        return new Promise(function (resolve, reject) {
            that.mpv_process.write(JSON.stringify({ "command": ["loadfile", play_path] }) + "\r\n", function () {
                resolve(true);
            });
        });
    };
    mpvdaemon.prototype.playTrack = function () {
        return new Promise(function (resolve, reject) {
        });
    };
    mpvdaemon.prototype.addTrack = function (track, index) {
    };
    mpvdaemon.prototype.nextTrack = function () {
        return new Promise(function (resolve, reject) {
        });
    };
    mpvdaemon.prototype.previousTrack = function () {
        return new Promise(function (resolve, reject) {
        });
    };
    mpvdaemon.prototype.setTracks = function (tracks) {
        return new Promise(function (resolve, reject) {
            var list = "";
            _.map(tracks, function (c) {
                if (c) {
                    list += "";
                }
            });
            fs.writeFile("/tmp/mpvplaylist.pls", list, function (err) {
                if (err) {
                    reject({ error: err });
                }
                else {
                    resolve(true);
                }
            });
        });
    };
    return mpvdaemon;
}());
exports.mpvdaemon = mpvdaemon;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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aUpDLElBQUE7QUFqSlksOEJBQVMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzcGF3biB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCJcbmltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBfIGZyb20gXCJsb2Rhc2hcIjtcbmltcG9ydCAqIGFzIG5ldCBmcm9tIFwibmV0XCI7XG5cbmludGVyZmFjZSBJVHJhY2sge1xuXG59XG5cbmludGVyZmFjZSBJbXB2Y29uZiB7XG4gICAgc29ja2V0ZmlsZT86IHN0cmluZztcbiAgICBzb2NrZXRjb25mPzogc3RyaW5nO1xufVxuaW50ZXJmYWNlIEltcHZQbGF5bGlzdCB7XG5cbn1cblxuXG5leHBvcnQgY2xhc3MgbXB2ZGFlbW9uIHtcblxuICAgIHBsYXlsaXN0OiBJbXB2UGxheWxpc3RbXSA9IFtdO1xuICAgIHRyYWNrOiBudW1iZXIgPSAwXG4gICAgdXJpOiBzdHJpbmcgPSBcIlwiXG4gICAgZGFlbW9uaXplZDogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHBsYXlpbmc6IGJvb2xlYW4gPSBmYWxzZVxuICAgIG1wdl9wcm9jZXNzOiBhbnkgPSBmYWxzZVxuICAgIHNvY2tldDogYW55O1xuICAgIHNvY2tldGZpbGU6IHN0cmluZyA9IFwiL3RtcC9tcHZzb2NrZXRcIlxuICAgIHNvY2tldGNvbmY6IHN0cmluZyA9IFwiLS1pbnB1dC11bml4LXNvY2tldFwiXG4gICAgY29uc3RydWN0b3IoY29uZj86IEltcHZjb25mKSB7XG4gICAgICAgIGlmIChjb25mKSB7XG4gICAgICAgICAgICBpZiAoY29uZi5zb2NrZXRmaWxlKSB0aGlzLnNvY2tldGZpbGUgPSBjb25mLnNvY2tldGZpbGVcbiAgICAgICAgICAgIGlmIChjb25mLnNvY2tldGNvbmYpIHRoaXMuc29ja2V0Y29uZiA9IGNvbmYuc29ja2V0Y29uZlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhcnQocGxheV9wYXRoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGF0LmRhZW1vbml6ZWQpIHtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYXduKFwibXB2XCIsIFtcIi0taWRsZVwiLCB0aGF0LnNvY2tldGNvbmYgKyBcIj1cIiArIHRoYXQuc29ja2V0ZmlsZV0sIHsgZGV0YWNoZWQ6IHRydWUgfSlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZGFlbW9uaXplZCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3MgPSBuZXQuY3JlYXRlQ29ubmVjdGlvbih0aGF0LnNvY2tldGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy5vbihcImNvbm5lY3RcIiwgZnVuY3Rpb24gKCkgeyAvLyBhZGQgdGltZW91dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5X3BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5KHBsYXlfcGF0aCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMDApXG5cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5X3BhdGgpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXkocGxheV9wYXRoKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwicGxheWVyIGlzIHJ1bm5pbmdcIiB9KVxuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgc3RvcCgpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy5raWxsKClcbiAgICAgICAgICAgICAgICB0aGF0LmRhZW1vbml6ZWQgPSBmYWxzZVxuICAgICAgICAgICAgICAgIHRoYXQudHJhY2sgPSAwXG4gICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdCA9IFtdXG4gICAgICAgICAgICAgICAgdGhhdC5wbGF5aW5nID0gZmFsc2VcbiAgICAgICAgICAgICAgICB0aGF0LnVyaSA9IFwiXCJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuICAgIH1cbiAgICBwbGF5KHBsYXlfcGF0aCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcImxvYWRmaWxlXCIsIHBsYXlfcGF0aF0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICB9KVxuICAgIH1cbiAgICBwbGF5VHJhY2soKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGFkZFRyYWNrKHRyYWNrLCBpbmRleD86IG51bWJlcikge1xuXG4gICAgfVxuICAgIG5leHRUcmFjaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcHJldmlvdXNUcmFjaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgc2V0VHJhY2tzKHRyYWNrczogSVRyYWNrW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBsaXN0OiBzdHJpbmcgPSBcIlwiXG4gICAgICAgICAgICBfLm1hcCh0cmFja3MsIChjKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdCArPSBcIlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZnMud3JpdGVGaWxlKFwiL3RtcC9tcHZwbGF5bGlzdC5wbHNcIiwgbGlzdCwgZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cbiAgICB9XG5cblxufVxuXG4iXX0=
