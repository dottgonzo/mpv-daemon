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
    });


    describe("playlist", function () {

        it("load a playlist", function (done) {
            Player.loadListfromFile(__dirname + "/test/playlist.pls").then((a)=>{
            expect(Player.playlist.length).to.be.eq(2);
            expect(Player.playlist[0]).to.have.property('title');
            expect(Player.playlist[0]).to.have.property('uri');
            expect(Player.playlist[0]).to.have.property('label');

                setTimeout(function () {
                    done()
                }, 10000)

            }).catch((err)=>{
                expect(err).to.not.exist
                done()
            })
        });

    });

    describe("start with a video", function () {

        it("expect a video", function (done) {
            this.timeout(50000);
            Player.start("https://www.youtube.com/watch?v=I4agXcHLySs").then(function () {
                expect(Player).to.be.ok;
                setTimeout(function () {
                    done()
                }, 10000)
            })
        });

        it("switch to another video", function (done) {
            this.timeout(50000);
            Player.start("https://www.youtube.com/watch?v=7MBaEEODzU0").then(function () {
                expect(Player).to.be.ok;
                setTimeout(function () {
                    done()
                }, 10000)
            })
        });

    });
});