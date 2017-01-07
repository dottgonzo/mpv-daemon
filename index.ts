import { spawn } from "child_process"
import * as Promise from "bluebird";
import * as _ from "lodash";
import * as net from "net";

interface ITrack {

}

interface Impvconf {
    socketfile?: string;
    socketconf?: string;
}
interface ImpvPlaylist {

}


export class mpvdaemon {

    playlist: ImpvPlaylist[] = [];
    track: number = 0
    uri: string = ""
    daemonized: boolean = false;
    playing: boolean = false
    mpv_process: any = false
    socket: any;
    socketfile: string = "/tmp/mpvsocket"
    socketconf: string = "--input-unix-socket"
    constructor(conf?: Impvconf) {
        if (conf) {
            if (conf.socketfile) this.socketfile = conf.socketfile
            if (conf.socketconf) this.socketconf = conf.socketconf
        }
    }

    start(play_path) {
        const that = this;
        return new Promise<true>((resolve, reject) => {
            if (!that.daemonized) {

                try {
                    console.log("mpv --idle " + that.socketconf + "=" + that.socketfile)
                    spawn("mpv", ["--idle", that.socketconf + "=" + that.socketfile], { detached: true })
                    setTimeout(() => {

                        that.daemonized = true
                        that.mpv_process = net.createConnection(that.socketfile);
                        that.mpv_process.on("connect", function () { // add timeout
                            if (play_path) {
                                that.play(play_path).then((a) => {
                                    resolve(a)
                                }).catch((err) => {
                                    reject(err)
                                })

                            } else {
                                resolve(true)
                            }

                        });
                    }, 5000)

                } catch (err) {
                    reject(err)
                }


            } else if (play_path) {
                try {
                    that.play(play_path)
                    resolve(true)
                } catch (err) {
                    reject(err)
                }


            } else {
                reject({ error: "player is running" })

            }


        })

    }

    stop() {
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
    play(play_path) {
        const that = this;

        return new Promise<true>((resolve, reject) => {

            that.mpv_process.write(JSON.stringify({ "command": ["loadfile", play_path] }) + "\r\n", () => {
                resolve(true)
            });


        })
    }
    playTrack() {
        return new Promise<true>((resolve, reject) => {



        })
    }
    addTrack(track, index?: number) {

    }
    nextTrack() {
        return new Promise<true>((resolve, reject) => {



        })
    }
    previousTrack() {
        return new Promise<true>((resolve, reject) => {



        })
    }
    setTracks(tracks: ITrack[]) {
        return new Promise<true>((resolve, reject) => {
            let list: string = ""
            _.map(tracks, (c) => {
                if (c) {
                    list += ""
                }
            })

            fs.writeFile("/tmp/mpvplaylist.pls", list, function (err) {

                if (err) {
                    reject({ error: err })
                } else {
                    resolve(true)
                }
            })
        })

    }


}

