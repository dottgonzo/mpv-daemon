import { spawn } from "child_process"
import * as Promise from "bluebird";
import * as _ from "lodash";
const pathExists = require("path-exists");
import * as async from "async";
import * as net from "net";
import * as fs from "fs";
import { uniqueid } from "unicoid";

interface ITrackload {
    title?: string
    label?: string
    uri: string

}


interface ITrack extends ITrackload {
    label: string;
}

interface Impvconf {
    socketfile?: string
    socketconf?: string
    verbose?: boolean
    noaudio?: boolean
}



export class mpvdaemon {

    playlist: ITrack[] = [];
    track: number = 0
    uri: string = ""
    daemonized: boolean = false
    playing: boolean = false
    mpv_process: any = false
    socket: any
    socketfile: string = "/tmp/mpvsocket"
    socketconf: string = "--input-unix-socket"
    verbose: boolean
    noaudio: boolean = false
    constructor(conf?: Impvconf) {
        if (conf) {
            if (conf.socketfile) this.socketfile = conf.socketfile
            if (conf.socketconf) this.socketconf = conf.socketconf
            if (conf.verbose) this.verbose = conf.verbose
            if (conf.verbose) this.verbose = conf.verbose
            if (conf.noaudio) this.noaudio = conf.noaudio
        }
    }

    start(play_path?: string) {
        const that = this;
        return new Promise<true>((resolve, reject) => {
            if (!that.daemonized) {

                try {
                    let mpv
                    if (that.noaudio) { // todo demuxer-readahead-packets=300 separate
                        mpv = spawn("mpv", ["--idle", "--really-quiet", "--loop=force", "--no-audio","--rtsp-transport=udp",that.socketconf + "=" + that.socketfile], { detached: true, stdio: "ignore" })

                    } else {
                        mpv = spawn("mpv", ["--idle", "--really-quiet", "--loop=force", that.socketconf + "=" + that.socketfile], { detached: true, stdio: "ignore" })
                    }
                    if (that.verbose) {
                        mpv.on("error", (data) => {
                            console.log("error: " + data)
                        })
                    }
                    setTimeout(() => {

                        that.mpv_process = net.createConnection(that.socketfile);
                        that.mpv_process.on("connect", function () { // add timeout
                            if (!that.daemonized) {
                                that.daemonized = true

                                if (play_path) {
                                    that.play(play_path).then((a) => {
                                        resolve(a)
                                    }).catch((err) => {
                                        reject(err)
                                    })

                                } else {
                                    resolve(true)
                                }

                            }

                        });
                        if (that.verbose) {
                            that.mpv_process.on("data", function (data) { // add timeout
                                console.log("mpvdata: " + data)
                            });
                            that.mpv_process.on("error", function (data) { // add timeout
                                console.log("mpverror: " + data)
                            });
                        }


                    }, 5000)

                } catch (err) {
                    reject(err)
                }


            } else if (play_path) {
                that.play(play_path).then(function () {
                    resolve(true)
                }).catch(function (err) {
                    reject(err)

                })

            } else {
                reject({ error: "player is running" })

            }


        })

    }

    switch(target: number) { // relative 
        const that = this;

        return new Promise<true>((resolve, reject) => {

            if (target > 0) {
                that.next(target).then((a) => {
                    resolve(a)
                }).catch((err) => {
                    reject(err)
                })
            } else if (target === 0) {
                reject({ error: "nothing to do" })
            } else {
                that.prev(target).then((a) => {
                    resolve(a)
                }).catch((err) => {
                    reject(err)
                })
            }

        })
    }

    next(target?: number) {
        const that = this;

        return new Promise<true>((resolve, reject) => {
            if (!target || target === 1) {
                that.mpv_process.write(JSON.stringify({ "command": ["playlist-next"] }) + "\r\n", () => {
                    if (that.track < that.playlist.length) {
                        _.map(that.playlist, (p, i) => {

                            if (i !== (that.track + 1)) {
                                that.uri = p.uri
                            }
                        })
                        that.track += 1
                    } resolve(true)
                });
            } else {
                that.to(that.track + target).then((a) => {
                    resolve(a)
                }).catch((err) => {
                    reject(err)
                })
            }



        })
    }
    prev(target?: number) {
        const that = this;

        return new Promise<true>((resolve, reject) => {
            if (!target || target === 1) {
                that.mpv_process.write(JSON.stringify({ "command": ["playlist-prev"] }) + "\r\n", () => {
                    if (that.track > 1) {

                        _.map(that.playlist, (p, i) => {

                            if (i !== (that.track - 1)) {
                                that.uri = p.uri
                            }
                        })
                        that.track += -1


                    }
                    resolve(true)
                });
            } else {
                that.to(that.track + Math.abs(target)).then((a) => {
                    resolve(a)
                }).catch((err) => {
                    reject(err)
                })
            }

        })
    }
    to(target: number) {
        const that = this;

        return new Promise<true>((resolve, reject) => {

            reject("todo")


        })
    }


