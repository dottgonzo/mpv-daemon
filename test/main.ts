import * as mocha from "mocha";
import * as chai from "chai";

// import couchauth= require("../index");

import { mpvdaemon } from "../index";


const Player = new mpvdaemon()



const expect = chai.expect;

describe("mpv class", function () {
    describe("configuration", function () {

        it("expect return an object", function () {
            expect(Player).to.be.ok;
        });
        it("expect to have property playlist", function () {
            expect(Player).to.have.property('playlist').that.is.an('array');
        });
        it("expect to have property daemonized", function () {
            expect(Player).to.have.property('daemonized').that.is.not.ok
        });

        it("start", function (done) {
            this.timeout(50000);

            Player.start().then(function (a) {
                expect(Player).to.have.property('daemonized').that.is.ok
                done()
            }).catch(function (err) {
                expect(err).to.not.exist
                done()
            })
        });

    });


    describe("playlist", function () {

        it("load a playlist from file", function (done) {
            this.timeout(50000);

            Player.loadListfromFile(__dirname + "/localplaylist.pls", true).then((a) => {
                expect(Player.playlist.length).to.be.eq(2);
                expect(Player.playlist[0]).to.have.property('title');
                expect(Player.playlist[0]).to.have.property('uri');
                expect(Player.playlist[0]).to.have.property('label');

                setTimeout(function () {
                    done()
                }, 3000)

            }).catch((err) => {
                console.log(err)
                expect(err).to.not.exist
                done()
            })
        });




        it("load a playlist from object", function (done) {
            this.timeout(50000);

            Player.loadList([{ title: "test0", uri: __dirname + "/../videos/best.mkv" }, { title: "test2", uri: __dirname + "/../videos/what.mkv" }]).then((a) => {
                expect(Player.playlist.length).to.be.eq(2);
                expect(Player.playlist[0]).to.have.property('title');
                expect(Player.playlist[0]).to.have.property('uri');
                expect(Player.playlist[0]).to.have.property('label');

                setTimeout(function () {
                    done()
                }, 3000)

            }).catch((err) => {
                console.log(err)
                expect(err).to.not.exist
                done()
            })
        });

    });
    describe("start with a video", function () {

        it("expect a video", function (done) {
            this.timeout(50000);

            Player.play(__dirname + "/../videos/hoedown.mp4").then(function () {
                expect(Player).to.be.ok;
                setTimeout(function () {
                    done()
                }, 3000)
            })
        });

        it("switch to another video", function (done) {
            this.timeout(50000);
            Player.start(__dirname + "/../videos/toccata.mp4").then(function () {
                expect(Player).to.be.ok;
                setTimeout(function () {
                    done()
                }, 3000)
            })
        });

    });
});