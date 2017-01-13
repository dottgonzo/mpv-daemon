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
            if (conf.verbose)
                this.verbose = conf.verbose;
        }
    }
    mpvdaemon.prototype.start = function (play_path) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (!that.daemonized) {
                try {
                    var mpv = child_process_1.spawn("mpv", ["--idle", that.socketconf + "=" + that.socketfile], { detached: true });
                    if (that.verbose) {
                        mpv.stdin.on("data", function (data) {
                            console.log("stdin: " + data);
                        });
                        mpv.stdout.on("data", function (data) {
                            console.log("stdout: " + data);
                        });
                        mpv.on("error", function (data) {
                            console.log("error: " + data);
                        });
                    }
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
                        if (that.verbose) {
                            that.mpv_process.on("data", function (data) {
                                console.log("mpvdata: " + data);
                            });
                        }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUU3QixDQUFDO1FBR0wsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBQ0QseUJBQUssR0FBTDtRQUNJLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUVsQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUVyQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRTtnQkFDckUsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7Z0JBRXBCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNqQixDQUFDLENBQUMsQ0FBQztRQUVQLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUNELDZCQUFTLEdBQVQ7UUFDSSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sVUFBQyxPQUFPLEVBQUUsTUFBTTtRQUl6QyxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCw2QkFBUyxHQUFUO1FBQ0ksTUFBTSxDQUFDLElBQUksT0FBTyxDQUFPLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFJekMsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBQ0QsaUNBQWEsR0FBYjtRQUNJLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBTyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBSXpDLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUlMLGdCQUFDO0FBQUQsQ0ExbEJBLEFBMGxCQyxJQUFBO0FBMWxCWSw4QkFBUyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNwYXduIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIlxuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuY29uc3QgcGF0aEV4aXN0cyA9IHJlcXVpcmUoXCJwYXRoLWV4aXN0c1wiKTtcbmltcG9ydCAqIGFzIGFzeW5jIGZyb20gXCJhc3luY1wiO1xuaW1wb3J0ICogYXMgbmV0IGZyb20gXCJuZXRcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgdW5pcXVlaWQgfSBmcm9tIFwidW5pY29pZFwiO1xuXG5pbnRlcmZhY2UgSVRyYWNrbG9hZCB7XG4gICAgdGl0bGU/OiBzdHJpbmc7XG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgdXJpOiBzdHJpbmc7XG5cbn1cblxuXG5pbnRlcmZhY2UgSVRyYWNrIGV4dGVuZHMgSVRyYWNrbG9hZCB7XG4gICAgbGFiZWw6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEltcHZjb25mIHtcbiAgICBzb2NrZXRmaWxlPzogc3RyaW5nO1xuICAgIHNvY2tldGNvbmY/OiBzdHJpbmc7XG4gICAgdmVyYm9zZTogYm9vbGVhbjtcbn1cblxuXG5cbmV4cG9ydCBjbGFzcyBtcHZkYWVtb24ge1xuXG4gICAgcGxheWxpc3Q6IElUcmFja1tdID0gW107XG4gICAgdHJhY2s6IG51bWJlciA9IDBcbiAgICB1cmk6IHN0cmluZyA9IFwiXCJcbiAgICBkYWVtb25pemVkOiBib29sZWFuID0gZmFsc2U7XG4gICAgcGxheWluZzogYm9vbGVhbiA9IGZhbHNlXG4gICAgbXB2X3Byb2Nlc3M6IGFueSA9IGZhbHNlXG4gICAgc29ja2V0OiBhbnk7XG4gICAgc29ja2V0ZmlsZTogc3RyaW5nID0gXCIvdG1wL21wdnNvY2tldFwiXG4gICAgc29ja2V0Y29uZjogc3RyaW5nID0gXCItLWlucHV0LXVuaXgtc29ja2V0XCJcbiAgICB2ZXJib3NlOiBib29sZWFuO1xuICAgIGNvbnN0cnVjdG9yKGNvbmY/OiBJbXB2Y29uZikge1xuICAgICAgICBpZiAoY29uZikge1xuICAgICAgICAgICAgaWYgKGNvbmYuc29ja2V0ZmlsZSkgdGhpcy5zb2NrZXRmaWxlID0gY29uZi5zb2NrZXRmaWxlXG4gICAgICAgICAgICBpZiAoY29uZi5zb2NrZXRjb25mKSB0aGlzLnNvY2tldGNvbmYgPSBjb25mLnNvY2tldGNvbmZcbiAgICAgICAgICAgIGlmIChjb25mLnZlcmJvc2UpIHRoaXMudmVyYm9zZSA9IGNvbmYudmVyYm9zZVxuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGFydChwbGF5X3BhdGg/OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoYXQuZGFlbW9uaXplZCkge1xuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbXB2ID0gc3Bhd24oXCJtcHZcIiwgW1wiLS1pZGxlXCIsIHRoYXQuc29ja2V0Y29uZiArIFwiPVwiICsgdGhhdC5zb2NrZXRmaWxlXSwgeyBkZXRhY2hlZDogdHJ1ZSB9KVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcHYuc3RkaW4ub24oXCJkYXRhXCIsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzdGRpbjogXCIrZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICBtcHYuc3Rkb3V0Lm9uKFwiZGF0YVwiLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic3Rkb3V0OiBcIitkYXRhKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgICAgICAgICAgICAgICAgICBtcHYub24oXCJlcnJvclwiLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyb3I6IFwiK2RhdGEpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzID0gbmV0LmNyZWF0ZUNvbm5lY3Rpb24odGhhdC5zb2NrZXRmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mub24oXCJjb25uZWN0XCIsIGZ1bmN0aW9uICgpIHsgLy8gYWRkIHRpbWVvdXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoYXQuZGFlbW9uaXplZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhZW1vbml6ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsYXlfcGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5KHBsYXlfcGF0aCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mub24oXCJkYXRhXCIsIGZ1bmN0aW9uIChkYXRhKSB7IC8vIGFkZCB0aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibXB2ZGF0YTogXCIrZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMDApXG5cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5X3BhdGgpIHtcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXkocGxheV9wYXRoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcblxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwicGxheWVyIGlzIHJ1bm5pbmdcIiB9KVxuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgc3dpdGNoKHRhcmdldDogbnVtYmVyKSB7IC8vIHJlbGF0aXZlIFxuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAodGFyZ2V0ID4gMCkge1xuICAgICAgICAgICAgICAgIHRoYXQubmV4dCh0YXJnZXQpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJub3RoaW5nIHRvIGRvXCIgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC5wcmV2KHRhcmdldCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBuZXh0KHRhcmdldD86IG51bWJlcikge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQgfHwgdGFyZ2V0ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1uZXh0XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC50cmFjayA8IHRoYXQucGxheWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LnBsYXlsaXN0LCAocCwgaSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09ICh0aGF0LnRyYWNrICsgMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwLnVyaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrICs9IDFcbiAgICAgICAgICAgICAgICAgICAgfSByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoYXQudG8odGhhdC50cmFjayArIHRhcmdldCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHByZXYodGFyZ2V0PzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXByZXZcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LnRyYWNrID4gMSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LnBsYXlsaXN0LCAocCwgaSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09ICh0aGF0LnRyYWNrIC0gMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwLnVyaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrICs9IC0xXG5cblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC50byh0aGF0LnRyYWNrICsgTWF0aC5hYnModGFyZ2V0KSkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgdG8odGFyZ2V0OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgcmVqZWN0KFwidG9kb1wiKVxuXG5cbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIHN0b3AoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wic3RvcFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGFyc2UgZmlsZSB0byBsb2FkIHRoZSBsaXN0IG9uIGNsYXNzXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdCA9IFtdXG4gICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZyA9IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIHRoYXQudXJpID0gXCJcIlxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgZW5kKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLmtpbGwoKVxuICAgICAgICAgICAgICAgIHRoYXQuZGFlbW9uaXplZCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDBcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSBmYWxzZVxuICAgICAgICAgICAgICAgIHRoYXQudXJpID0gXCJcIlxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGxvYWRMaXN0ZnJvbUZpbGUocGxheWxpc3RfcGF0aDogc3RyaW5nLCBwbGF5bm93PzogdHJ1ZSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5bGlzdF9wYXRoICYmIHBsYXlsaXN0X3BhdGguc3BsaXQoJy5wbHMnKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcGF0aEV4aXN0cyhwbGF5bGlzdF9wYXRoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5kYWVtb25pemVkKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnJlYWRGaWxlKHBsYXlsaXN0X3BhdGgsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnJsb2FkXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMucmVhZEZpbGUocGxheWxpc3RfcGF0aCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGF0b2FycmF5ID0gZGF0YS50b1N0cmluZygpLnNwbGl0KFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrcyA9IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKGRhdGF0b2FycmF5LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3BsaXQoJz0nKS5sZW5ndGggPiAxICYmIGRhdGEuc3BsaXQoJ051bWJlck9mRW50cmllcz0nKS5sZW5ndGggPCAyICYmIGRhdGEuc3BsaXQoJ1ZlcnNpb249JykubGVuZ3RoIDwgMikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludChkYXRhLnNwbGl0KCc9JylbMF1bZGF0YS5zcGxpdCgnPScpWzBdLmxlbmd0aCAtIDFdKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNrcy5sZW5ndGggPCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFja3MucHVzaCh7fSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3BsaXQoJ0ZpbGUnKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrc1tpbmRleCAtIDFdLnVyaSA9IGRhdGEuc3BsaXQoZGF0YS5zcGxpdCgnPScpWzBdICsgXCI9XCIpWzFdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnNwbGl0KCdUaXRsZScpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2tzW2luZGV4IC0gMV0udGl0bGUgPSBkYXRhLnNwbGl0KGRhdGEuc3BsaXQoJz0nKVswXSArIFwiPVwiKVsxXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAodHJhY2tzLCBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrLmxhYmVsID0gdW5pcXVlaWQoNClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh0cmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5bm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcImxvYWRsaXN0XCIsIHBsYXlsaXN0X3BhdGgsIFwicmVwbGFjZVwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwYXJzZSBmaWxlIHRvIGxvYWQgdGhlIGxpc3Qgb24gY2xhc3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXkoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wibG9hZGxpc3RcIiwgcGxheWxpc3RfcGF0aCwgXCJyZXBsYWNlXCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhcnNlIGZpbGUgdG8gbG9hZCB0aGUgbGlzdCBvbiBjbGFzc1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJtcHYgbm90IHN0YXJ0ZWRcIiB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyb1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJ3cm9uZyBwYXRoXCIgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyb1wiKVxuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImZpbGUgbXVzdCBiZSBhIC5wbHMgZmlsZVwiIH0pXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBhZGRUcmFjayh0cmFjazogSVRyYWNrbG9hZCwgaW5kZXg/OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIGNvbnN0IGZpbGVwYXRoID0gXCIvdG1wL21wdmZpbGVsaXN0X1wiICsgbmV3IERhdGUoKS5nZXRUaW1lKCkgKyBcIi5wbHNcIlxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhmaWxlcGF0aClcblxuICAgICAgICAgICAgbGV0IGZpbGVsaXN0ID0gXCJbcGxheWxpc3RdXFxuXFxuRmlsZTE9XCIgKyB0cmFjay51cmkgKyBcIlxcblwiXG5cbiAgICAgICAgICAgIGlmICh0cmFjay50aXRsZSkgZmlsZWxpc3QgKz0gXCJUaXRsZTE9XCIgKyB0cmFjay50aXRsZSArIFwiXFxuXCJcblxuXG5cblxuXG4gICAgICAgICAgICBmaWxlbGlzdCArPSBcIlxcbk51bWJlck9mRW50cmllcz0xXFxuVmVyc2lvbj0yXFxuXCJcblxuXG4gICAgICAgICAgICBmcy53cml0ZUZpbGUoZmlsZXBhdGgsIGZpbGVsaXN0LCB7fSwgKGVycikgPT4ge1xuXG4gICAgICAgICAgICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQucGxheWxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJsb2FkbGlzdFwiLCBmaWxlcGF0aCwgXCJhcHBlbmRcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0cmFjay5sYWJlbCkgdHJhY2subGFiZWwgPSB1bmlxdWVpZCg0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCg8SVRyYWNrPnRyYWNrKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcImxvYWRsaXN0XCIsIGZpbGVwYXRoXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRyYWNrLmxhYmVsKSB0cmFjay5sYWJlbCA9IHVuaXF1ZWlkKDQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdC5wdXNoKDxJVHJhY2s+dHJhY2spXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwid3JvbmcgcGF0aFwiIH0pXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgY2xlYXJMaXN0KCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGF0LnBsYXlsaXN0Lmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgICAgIGxldCBwcmVzZXJ2ZTogSVRyYWNrXG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1jbGVhclwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAodGhhdC5wbGF5bGlzdCwgKHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0LnVyaSA9PT0gdGhhdC51cmkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzZXJ2ZSA9IHRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW3ByZXNlcnZlXVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG4gICAgbG9hZExpc3QodHJhY2tzOiBJVHJhY2tsb2FkW10pIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhhdC5wbGF5aW5nKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5jbGVhckxpc3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyh0cmFja3MsICh0cmFjaywgY2IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkVHJhY2sodHJhY2spLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wicGxheWxpc3QtcmVtb3ZlXCIsIFwiY3VycmVudFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIGFzeW5jLmVhY2hTZXJpZXModHJhY2tzLCAodHJhY2ssIGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkVHJhY2sodHJhY2spLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1yZW1vdmVcIiwgXCJjdXJyZW50XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSB0aGF0LnBsYXlsaXN0WzBdLnVyaVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB9KTtcblxuXG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuXG5cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cblxuICAgIH1cblxuICAgIHBsYXkocGxheV9wYXRoPzogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAocGxheV9wYXRoKSB7IC8vIG5vdCB3b3JraW5nISFcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5wbGF5bGlzdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xlYXJMaXN0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwbGF5X3BhdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmFkZFRyYWNrKHsgdXJpOiBwbGF5X3BhdGggfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1yZW1vdmVcIiwgXCJjdXJyZW50XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0LnB1c2goeyB1cmk6IHBsYXlfcGF0aCwgbGFiZWw6IHVuaXF1ZWlkKDYpIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwbGF5X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5hZGRUcmFjayh7IHVyaTogcGxheV9wYXRoIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wicGxheWxpc3QtcmVtb3ZlXCIsIFwiY3VycmVudFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdCA9IFtdXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdC5wdXNoKHsgdXJpOiBwbGF5X3BhdGgsIGxhYmVsOiB1bmlxdWVpZCg2KSB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudXJpID0gcGxheV9wYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudHJhY2sgPSAxXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGF0LnBsYXlsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmFkZFRyYWNrKHsgdXJpOiBwbGF5X3BhdGggfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXJlbW92ZVwiLCBcImN1cnJlbnRcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdCA9IFtdXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0LnB1c2goeyB1cmk6IHBsYXlfcGF0aCwgbGFiZWw6IHVuaXF1ZWlkKDYpIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5aW5nID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudXJpID0gcGxheV9wYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wibG9hZGZpbGVcIiwgcGxheV9wYXRoXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh7IHVyaTogcGxheV9wYXRoLCBsYWJlbDogdW5pcXVlaWQoNikgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5aW5nID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwbGF5X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudHJhY2sgPSAxXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhhdC5wbGF5bGlzdC5sZW5ndGggPiAwICYmICF0aGF0LnBsYXlpbmcpIHtcblxuICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wicGxheVwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5aW5nID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoYXQudHJhY2spIHRoYXQudHJhY2sgPSAxXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhhdC51cmkpIHRoYXQudXJpID0gdGhhdC5wbGF5bGlzdFswXS51cmlcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwibm90aGluZyB0byBwbGF5XCIpXG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHBhdXNlKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhhdC5wbGF5aW5nID0gZmFsc2VcblxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHBsYXlUcmFjaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBuZXh0VHJhY2soKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHByZXZpb3VzVHJhY2soKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cblxuXG4gICAgICAgIH0pXG4gICAgfVxuXG5cblxufVxuXG4iXX0=