    stop() {
        const that = this;

        return new Promise<true>((resolve, reject) => {
            try {
                that.mpv_process.write(JSON.stringify({ "command": ["stop"] }) + "\r\n", () => {
                    // parse file to load the list on class

                    that.track = 0
                    that.playlist = []
                    that.playing = false
                    that.uri = ""
                    resolve(true)
                });



            } catch (err) {
                reject({ error: err })
            }


        })
    }


    end() {
        const that = this;

        return new Promise<true>((resolve, reject) => {
            try {
                that.mpv_process.kill()
                that.daemonized = false
                that.track = 0
                that.playlist = []
                that.playing = false
                that.uri = ""
                resolve(true)
            } catch (err) {
                reject({ error: err })
            }


        })
    }
    loadListfromFile(playlist_path: string, playnow?: true) {
        const that = this;
        return new Promise<true>((resolve, reject) => {
            if (playlist_path && playlist_path.split('.pls').length > 1) {
                pathExists(playlist_path).then((a) => {
                    if (a) {
                        if (that.daemonized) {
                            fs.readFile(playlist_path, (err, data) => {
                                if (err) {
                                    console.log("errload")

                                    reject({ error: err })
                                } else {
                                    fs.readFile(playlist_path, function (err, data) {
                                        if (err) {
                                            console.log({ error: err })
                                            reject({ error: err })
                                        } else {

                                            const datatoarray = data.toString().split("\n")
                                            const tracks = []
                                            _.map(datatoarray, function (data) {
                                                if (data.split('=').length > 1 && data.split('NumberOfEntries=').length < 2 && data.split('Version=').length < 2) {

                                                    const index = parseInt(data.split('=')[0][data.split('=')[0].length - 1])

                                                    if (tracks.length < index) {
                                                        tracks.push({})
                                                    }
                                                    if (data.split('File').length > 1) {
                                                        tracks[index - 1].uri = data.split(data.split('=')[0] + "=")[1]
                                                    } else if (data.split('Title').length > 1) {
                                                        tracks[index - 1].title = data.split(data.split('=')[0] + "=")[1]
                                                    }
                                                }
                                            })

                                            that.playlist = []
                                            _.map(tracks, function (track) {
                                                track.label = uniqueid(4)
                                                that.playlist.push(track)
                                            });
                                            if (playnow) {
                                                that.mpv_process.write(JSON.stringify({ "command": ["loadlist", playlist_path, "replace"] }) + "\r\n", () => {
                                                    // parse file to load the list on class
                                                    that.play().then((a) => {
                                                        resolve(a)
                                                    }).catch((err) => {
                                                        reject(err)
                                                    })



                                                });


                                            } else {
                                                that.mpv_process.write(JSON.stringify({ "command": ["loadlist", playlist_path, "replace"] }) + "\r\n", () => {
                                                    // parse file to load the list on class
                                                    resolve(true)
                                                });


                                            }
                                        }
                                    })

                                }
                            })

                        } else {
                            reject({ error: "mpv not started" })

                        }

                    } else {
                        console.log("erro")

                        reject({ error: "wrong path" })
                    }
                }).catch((err) => {
                    reject(err)

                })
            } else {
                console.log("erro")
                reject({ error: "file must be a .pls file" })

            }
        });

    }

    addTrack(track: ITrackload, index?: number) {
        const that = this;
        return new Promise<true>((resolve, reject) => {

            const filepath = "/tmp/mpvfilelist_"+uniqueid(6)+"_" + new Date().getTime() + ".pls"



            let filelist = "[playlist]\n\nFile1=" + track.uri + "\n"

            if (track.title) filelist += "Title1=" + track.title + "\n"


            filelist += "\nNumberOfEntries=1\nVersion=2\n"


            fs.writeFile(filepath, filelist, {}, (err) => {

                if (!err) {
                    if (that.playlist.length > 0) {
                        that.mpv_process.write(JSON.stringify({ "command": ["loadlist", filepath, "append"] }) + "\r\n", () => {
                            if (!track.label) track.label = uniqueid(4)
                            that.playlist.push(<ITrack>track)
                            if (that.verbose) {
                                console.log("start first track of a playlist")
                            }
                            resolve(true)
                        });
                    } else {
                        that.mpv_process.write(JSON.stringify({ "command": ["loadlist", filepath] }) + "\r\n", () => {
                            if (!track.label) track.label = uniqueid(4)
                            that.playlist.push(<ITrack>track)
                            if (that.verbose) {
                                console.log("append track")
                            }
                            resolve(true)
                        });
                    }

                } else {
                    reject({ error: "wrong path" })
                }

            });


        });

    }

