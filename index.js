"use strict";
var child_process_1 = require("child_process");
var Promise = require("bluebird");
var _ = require("lodash");
var pathExists = require("path-exists");
var async = require("async");
var net = require("net");
var fs = require("fs");
var unicoid_1 = require("unicoid");
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
                        that.mpv_process = net.createConnection(that.socketfile);
                        that.mpv_process.on("connect", function () {
                            if (!that.daemonized) {
                                that.daemonized = true;
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
                            }
                        });
                    }, 5000);
                }
                catch (err) {
                    reject(err);
                }
            }
            else if (play_path) {
                that.play(play_path).then(function () {
                    resolve(true);
                }).catch(function (err) {
                    reject(err);
                });
            }
            else {
                reject({ error: "player is running" });
            }
        });
    };
    mpvdaemon.prototype.switch = function (target) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (target > 0) {
                that.next(target).then(function (a) {
                    resolve(a);
                }).catch(function (err) {
                    reject(err);
                });
            }
            else if (target === 0) {
                reject({ error: "nothing to do" });
            }
            else {
                that.prev(target).then(function (a) {
                    resolve(a);
                }).catch(function (err) {
                    reject(err);
                });
            }
        });
    };
    mpvdaemon.prototype.next = function (target) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (!target || target === 1) {
                that.mpv_process.write(JSON.stringify({ "command": ["playlist-next"] }) + "\r\n", function () {
                    if (that.track < that.playlist.length) {
                        _.map(that.playlist, function (p, i) {
                            if (i !== (that.track + 1)) {
                                that.uri = p.uri;
                            }
                        });
                        that.track += 1;
                    }
                    resolve(true);
                });
            }
            else {
                that.to(that.track + target).then(function (a) {
                    resolve(a);
                }).catch(function (err) {
                    reject(err);
                });
            }
        });
    };
    mpvdaemon.prototype.prev = function (target) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (!target || target === 1) {
                that.mpv_process.write(JSON.stringify({ "command": ["playlist-prev"] }) + "\r\n", function () {
                    if (that.track > 1) {
                        _.map(that.playlist, function (p, i) {
                            if (i !== (that.track - 1)) {
                                that.uri = p.uri;
                            }
                        });
                        that.track += -1;
                    }
                    resolve(true);
                });
            }
            else {
                that.to(that.track + Math.abs(target)).then(function (a) {
                    resolve(a);
                }).catch(function (err) {
                    reject(err);
                });
            }
        });
    };
    mpvdaemon.prototype.to = function (target) {
        var that = this;
        return new Promise(function (resolve, reject) {
            reject("todo");
        });
    };
    mpvdaemon.prototype.stop = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            try {
                that.mpv_process.write(JSON.stringify({ "command": ["stop"] }) + "\r\n", function () {
                    that.track = 0;
                    that.playlist = [];
                    that.playing = false;
                    that.uri = "";
                    resolve(true);
                });
            }
            catch (err) {
                reject({ error: err });
            }
        });
    };
    mpvdaemon.prototype.end = function () {
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
    mpvdaemon.prototype.loadListfromFile = function (playlist_path, playnow) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (playlist_path && playlist_path.split('.pls').length > 1) {
                pathExists(playlist_path).then(function (a) {
                    if (a) {
                        if (that.daemonized) {
                            fs.readFile(playlist_path, function (err, data) {
                                if (err) {
                                    console.log("errload");
                                    reject({ error: err });
                                }
                                else {
                                    fs.readFile(playlist_path, function (err, data) {
                                        if (err) {
                                            console.log({ error: err });
                                            reject({ error: err });
                                        }
                                        else {
                                            var datatoarray = data.toString().split("\n");
                                            var tracks_1 = [];
                                            _.map(datatoarray, function (data) {
                                                if (data.split('=').length > 1 && data.split('NumberOfEntries=').length < 2 && data.split('Version=').length < 2) {
                                                    var index = parseInt(data.split('=')[0][data.split('=')[0].length - 1]);
                                                    if (tracks_1.length < index) {
                                                        tracks_1.push({});
                                                    }
                                                    if (data.split('File').length > 1) {
                                                        tracks_1[index - 1].uri = data.split(data.split('=')[0] + "=")[1];
                                                    }
                                                    else if (data.split('Title').length > 1) {
                                                        tracks_1[index - 1].title = data.split(data.split('=')[0] + "=")[1];
                                                    }
                                                }
                                            });
                                            that.playlist = [];
                                            _.map(tracks_1, function (track) {
                                                track.label = unicoid_1.uniqueid(4);
                                                that.playlist.push(track);
                                            });
                                            if (playnow) {
                                                that.mpv_process.write(JSON.stringify({ "command": ["loadlist", playlist_path, "replace"] }) + "\r\n", function () {
                                                    that.play().then(function (a) {
                                                        resolve(a);
                                                    }).catch(function (err) {
                                                        reject(err);
                                                    });
                                                });
                                            }
                                            else {
                                                that.mpv_process.write(JSON.stringify({ "command": ["loadlist", playlist_path, "replace"] }) + "\r\n", function () {
                                                    resolve(true);
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            reject({ error: "mpv not started" });
                        }
                    }
                    else {
                        console.log("erro");
                        reject({ error: "wrong path" });
                    }
                }).catch(function (err) {
                    reject(err);
                });
            }
            else {
                console.log("erro");
                reject({ error: "file must be a .pls file" });
            }
        });
    };
    mpvdaemon.prototype.addTrack = function (track, index) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var filepath = "/tmp/mpvfilelist_" + new Date().getTime() + ".pls";
            console.log(filepath);
            var filelist = "[playlist]\n\nFile1=" + track.uri + "\n";
            if (track.title)
                filelist += "Title1=" + track.title + "\n";
            filelist += "\nNumberOfEntries=1\nVersion=2\n";
            fs.writeFile(filepath, filelist, {}, function (err) {
                if (!err) {
                    if (that.playlist.length > 0) {
                        that.mpv_process.write(JSON.stringify({ "command": ["loadlist", filepath, "append"] }) + "\r\n", function () {
                            if (!track.label)
                                track.label = unicoid_1.uniqueid(4);
                            that.playlist.push(track);
                            resolve(true);
                        });
                    }
                    else {
                        that.mpv_process.write(JSON.stringify({ "command": ["loadlist", filepath] }) + "\r\n", function () {
                            if (!track.label)
                                track.label = unicoid_1.uniqueid(4);
                            that.playlist.push(track);
                            resolve(true);
                        });
                    }
                }
                else {
                    reject({ error: "wrong path" });
                }
            });
        });
    };
    mpvdaemon.prototype.clearList = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (that.playlist.length > 0) {
                var preserve_1;
                that.mpv_process.write(JSON.stringify({ "command": ["playlist-clear"] }) + "\r\n", function () {
                    _.map(that.playlist, function (t) {
                        if (t.uri === that.uri) {
                            preserve_1 = t;
                        }
                    });
                    if (preserve_1) {
                        that.playlist = [preserve_1];
                    }
                    else {
                        that.playlist = [];
                    }
                    resolve(true);
                });
            }
            else {
                resolve(true);
            }
        });
    };
    mpvdaemon.prototype.loadList = function (tracks) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (that.playing) {
                that.clearList().then(function () {
                    async.eachSeries(tracks, function (track, cb) {
                        that.addTrack(track).then(function (a) {
                            cb();
                        }).catch(function (err) {
                            cb(err);
                        });
                    }, function (err) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", function () {
                                resolve(true);
                            });
                        }
                    });
                }).catch(function (err) {
                    reject(err);
                });
            }
            else {
                async.eachSeries(tracks, function (track, cb) {
                    that.addTrack(track).then(function (a) {
                        cb();
                    }).catch(function (err) {
                        cb(err);
                    });
                }, function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        that.playing = true;
                        that.track = 1;
                        that.uri = that.playlist[0].uri;
                        resolve(true);
                    }
                });
            }
        });
    };
    mpvdaemon.prototype.play = function (play_path) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (play_path) {
                if (that.playlist.length > 1) {
                    that.clearList().then(function () {
                        console.log(play_path);
                        that.addTrack({ uri: play_path }).then(function () {
                            that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", function () {
                                that.playlist = [];
                                that.playlist.push({ uri: play_path, label: unicoid_1.uniqueid(6) });
                                that.playing = true;
                                that.uri = play_path;
                                that.track = 1;
                                resolve(true);
                            });
                        }).catch(function (err) {
                            reject(err);
                        });
                    }).catch(function (err) {
                        that.addTrack({ uri: play_path }).then(function () {
                            that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", function () {
                                that.playlist = [];
                                that.playlist.push({ uri: play_path, label: unicoid_1.uniqueid(6) });
                                that.playing = true;
                                that.uri = play_path;
                                that.track = 1;
                                resolve(true);
                            });
                        }).catch(function (err) {
                            reject(err);
                        });
                    });
                }
                else if (that.playlist.length === 1) {
                    that.addTrack({ uri: play_path }).then(function () {
                        that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", function () {
                            that.playlist = [];
                            that.playlist.push({ uri: play_path, label: unicoid_1.uniqueid(6) });
                            that.playing = true;
                            that.uri = play_path;
                            that.track = 1;
                            resolve(true);
                        });
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    that.mpv_process.write(JSON.stringify({ "command": ["loadfile", play_path] }) + "\r\n", function () {
                        that.playlist.push({ uri: play_path, label: unicoid_1.uniqueid(6) });
                        that.playing = true;
                        that.uri = play_path;
                        that.track = 1;
                        resolve(true);
                    });
                }
            }
            else if (that.playlist.length > 0 && !that.playing) {
                that.mpv_process.write(JSON.stringify({ "command": ["play"] }) + "\r\n", function () {
                    that.playing = true;
                    if (!that.track)
                        that.track = 1;
                    if (!that.uri)
                        that.uri = that.playlist[0].uri;
                    resolve(true);
                });
            }
            else {
                reject("nothing to play");
            }
        });
    };
    mpvdaemon.prototype.pause = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            that.mpv_process.write(JSON.stringify({ "command": ["play"] }) + "\r\n", function () {
                that.playing = false;
                resolve(true);
            });
        });
    };
    mpvdaemon.prototype.playTrack = function () {
        return new Promise(function (resolve, reject) {
        });
    };
    mpvdaemon.prototype.nextTrack = function () {
        return new Promise(function (resolve, reject) {
        });
    };
    mpvdaemon.prototype.previousTrack = function () {
        return new Promise(function (resolve, reject) {
        });
    };
    return mpvdaemon;
}());
exports.mpvdaemon = mpvdaemon;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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OiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNwYXduIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIlxuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuY29uc3QgcGF0aEV4aXN0cyA9IHJlcXVpcmUoXCJwYXRoLWV4aXN0c1wiKTtcbmltcG9ydCAqIGFzIGFzeW5jIGZyb20gXCJhc3luY1wiO1xuaW1wb3J0ICogYXMgbmV0IGZyb20gXCJuZXRcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgdW5pcXVlaWQgfSBmcm9tIFwidW5pY29pZFwiO1xuXG5pbnRlcmZhY2UgSVRyYWNrbG9hZCB7XG4gICAgdGl0bGU/OiBzdHJpbmc7XG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgdXJpOiBzdHJpbmc7XG5cbn1cblxuXG5pbnRlcmZhY2UgSVRyYWNrIGV4dGVuZHMgSVRyYWNrbG9hZCB7XG4gICAgbGFiZWw6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEltcHZjb25mIHtcbiAgICBzb2NrZXRmaWxlPzogc3RyaW5nO1xuICAgIHNvY2tldGNvbmY/OiBzdHJpbmc7XG59XG5cblxuXG5leHBvcnQgY2xhc3MgbXB2ZGFlbW9uIHtcblxuICAgIHBsYXlsaXN0OiBJVHJhY2tbXSA9IFtdO1xuICAgIHRyYWNrOiBudW1iZXIgPSAwXG4gICAgdXJpOiBzdHJpbmcgPSBcIlwiXG4gICAgZGFlbW9uaXplZDogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHBsYXlpbmc6IGJvb2xlYW4gPSBmYWxzZVxuICAgIG1wdl9wcm9jZXNzOiBhbnkgPSBmYWxzZVxuICAgIHNvY2tldDogYW55O1xuICAgIHNvY2tldGZpbGU6IHN0cmluZyA9IFwiL3RtcC9tcHZzb2NrZXRcIlxuICAgIHNvY2tldGNvbmY6IHN0cmluZyA9IFwiLS1pbnB1dC11bml4LXNvY2tldFwiXG4gICAgY29uc3RydWN0b3IoY29uZj86IEltcHZjb25mKSB7XG4gICAgICAgIGlmIChjb25mKSB7XG4gICAgICAgICAgICBpZiAoY29uZi5zb2NrZXRmaWxlKSB0aGlzLnNvY2tldGZpbGUgPSBjb25mLnNvY2tldGZpbGVcbiAgICAgICAgICAgIGlmIChjb25mLnNvY2tldGNvbmYpIHRoaXMuc29ja2V0Y29uZiA9IGNvbmYuc29ja2V0Y29uZlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhcnQocGxheV9wYXRoPzogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGF0LmRhZW1vbml6ZWQpIHtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYXduKFwibXB2XCIsIFtcIi0taWRsZVwiLCB0aGF0LnNvY2tldGNvbmYgKyBcIj1cIiArIHRoYXQuc29ja2V0ZmlsZV0sIHsgZGV0YWNoZWQ6IHRydWUgfSlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3MgPSBuZXQuY3JlYXRlQ29ubmVjdGlvbih0aGF0LnNvY2tldGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy5vbihcImNvbm5lY3RcIiwgZnVuY3Rpb24gKCkgeyAvLyBhZGQgdGltZW91dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhhdC5kYWVtb25pemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZGFlbW9uaXplZCA9IHRydWVcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxheV9wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXkocGxheV9wYXRoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMDApXG5cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5X3BhdGgpIHtcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXkocGxheV9wYXRoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcblxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwicGxheWVyIGlzIHJ1bm5pbmdcIiB9KVxuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgc3dpdGNoKHRhcmdldDogbnVtYmVyKSB7IC8vIHJlbGF0aXZlIFxuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAodGFyZ2V0ID4gMCkge1xuICAgICAgICAgICAgICAgIHRoYXQubmV4dCh0YXJnZXQpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJub3RoaW5nIHRvIGRvXCIgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC5wcmV2KHRhcmdldCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBuZXh0KHRhcmdldD86IG51bWJlcikge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQgfHwgdGFyZ2V0ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1uZXh0XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC50cmFjayA8IHRoYXQucGxheWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LnBsYXlsaXN0LCAocCwgaSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09ICh0aGF0LnRyYWNrICsgMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwLnVyaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrICs9IDFcbiAgICAgICAgICAgICAgICAgICAgfSByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoYXQudG8odGhhdC50cmFjayArIHRhcmdldCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHByZXYodGFyZ2V0PzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXByZXZcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LnRyYWNrID4gMSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LnBsYXlsaXN0LCAocCwgaSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09ICh0aGF0LnRyYWNrIC0gMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwLnVyaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrICs9IC0xXG5cblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC50byh0aGF0LnRyYWNrICsgTWF0aC5hYnModGFyZ2V0KSkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgdG8odGFyZ2V0OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgcmVqZWN0KFwidG9kb1wiKVxuXG5cbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIHN0b3AoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wic3RvcFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGFyc2UgZmlsZSB0byBsb2FkIHRoZSBsaXN0IG9uIGNsYXNzXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdCA9IFtdXG4gICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZyA9IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIHRoYXQudXJpID0gXCJcIlxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgZW5kKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLmtpbGwoKVxuICAgICAgICAgICAgICAgIHRoYXQuZGFlbW9uaXplZCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDBcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSBmYWxzZVxuICAgICAgICAgICAgICAgIHRoYXQudXJpID0gXCJcIlxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGxvYWRMaXN0ZnJvbUZpbGUocGxheWxpc3RfcGF0aDogc3RyaW5nLCBwbGF5bm93PzogdHJ1ZSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5bGlzdF9wYXRoICYmIHBsYXlsaXN0X3BhdGguc3BsaXQoJy5wbHMnKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcGF0aEV4aXN0cyhwbGF5bGlzdF9wYXRoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5kYWVtb25pemVkKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnJlYWRGaWxlKHBsYXlsaXN0X3BhdGgsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnJsb2FkXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMucmVhZEZpbGUocGxheWxpc3RfcGF0aCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGF0b2FycmF5ID0gZGF0YS50b1N0cmluZygpLnNwbGl0KFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrcyA9IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKGRhdGF0b2FycmF5LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3BsaXQoJz0nKS5sZW5ndGggPiAxICYmIGRhdGEuc3BsaXQoJ051bWJlck9mRW50cmllcz0nKS5sZW5ndGggPCAyICYmIGRhdGEuc3BsaXQoJ1ZlcnNpb249JykubGVuZ3RoIDwgMikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludChkYXRhLnNwbGl0KCc9JylbMF1bZGF0YS5zcGxpdCgnPScpWzBdLmxlbmd0aCAtIDFdKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNrcy5sZW5ndGggPCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFja3MucHVzaCh7fSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3BsaXQoJ0ZpbGUnKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrc1tpbmRleCAtIDFdLnVyaSA9IGRhdGEuc3BsaXQoZGF0YS5zcGxpdCgnPScpWzBdICsgXCI9XCIpWzFdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnNwbGl0KCdUaXRsZScpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2tzW2luZGV4IC0gMV0udGl0bGUgPSBkYXRhLnNwbGl0KGRhdGEuc3BsaXQoJz0nKVswXSArIFwiPVwiKVsxXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAodHJhY2tzLCBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrLmxhYmVsID0gdW5pcXVlaWQoNClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh0cmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5bm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcImxvYWRsaXN0XCIsIHBsYXlsaXN0X3BhdGgsIFwicmVwbGFjZVwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwYXJzZSBmaWxlIHRvIGxvYWQgdGhlIGxpc3Qgb24gY2xhc3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXkoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wibG9hZGxpc3RcIiwgcGxheWxpc3RfcGF0aCwgXCJyZXBsYWNlXCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhcnNlIGZpbGUgdG8gbG9hZCB0aGUgbGlzdCBvbiBjbGFzc1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJtcHYgbm90IHN0YXJ0ZWRcIiB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyb1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJ3cm9uZyBwYXRoXCIgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyb1wiKVxuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImZpbGUgbXVzdCBiZSBhIC5wbHMgZmlsZVwiIH0pXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBhZGRUcmFjayh0cmFjaywgaW5kZXg/OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIGNvbnN0IGZpbGVwYXRoID0gXCIvdG1wL21wdmZpbGVsaXN0X1wiICsgbmV3IERhdGUoKS5nZXRUaW1lKCkgKyBcIi5wbHNcIlxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhmaWxlcGF0aClcblxuICAgICAgICAgICAgbGV0IGZpbGVsaXN0ID0gXCJbcGxheWxpc3RdXFxuXFxuRmlsZTE9XCIgKyB0cmFjay51cmkgKyBcIlxcblwiXG5cbiAgICAgICAgICAgIGlmICh0cmFjay50aXRsZSkgZmlsZWxpc3QgKz0gXCJUaXRsZTE9XCIgKyB0cmFjay50aXRsZSArIFwiXFxuXCJcblxuXG5cblxuXG4gICAgICAgICAgICBmaWxlbGlzdCArPSBcIlxcbk51bWJlck9mRW50cmllcz0xXFxuVmVyc2lvbj0yXFxuXCJcblxuXG4gICAgICAgICAgICBmcy53cml0ZUZpbGUoZmlsZXBhdGgsIGZpbGVsaXN0LCB7fSwgKGVycikgPT4ge1xuXG4gICAgICAgICAgICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQucGxheWxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJsb2FkbGlzdFwiLCBmaWxlcGF0aCwgXCJhcHBlbmRcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0cmFjay5sYWJlbCkgdHJhY2subGFiZWwgPSB1bmlxdWVpZCg0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh0cmFjaylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJsb2FkbGlzdFwiLCBmaWxlcGF0aF0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0cmFjay5sYWJlbCkgdHJhY2subGFiZWwgPSB1bmlxdWVpZCg0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh0cmFjaylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJ3cm9uZyBwYXRoXCIgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBjbGVhckxpc3QoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoYXQucGxheWxpc3QubGVuZ3RoID4gMCkge1xuXG4gICAgICAgICAgICAgICAgbGV0IHByZXNlcnZlOiBJVHJhY2tcbiAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LWNsZWFyXCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LnBsYXlsaXN0LCAodCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHQudXJpID09PSB0aGF0LnVyaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXNlcnZlID0gdFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBpZiAocHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QgPSBbcHJlc2VydmVdXG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QgPSBbXVxuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIH1cbiAgICBsb2FkTGlzdCh0cmFja3M6IElUcmFja2xvYWRbXSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGF0LnBsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGF0LmNsZWFyTGlzdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKHRyYWNrcywgKHRyYWNrLCBjYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5hZGRUcmFjayh0cmFjaykudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYihlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9LCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXJlbW92ZVwiLCBcImN1cnJlbnRcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIGFzeW5jLmVhY2hTZXJpZXModHJhY2tzLCAodHJhY2ssIGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkVHJhY2sodHJhY2spLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1yZW1vdmVcIiwgXCJjdXJyZW50XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZz10cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrPTFcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudXJpPXRoYXQucGxheWxpc3RbMF0udXJpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIH0pO1xuXG5cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuXG4gICAgfVxuXG4gICAgcGxheShwbGF5X3BhdGg/OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5X3BhdGgpIHsgLy8gbm90IHdvcmtpbmchIVxuICAgICAgICAgICAgICAgIGlmICh0aGF0LnBsYXlsaXN0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckxpc3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHBsYXlfcGF0aClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkVHJhY2soeyB1cmk6IHBsYXlfcGF0aCB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXJlbW92ZVwiLCBcImN1cnJlbnRcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QgPSBbXVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh7IHVyaTogcGxheV9wYXRoLCBsYWJlbDogdW5pcXVlaWQoNikgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5aW5nID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnVyaSA9IHBsYXlfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmFkZFRyYWNrKHsgdXJpOiBwbGF5X3BhdGggfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1yZW1vdmVcIiwgXCJjdXJyZW50XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0LnB1c2goeyB1cmk6IHBsYXlfcGF0aCwgbGFiZWw6IHVuaXF1ZWlkKDYpIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwbGF5X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoYXQucGxheWxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkVHJhY2soeyB1cmk6IHBsYXlfcGF0aCB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wicGxheWxpc3QtcmVtb3ZlXCIsIFwiY3VycmVudFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh7IHVyaTogcGxheV9wYXRoLCBsYWJlbDogdW5pcXVlaWQoNikgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwbGF5X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJsb2FkZmlsZVwiLCBwbGF5X3BhdGhdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdC5wdXNoKHsgdXJpOiBwbGF5X3BhdGgsIGxhYmVsOiB1bmlxdWVpZCg2KSB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnVyaSA9IHBsYXlfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGF0LnBsYXlsaXN0Lmxlbmd0aCA+IDAgJiYgIXRoYXQucGxheWluZykge1xuXG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhhdC50cmFjaykgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0LnVyaSkgdGhhdC51cmkgPSB0aGF0LnBsYXlsaXN0WzBdLnVyaVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJub3RoaW5nIHRvIHBsYXlcIilcblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcGF1c2UoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wicGxheVwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSBmYWxzZVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcGxheVRyYWNrKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG5cblxuICAgICAgICB9KVxuICAgIH1cblxuICAgIG5leHRUcmFjaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcHJldmlvdXNUcmFjaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXG5cbiAgICAgICAgfSlcbiAgICB9XG5cblxuXG59XG5cbiJdfQ==
