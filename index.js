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
        this.noaudio = false;
        if (conf) {
            if (conf.socketfile)
                this.socketfile = conf.socketfile;
            if (conf.socketconf)
                this.socketconf = conf.socketconf;
            if (conf.verbose)
                this.verbose = conf.verbose;
            if (conf.verbose)
                this.verbose = conf.verbose;
            if (conf.noaudio)
                this.noaudio = conf.noaudio;
        }
    }
    mpvdaemon.prototype.start = function (options) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (!that.daemonized) {
                try {
                    var mpv = void 0;
                    if (that.noaudio) {
                        mpv = child_process_1.spawn("mpv", ["--idle", "--really-quiet", "--loop=force", "--rtsp-transport=tcp", "--keep-open=always", "--cache=yes", "--cache-pause", "--no-audio", that.socketconf + "=" + that.socketfile], { detached: true, stdio: "ignore" });
                    }
                    else if (options) {
                        options.push(that.socketconf + "=" + that.socketfile);
                        mpv = child_process_1.spawn("mpv", options, { detached: true, stdio: "ignore" });
                    }
                    else {
                        mpv = child_process_1.spawn("mpv", ["--idle", "--really-quiet", "--loop=force", that.socketconf + "=" + that.socketfile], { detached: true, stdio: "ignore" });
                    }
                    if (that.verbose) {
                        mpv.on("error", function (data) {
                            console.log("error: " + data);
                        });
                    }
                    setTimeout(function () {
                        that.mpv_process = net.createConnection(that.socketfile);
                        that.mpv_process.on("connect", function () {
                            if (!that.daemonized) {
                                that.daemonized = true;
                                resolve(true);
                            }
                        });
                        if (that.verbose) {
                            that.mpv_process.on("data", function (data) {
                                console.log("mpvdata: " + data);
                            });
                            that.mpv_process.on("error", function (data) {
                                console.log("mpverror: " + data);
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
            var filepath = "/tmp/mpvfilelist_" + unicoid_1.uniqueid(6) + "_" + new Date().getTime() + ".pls";
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
                            if (that.verbose) {
                                console.log("start first track of a playlist");
                            }
                            resolve(true);
                        });
                    }
                    else {
                        that.mpv_process.write(JSON.stringify({ "command": ["loadlist", filepath] }) + "\r\n", function () {
                            if (!track.label)
                                track.label = unicoid_1.uniqueid(4);
                            that.playlist.push(track);
                            if (that.verbose) {
                                console.log("append track");
                            }
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
                    if (that.verbose) {
                        console.log("clear playlist");
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
                        if (that.verbose) {
                            console.log("playlist loaded");
                        }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFDRCx5QkFBSyxHQUFMO1FBQ0ksSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBTyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBRXJDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFO2dCQUNyRSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtnQkFFcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBRVAsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBQ0QsNkJBQVMsR0FBVDtRQUNJLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBTyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBSXpDLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELDZCQUFTLEdBQVQ7UUFDSSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sVUFBQyxPQUFPLEVBQUUsTUFBTTtRQUl6QyxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFDRCxpQ0FBYSxHQUFiO1FBQ0ksTUFBTSxDQUFDLElBQUksT0FBTyxDQUFPLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFJekMsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBSUwsZ0JBQUM7QUFBRCxDQTlrQkEsQUE4a0JDLElBQUE7QUE5a0JZLDhCQUFTIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc3Bhd24gfSBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiXG5pbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5jb25zdCBwYXRoRXhpc3RzID0gcmVxdWlyZShcInBhdGgtZXhpc3RzXCIpO1xuaW1wb3J0ICogYXMgYXN5bmMgZnJvbSBcImFzeW5jXCI7XG5pbXBvcnQgKiBhcyBuZXQgZnJvbSBcIm5ldFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeyB1bmlxdWVpZCB9IGZyb20gXCJ1bmljb2lkXCI7XG5cbmludGVyZmFjZSBJVHJhY2tsb2FkIHtcbiAgICB0aXRsZT86IHN0cmluZ1xuICAgIGxhYmVsPzogc3RyaW5nXG4gICAgdXJpOiBzdHJpbmdcblxufVxuXG5cbmludGVyZmFjZSBJVHJhY2sgZXh0ZW5kcyBJVHJhY2tsb2FkIHtcbiAgICBsYWJlbDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgSW1wdmNvbmYge1xuICAgIHNvY2tldGZpbGU/OiBzdHJpbmdcbiAgICBzb2NrZXRjb25mPzogc3RyaW5nXG4gICAgdmVyYm9zZT86IGJvb2xlYW5cbiAgICBub2F1ZGlvPzogYm9vbGVhblxufVxuXG5cblxuZXhwb3J0IGNsYXNzIG1wdmRhZW1vbiB7XG5cbiAgICBwbGF5bGlzdDogSVRyYWNrW10gPSBbXTtcbiAgICB0cmFjazogbnVtYmVyID0gMFxuICAgIHVyaTogc3RyaW5nID0gXCJcIlxuICAgIGRhZW1vbml6ZWQ6IGJvb2xlYW4gPSBmYWxzZVxuICAgIHBsYXlpbmc6IGJvb2xlYW4gPSBmYWxzZVxuICAgIG1wdl9wcm9jZXNzOiBhbnkgPSBmYWxzZVxuICAgIHNvY2tldDogYW55XG4gICAgc29ja2V0ZmlsZTogc3RyaW5nID0gXCIvdG1wL21wdnNvY2tldFwiXG4gICAgc29ja2V0Y29uZjogc3RyaW5nID0gXCItLWlucHV0LXVuaXgtc29ja2V0XCJcbiAgICB2ZXJib3NlOiBib29sZWFuXG4gICAgbm9hdWRpbzogYm9vbGVhbiA9IGZhbHNlXG4gICAgY29uc3RydWN0b3IoY29uZj86IEltcHZjb25mKSB7XG4gICAgICAgIGlmIChjb25mKSB7XG4gICAgICAgICAgICBpZiAoY29uZi5zb2NrZXRmaWxlKSB0aGlzLnNvY2tldGZpbGUgPSBjb25mLnNvY2tldGZpbGVcbiAgICAgICAgICAgIGlmIChjb25mLnNvY2tldGNvbmYpIHRoaXMuc29ja2V0Y29uZiA9IGNvbmYuc29ja2V0Y29uZlxuICAgICAgICAgICAgaWYgKGNvbmYudmVyYm9zZSkgdGhpcy52ZXJib3NlID0gY29uZi52ZXJib3NlXG4gICAgICAgICAgICBpZiAoY29uZi52ZXJib3NlKSB0aGlzLnZlcmJvc2UgPSBjb25mLnZlcmJvc2VcbiAgICAgICAgICAgIGlmIChjb25mLm5vYXVkaW8pIHRoaXMubm9hdWRpbyA9IGNvbmYubm9hdWRpb1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhcnQob3B0aW9ucz86IHN0cmluZ1tdKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGF0LmRhZW1vbml6ZWQpIHtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtcHZcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubm9hdWRpbykgeyAvLyB0b2RvIGRlbXV4ZXItcmVhZGFoZWFkLXBhY2tldHM9MzAwIHNlcGFyYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBtcHYgPSBzcGF3bihcIm1wdlwiLCBbXCItLWlkbGVcIiwgXCItLXJlYWxseS1xdWlldFwiLCBcIi0tbG9vcD1mb3JjZVwiLCBcIi0tcnRzcC10cmFuc3BvcnQ9dGNwXCIsIFwiLS1rZWVwLW9wZW49YWx3YXlzXCIsXCItLWNhY2hlPXllc1wiLCBcIi0tY2FjaGUtcGF1c2VcIiwgXCItLW5vLWF1ZGlvXCIsIHRoYXQuc29ja2V0Y29uZiArIFwiPVwiICsgdGhhdC5zb2NrZXRmaWxlXSwgeyBkZXRhY2hlZDogdHJ1ZSwgc3RkaW86IFwiaWdub3JlXCIgfSlcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnB1c2godGhhdC5zb2NrZXRjb25mICsgXCI9XCIgKyB0aGF0LnNvY2tldGZpbGUpXG4gICAgICAgICAgICAgICAgICAgICAgICBtcHYgPSBzcGF3bihcIm1wdlwiLCBvcHRpb25zLCB7IGRldGFjaGVkOiB0cnVlLCBzdGRpbzogXCJpZ25vcmVcIiB9KVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcHYgPSBzcGF3bihcIm1wdlwiLCBbXCItLWlkbGVcIiwgXCItLXJlYWxseS1xdWlldFwiLCBcIi0tbG9vcD1mb3JjZVwiLCB0aGF0LnNvY2tldGNvbmYgKyBcIj1cIiArIHRoYXQuc29ja2V0ZmlsZV0sIHsgZGV0YWNoZWQ6IHRydWUsIHN0ZGlvOiBcImlnbm9yZVwiIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXB2Lm9uKFwiZXJyb3JcIiwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVycm9yOiBcIiArIGRhdGEpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzID0gbmV0LmNyZWF0ZUNvbm5lY3Rpb24odGhhdC5zb2NrZXRmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mub24oXCJjb25uZWN0XCIsIGZ1bmN0aW9uICgpIHsgLy8gYWRkIHRpbWVvdXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoYXQuZGFlbW9uaXplZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhZW1vbml6ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy5vbihcImRhdGFcIiwgZnVuY3Rpb24gKGRhdGEpIHsgLy8gYWRkIHRpbWVvdXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtcHZkYXRhOiBcIiArIGRhdGEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChkYXRhKSB7IC8vIGFkZCB0aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibXB2ZXJyb3I6IFwiICsgZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMDApXG5cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGF5X3BhdGgpIHtcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXkocGxheV9wYXRoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcblxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwicGxheWVyIGlzIHJ1bm5pbmdcIiB9KVxuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgc3dpdGNoKHRhcmdldDogbnVtYmVyKSB7IC8vIHJlbGF0aXZlIFxuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAodGFyZ2V0ID4gMCkge1xuICAgICAgICAgICAgICAgIHRoYXQubmV4dCh0YXJnZXQpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJub3RoaW5nIHRvIGRvXCIgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC5wcmV2KHRhcmdldCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBuZXh0KHRhcmdldD86IG51bWJlcikge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQgfHwgdGFyZ2V0ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1uZXh0XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC50cmFjayA8IHRoYXQucGxheWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LnBsYXlsaXN0LCAocCwgaSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09ICh0aGF0LnRyYWNrICsgMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwLnVyaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrICs9IDFcbiAgICAgICAgICAgICAgICAgICAgfSByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoYXQudG8odGhhdC50cmFjayArIHRhcmdldCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHByZXYodGFyZ2V0PzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXByZXZcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LnRyYWNrID4gMSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LnBsYXlsaXN0LCAocCwgaSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09ICh0aGF0LnRyYWNrIC0gMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwLnVyaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrICs9IC0xXG5cblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC50byh0aGF0LnRyYWNrICsgTWF0aC5hYnModGFyZ2V0KSkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgdG8odGFyZ2V0OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgcmVqZWN0KFwidG9kb1wiKVxuXG5cbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIHN0b3AoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wic3RvcFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGFyc2UgZmlsZSB0byBsb2FkIHRoZSBsaXN0IG9uIGNsYXNzXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdCA9IFtdXG4gICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZyA9IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIHRoYXQudXJpID0gXCJcIlxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgZW5kKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLmtpbGwoKVxuICAgICAgICAgICAgICAgIHRoYXQuZGFlbW9uaXplZCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDBcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSBmYWxzZVxuICAgICAgICAgICAgICAgIHRoYXQudXJpID0gXCJcIlxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGxvYWRMaXN0ZnJvbUZpbGUocGxheWxpc3RfcGF0aDogc3RyaW5nLCBwbGF5bm93PzogdHJ1ZSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5bGlzdF9wYXRoICYmIHBsYXlsaXN0X3BhdGguc3BsaXQoJy5wbHMnKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcGF0aEV4aXN0cyhwbGF5bGlzdF9wYXRoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5kYWVtb25pemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMucmVhZEZpbGUocGxheWxpc3RfcGF0aCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVycmxvYWRcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IGVyciB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMucmVhZEZpbGUocGxheWxpc3RfcGF0aCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBlcnJvcjogZXJyIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGF0b2FycmF5ID0gZGF0YS50b1N0cmluZygpLnNwbGl0KFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrcyA9IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKGRhdGF0b2FycmF5LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3BsaXQoJz0nKS5sZW5ndGggPiAxICYmIGRhdGEuc3BsaXQoJ051bWJlck9mRW50cmllcz0nKS5sZW5ndGggPCAyICYmIGRhdGEuc3BsaXQoJ1ZlcnNpb249JykubGVuZ3RoIDwgMikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludChkYXRhLnNwbGl0KCc9JylbMF1bZGF0YS5zcGxpdCgnPScpWzBdLmxlbmd0aCAtIDFdKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNrcy5sZW5ndGggPCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFja3MucHVzaCh7fSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3BsaXQoJ0ZpbGUnKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrc1tpbmRleCAtIDFdLnVyaSA9IGRhdGEuc3BsaXQoZGF0YS5zcGxpdCgnPScpWzBdICsgXCI9XCIpWzFdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnNwbGl0KCdUaXRsZScpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2tzW2luZGV4IC0gMV0udGl0bGUgPSBkYXRhLnNwbGl0KGRhdGEuc3BsaXQoJz0nKVswXSArIFwiPVwiKVsxXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAodHJhY2tzLCBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrLmxhYmVsID0gdW5pcXVlaWQoNClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh0cmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5bm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcImxvYWRsaXN0XCIsIHBsYXlsaXN0X3BhdGgsIFwicmVwbGFjZVwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwYXJzZSBmaWxlIHRvIGxvYWQgdGhlIGxpc3Qgb24gY2xhc3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXkoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wibG9hZGxpc3RcIiwgcGxheWxpc3RfcGF0aCwgXCJyZXBsYWNlXCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhcnNlIGZpbGUgdG8gbG9hZCB0aGUgbGlzdCBvbiBjbGFzc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwibXB2IG5vdCBzdGFydGVkXCIgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVycm9cIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwid3JvbmcgcGF0aFwiIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVycm9cIilcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJmaWxlIG11c3QgYmUgYSAucGxzIGZpbGVcIiB9KVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgYWRkVHJhY2sodHJhY2s6IElUcmFja2xvYWQsIGluZGV4PzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBjb25zdCBmaWxlcGF0aCA9IFwiL3RtcC9tcHZmaWxlbGlzdF9cIiArIHVuaXF1ZWlkKDYpICsgXCJfXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKSArIFwiLnBsc1wiXG5cblxuXG4gICAgICAgICAgICBsZXQgZmlsZWxpc3QgPSBcIltwbGF5bGlzdF1cXG5cXG5GaWxlMT1cIiArIHRyYWNrLnVyaSArIFwiXFxuXCJcblxuICAgICAgICAgICAgaWYgKHRyYWNrLnRpdGxlKSBmaWxlbGlzdCArPSBcIlRpdGxlMT1cIiArIHRyYWNrLnRpdGxlICsgXCJcXG5cIlxuXG5cbiAgICAgICAgICAgIGZpbGVsaXN0ICs9IFwiXFxuTnVtYmVyT2ZFbnRyaWVzPTFcXG5WZXJzaW9uPTJcXG5cIlxuXG5cbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShmaWxlcGF0aCwgZmlsZWxpc3QsIHt9LCAoZXJyKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWVycikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5wbGF5bGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcImxvYWRsaXN0XCIsIGZpbGVwYXRoLCBcImFwcGVuZFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRyYWNrLmxhYmVsKSB0cmFjay5sYWJlbCA9IHVuaXF1ZWlkKDQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdC5wdXNoKDxJVHJhY2s+dHJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInN0YXJ0IGZpcnN0IHRyYWNrIG9mIGEgcGxheWxpc3RcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcImxvYWRsaXN0XCIsIGZpbGVwYXRoXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRyYWNrLmxhYmVsKSB0cmFjay5sYWJlbCA9IHVuaXF1ZWlkKDQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdC5wdXNoKDxJVHJhY2s+dHJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFwcGVuZCB0cmFja1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwid3JvbmcgcGF0aFwiIH0pXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgY2xlYXJMaXN0KCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGF0LnBsYXlsaXN0Lmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgICAgIGxldCBwcmVzZXJ2ZTogSVRyYWNrXG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1jbGVhclwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAodGhhdC5wbGF5bGlzdCwgKHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0LnVyaSA9PT0gdGhhdC51cmkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzZXJ2ZSA9IHRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW3ByZXNlcnZlXVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdCA9IFtdXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNsZWFyIHBsYXlsaXN0XCIpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIH1cbiAgICBsb2FkTGlzdCh0cmFja3M6IElUcmFja2xvYWRbXSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGF0LnBsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGF0LmNsZWFyTGlzdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKHRyYWNrcywgKHRyYWNrLCBjYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5hZGRUcmFjayh0cmFjaykudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYihlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9LCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1yZW1vdmVcIiwgXCJjdXJyZW50XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyh0cmFja3MsICh0cmFjaywgY2IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5hZGRUcmFjayh0cmFjaykudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYihlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXJlbW92ZVwiLCBcImN1cnJlbnRcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJwbGF5bGlzdCBsb2FkZWRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudHJhY2sgPSAxXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnVyaSA9IHRoYXQucGxheWxpc3RbMF0udXJpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIH0pO1xuXG5cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuXG4gICAgfVxuXG4gICAgcGxheShwbGF5X3BhdGg/OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5X3BhdGgpIHsgLy8gbm90IHdvcmtpbmchIVxuICAgICAgICAgICAgICAgIGlmICh0aGF0LnBsYXlsaXN0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckxpc3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHBsYXlfcGF0aClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkVHJhY2soeyB1cmk6IHBsYXlfcGF0aCB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1wdl9wcm9jZXNzLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgXCJjb21tYW5kXCI6IFtcInBsYXlsaXN0LXJlbW92ZVwiLCBcImN1cnJlbnRcIl0gfSkgKyBcIlxcclxcblwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QgPSBbXVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh7IHVyaTogcGxheV9wYXRoLCBsYWJlbDogdW5pcXVlaWQoNikgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5aW5nID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnVyaSA9IHBsYXlfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmFkZFRyYWNrKHsgdXJpOiBwbGF5X3BhdGggfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5bGlzdC1yZW1vdmVcIiwgXCJjdXJyZW50XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0LnB1c2goeyB1cmk6IHBsYXlfcGF0aCwgbGFiZWw6IHVuaXF1ZWlkKDYpIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWluZyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwbGF5X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoYXQucGxheWxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkVHJhY2soeyB1cmk6IHBsYXlfcGF0aCB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wicGxheWxpc3QtcmVtb3ZlXCIsIFwiY3VycmVudFwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlsaXN0ID0gW11cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucGxheWxpc3QucHVzaCh7IHVyaTogcGxheV9wYXRoLCBsYWJlbDogdW5pcXVlaWQoNikgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cmkgPSBwbGF5X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyYWNrID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJsb2FkZmlsZVwiLCBwbGF5X3BhdGhdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGF5bGlzdC5wdXNoKHsgdXJpOiBwbGF5X3BhdGgsIGxhYmVsOiB1bmlxdWVpZCg2KSB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnVyaSA9IHBsYXlfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGF0LnBsYXlsaXN0Lmxlbmd0aCA+IDAgJiYgIXRoYXQucGxheWluZykge1xuXG4gICAgICAgICAgICAgICAgdGhhdC5tcHZfcHJvY2Vzcy53cml0ZShKU09OLnN0cmluZ2lmeSh7IFwiY29tbWFuZFwiOiBbXCJwbGF5XCJdIH0pICsgXCJcXHJcXG5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhhdC50cmFjaykgdGhhdC50cmFjayA9IDFcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0LnVyaSkgdGhhdC51cmkgPSB0aGF0LnBsYXlsaXN0WzBdLnVyaVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJub3RoaW5nIHRvIHBsYXlcIilcblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcGF1c2UoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx0cnVlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIHRoYXQubXB2X3Byb2Nlc3Mud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBcImNvbW1hbmRcIjogW1wicGxheVwiXSB9KSArIFwiXFxyXFxuXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGF0LnBsYXlpbmcgPSBmYWxzZVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcGxheVRyYWNrKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dHJ1ZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG5cblxuICAgICAgICB9KVxuICAgIH1cblxuICAgIG5leHRUcmFjaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXG5cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcHJldmlvdXNUcmFjaygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHRydWU+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXG5cbiAgICAgICAgfSlcbiAgICB9XG5cblxuXG59XG5cbiJdfQ==