    clearList() {
        const that = this;
        return new Promise<true>((resolve, reject) => {
            if (that.playlist.length > 0) {

                let preserve: ITrack
                that.mpv_process.write(JSON.stringify({ "command": ["playlist-clear"] }) + "\r\n", () => {
                    _.map(that.playlist, (t) => {
                        if (t.uri === that.uri) {
                            preserve = t
                        }
                    })
                    if (preserve) {
                        that.playlist = [preserve]
                    } else {
                        that.playlist = []
                    }

                    if (that.verbose) {
                        console.log("clear playlist")
                    }
                    resolve(true)
                });
            } else {
                resolve(true)

            }

        });

    }
    loadList(tracks: ITrackload[]) {
        const that = this;
        return new Promise<true>((resolve, reject) => {
            if (that.playing) {
                that.clearList().then(() => {
                    async.eachSeries(tracks, (track, cb) => {
                        that.addTrack(track).then((a) => {
                            cb()
                        }).catch((err) => {
                            cb(err)
                        })
                    }, (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", () => {
                                resolve(true)
                            });
                        }
                    })
                }).catch((err) => {
                    reject(err)
                })
            } else {

                async.eachSeries(tracks, (track, cb) => {
                    that.addTrack(track).then((a) => {
                        cb()
                    }).catch((err) => {
                        cb(err)
                    })
                }, (err) => {
                    if (err) {
                        reject(err)
                    } else {

                        //    that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", () => {
                        if (that.verbose) {
                            console.log("playlist loaded")
                        }
                        that.playing = true
                        that.track = 1
                        that.uri = that.playlist[0].uri
                        resolve(true)
                        //         });





                    }
                })



            }

        })


    }

    play(play_path?: string) {
        const that = this;

        return new Promise<true>((resolve, reject) => {
            if (play_path) { // not working!!
                if (that.playlist.length > 1) {
                    that.clearList().then(() => {
                        console.log(play_path)
                        that.addTrack({ uri: play_path }).then(() => {
                            that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", () => {
                                that.playlist = []

                                that.playlist.push({ uri: play_path, label: uniqueid(6) })
                                that.playing = true
                                that.uri = play_path
                                that.track = 1
                                resolve(true)
                            });

                        }).catch((err) => {
                            reject(err)
                        })

                    }).catch((err) => {
                        that.addTrack({ uri: play_path }).then(() => {
                            that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", () => {
                                that.playlist = []

                                that.playlist.push({ uri: play_path, label: uniqueid(6) })
                                that.playing = true
                                that.uri = play_path
                                that.track = 1
                                resolve(true)
                            });

                        }).catch((err) => {
                            reject(err)
                        })

                    })
                } else if (that.playlist.length === 1) {
                    that.addTrack({ uri: play_path }).then(() => {
                        that.mpv_process.write(JSON.stringify({ "command": ["playlist-remove", "current"] }) + "\r\n", () => {
                            that.playlist = []

                            that.playlist.push({ uri: play_path, label: uniqueid(6) })
                            that.playing = true
                            that.uri = play_path
                            that.track = 1
                            resolve(true)
                        });

                    }).catch((err) => {
                        reject(err)
                    })
                } else {
                    that.mpv_process.write(JSON.stringify({ "command": ["loadfile", play_path] }) + "\r\n", () => {
                        that.playlist.push({ uri: play_path, label: uniqueid(6) })

                        that.playing = true
                        that.uri = play_path
                        that.track = 1
                        resolve(true)
                    });

                }


            } else if (that.playlist.length > 0 && !that.playing) {

                that.mpv_process.write(JSON.stringify({ "command": ["play"] }) + "\r\n", () => {
                    that.playing = true
                    if (!that.track) that.track = 1
                    if (!that.uri) that.uri = that.playlist[0].uri

                    resolve(true)
                });

            } else {
                reject("nothing to play")

            }


        })
    }
    pause() {
        const that = this;

        return new Promise<true>((resolve, reject) => {

            that.mpv_process.write(JSON.stringify({ "command": ["play"] }) + "\r\n", () => {
                that.playing = false

                resolve(true)
            });

        })
    }
    playTrack() {
        return new Promise<true>((resolve, reject) => {



        })
    }

    nextTrack() {
        return new Promise<true>((resolve, reject) => {



        })
    }
    previousTrack() {
        return new Promise<true>((resolve, reject) => {



        })
    }



}

