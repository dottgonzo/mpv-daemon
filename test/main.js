"use strict";
var chai = require("chai");
var index_1 = require("../index");
var Player = new index_1.mpvdaemon();
var expect = chai.expect;
describe("mpv class", function () {
    describe("configuration", function () {
        it("expect return an object", function () {
            expect(Player).to.be.ok;
        });
        it("expect to have property playlist", function () {
            expect(Player).to.have.property('playlist').that.is.an('array');
        });
        it("expect to have property daemonized", function () {
            expect(Player).to.have.property('daemonized').that.is.not.ok;
        });
        it("start", function (done) {
            this.timeout(50000);
            Player.start().then(function (a) {
                expect(Player).to.have.property('daemonized').that.is.ok;
                done();
            }).catch(function (err) {
                expect(err).to.not.exist;
                done();
            });
        });
        it("player is now daemonized", function () {
            expect(Player).to.have.property('daemonized').that.is.ok;
        });
        it("player is not playing now", function () {
            expect(Player).to.have.property('playing').that.is.not.ok;
        });
    });
    describe("playlist", function () {
        it("load a playlist from file", function (done) {
            this.timeout(50000);
            Player.loadListfromFile(__dirname + "/localplaylist.pls", true).then(function (a) {
                expect(Player.playlist.length).to.be.eq(2);
                expect(Player.playlist[0]).to.have.property('title');
                expect(Player.playlist[0]).to.have.property('uri');
                expect(Player.playlist[0]).to.have.property('label');
                expect(Player.playing).to.be.ok;
                setTimeout(function () {
                    done();
                }, 3000);
            }).catch(function (err) {
                console.log(err);
                expect(err).to.not.exist;
                done();
            });
        });
        it("player is running now", function () {
            expect(Player).to.have.property('playing').that.is.ok;
        });
        it("The track is the number 1", function () {
            expect(Player).to.have.property('track').that.eq(1);
        });
        it("load a playlist from object", function (done) {
            this.timeout(50000);
            Player.loadList([{ uri: __dirname + "/../videos/best.mkv" }, { title: "test2", uri: __dirname + "/../videos/what.mkv" }]).then(function (a) {
                expect(Player.playlist.length).to.be.eq(2);
                expect(Player.playlist[0]).to.have.property('uri').that.eq(__dirname + "/../videos/best.mkv");
                expect(Player.playlist[0]).to.have.property('label').that.is.a("string");
                expect(Player.playlist[1]).to.have.property('title').that.eq("test2");
                expect(Player.playlist[1]).to.have.property('uri').that.eq(__dirname + "/../videos/what.mkv");
                expect(Player.playlist[1]).to.have.property('label').that.is.a("string");
                expect(Player.playing).to.be.ok;
                setTimeout(function () {
                    done();
                }, 3000);
            }).catch(function (err) {
                expect(err).to.not.exist;
                done();
            });
        });
        it("player is still running", function () {
            expect(Player).to.have.property('playing').that.is.ok;
        });
        it("switch to next track what", function (done) {
            this.timeout(50000);
            Player.next().then(function (a) {
                expect(Player.playlist.length).to.be.eq(2);
                expect(Player).to.have.property('track').that.eq(2);
                setTimeout(function () {
                    done();
                }, 3000);
            }).catch(function (err) {
                expect(err).to.not.exist;
                done();
            });
        });
        it("switch to prev track best", function (done) {
            this.timeout(50000);
            Player.prev().then(function (a) {
                expect(Player.playlist.length).to.be.eq(2);
                expect(Player).to.have.property('track').that.eq(1);
                setTimeout(function () {
                    done();
                }, 3000);
            }).catch(function (err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });
    describe("start with a video", function () {
        it("expect a video", function (done) {
            this.timeout(50000);
            Player.play(__dirname + "/../videos/hoedown.mp4").then(function () {
                expect(Player).to.be.ok;
                expect(Player.playlist.length).to.be.eq(1);
                expect(Player).to.have.property('track').that.eq(1);
                setTimeout(function () {
                    done();
                }, 3000);
            });
        });
        it("switch to another video", function (done) {
            this.timeout(50000);
            Player.start(__dirname + "/../videos/toccata.mp4").then(function () {
                expect(Player).to.be.ok;
                expect(Player.playlist.length).to.be.eq(1);
                expect(Player).to.have.property('track').that.eq(1);
                setTimeout(function () {
                    done();
                }, 3000);
            });
        });
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ25ELFVBQVUsQ0FBQztvQkFDUCxJQUFJLEVBQUUsQ0FBQTtnQkFDVixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDWixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFDO0lBRVAsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJ0ZXN0L21haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBtb2NoYSBmcm9tIFwibW9jaGFcIjtcbmltcG9ydCAqIGFzIGNoYWkgZnJvbSBcImNoYWlcIjtcblxuLy8gaW1wb3J0IGNvdWNoYXV0aD0gcmVxdWlyZShcIi4uL2luZGV4XCIpO1xuXG5pbXBvcnQgeyBtcHZkYWVtb24gfSBmcm9tIFwiLi4vaW5kZXhcIjtcblxuXG5jb25zdCBQbGF5ZXIgPSBuZXcgbXB2ZGFlbW9uKClcblxuXG5cbmNvbnN0IGV4cGVjdCA9IGNoYWkuZXhwZWN0O1xuXG5kZXNjcmliZShcIm1wdiBjbGFzc1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgZGVzY3JpYmUoXCJjb25maWd1cmF0aW9uXCIsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpdChcImV4cGVjdCByZXR1cm4gYW4gb2JqZWN0XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmJlLm9rO1xuICAgICAgICB9KTtcbiAgICAgICAgaXQoXCJleHBlY3QgdG8gaGF2ZSBwcm9wZXJ0eSBwbGF5bGlzdFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5oYXZlLnByb3BlcnR5KCdwbGF5bGlzdCcpLnRoYXQuaXMuYW4oJ2FycmF5Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICBpdChcImV4cGVjdCB0byBoYXZlIHByb3BlcnR5IGRhZW1vbml6ZWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXhwZWN0KFBsYXllcikudG8uaGF2ZS5wcm9wZXJ0eSgnZGFlbW9uaXplZCcpLnRoYXQuaXMubm90Lm9rXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KFwic3RhcnRcIiwgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dCg1MDAwMCk7XG5cbiAgICAgICAgICAgIFBsYXllci5zdGFydCgpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5oYXZlLnByb3BlcnR5KCdkYWVtb25pemVkJykudGhhdC5pcy5va1xuICAgICAgICAgICAgICAgIGRvbmUoKVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGV4cGVjdChlcnIpLnRvLm5vdC5leGlzdFxuICAgICAgICAgICAgICAgIGRvbmUoKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgICAgIGl0KFwicGxheWVyIGlzIG5vdyBkYWVtb25pemVkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmhhdmUucHJvcGVydHkoJ2RhZW1vbml6ZWQnKS50aGF0LmlzLm9rXG4gICAgICAgIH0pO1xuICAgICAgICBpdChcInBsYXllciBpcyBub3QgcGxheWluZyBub3dcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXhwZWN0KFBsYXllcikudG8uaGF2ZS5wcm9wZXJ0eSgncGxheWluZycpLnRoYXQuaXMubm90Lm9rXG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG5cbiAgICBkZXNjcmliZShcInBsYXlsaXN0XCIsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpdChcImxvYWQgYSBwbGF5bGlzdCBmcm9tIGZpbGVcIiwgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dCg1MDAwMCk7XG5cbiAgICAgICAgICAgIFBsYXllci5sb2FkTGlzdGZyb21GaWxlKF9fZGlybmFtZSArIFwiL2xvY2FscGxheWxpc3QucGxzXCIsIHRydWUpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyLnBsYXlsaXN0Lmxlbmd0aCkudG8uYmUuZXEoMik7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdFswXSkudG8uaGF2ZS5wcm9wZXJ0eSgndGl0bGUnKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyLnBsYXlsaXN0WzBdKS50by5oYXZlLnByb3BlcnR5KCd1cmknKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyLnBsYXlsaXN0WzBdKS50by5oYXZlLnByb3BlcnR5KCdsYWJlbCcpO1xuXG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5aW5nKS50by5iZS5vaztcblxuXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKVxuICAgICAgICAgICAgICAgIH0sIDMwMDApXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgZXhwZWN0KGVycikudG8ubm90LmV4aXN0XG4gICAgICAgICAgICAgICAgZG9uZSgpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgICBpdChcInBsYXllciBpcyBydW5uaW5nIG5vd1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5oYXZlLnByb3BlcnR5KCdwbGF5aW5nJykudGhhdC5pcy5va1xuICAgICAgICB9KTtcbiAgICAgICAgaXQoXCJUaGUgdHJhY2sgaXMgdGhlIG51bWJlciAxXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmhhdmUucHJvcGVydHkoJ3RyYWNrJykudGhhdC5lcSgxKVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIGl0KFwibG9hZCBhIHBsYXlsaXN0IGZyb20gb2JqZWN0XCIsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVvdXQoNTAwMDApO1xuXG4gICAgICAgICAgICBQbGF5ZXIubG9hZExpc3QoW3sgdXJpOiBfX2Rpcm5hbWUgKyBcIi8uLi92aWRlb3MvYmVzdC5ta3ZcIiB9LCB7IHRpdGxlOiBcInRlc3QyXCIsIHVyaTogX19kaXJuYW1lICsgXCIvLi4vdmlkZW9zL3doYXQubWt2XCIgfV0pLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyLnBsYXlsaXN0Lmxlbmd0aCkudG8uYmUuZXEoMik7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdFswXSkudG8uaGF2ZS5wcm9wZXJ0eSgndXJpJykudGhhdC5lcShfX2Rpcm5hbWUgKyBcIi8uLi92aWRlb3MvYmVzdC5ta3ZcIik7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdFswXSkudG8uaGF2ZS5wcm9wZXJ0eSgnbGFiZWwnKS50aGF0LmlzLmEoXCJzdHJpbmdcIik7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdFsxXSkudG8uaGF2ZS5wcm9wZXJ0eSgndGl0bGUnKS50aGF0LmVxKFwidGVzdDJcIik7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdFsxXSkudG8uaGF2ZS5wcm9wZXJ0eSgndXJpJykudGhhdC5lcShfX2Rpcm5hbWUgKyBcIi8uLi92aWRlb3Mvd2hhdC5ta3ZcIik7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdFsxXSkudG8uaGF2ZS5wcm9wZXJ0eSgnbGFiZWwnKS50aGF0LmlzLmEoXCJzdHJpbmdcIik7XG5cblxuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWluZykudG8uYmUub2s7XG5cblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgICAgICB9LCAzMDAwKVxuXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KGVycikudG8ubm90LmV4aXN0XG4gICAgICAgICAgICAgICAgZG9uZSgpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgICBpdChcInBsYXllciBpcyBzdGlsbCBydW5uaW5nXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmhhdmUucHJvcGVydHkoJ3BsYXlpbmcnKS50aGF0LmlzLm9rXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KFwic3dpdGNoIHRvIG5leHQgdHJhY2sgd2hhdFwiLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0KDUwMDAwKTtcblxuICAgICAgICAgICAgUGxheWVyLm5leHQoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdC5sZW5ndGgpLnRvLmJlLmVxKDIpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmhhdmUucHJvcGVydHkoJ3RyYWNrJykudGhhdC5lcSgyKVxuXG5cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpXG4gICAgICAgICAgICAgICAgfSwgMzAwMClcblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGV4cGVjdChlcnIpLnRvLm5vdC5leGlzdFxuICAgICAgICAgICAgICAgIGRvbmUoKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBpdChcInN3aXRjaCB0byBwcmV2IHRyYWNrIGJlc3RcIiwgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dCg1MDAwMCk7XG5cbiAgICAgICAgICAgIFBsYXllci5wcmV2KCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3QubGVuZ3RoKS50by5iZS5lcSgyKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5oYXZlLnByb3BlcnR5KCd0cmFjaycpLnRoYXQuZXEoMSlcblxuXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKVxuICAgICAgICAgICAgICAgIH0sIDMwMDApXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBleHBlY3QoZXJyKS50by5ub3QuZXhpc3RcbiAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG5cblxuICAgIH0pO1xuICAgIGRlc2NyaWJlKFwic3RhcnQgd2l0aCBhIHZpZGVvXCIsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpdChcImV4cGVjdCBhIHZpZGVvXCIsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVvdXQoNTAwMDApO1xuXG4gICAgICAgICAgICBQbGF5ZXIucGxheShfX2Rpcm5hbWUgKyBcIi8uLi92aWRlb3MvaG9lZG93bi5tcDRcIikudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllcikudG8uYmUub2s7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdC5sZW5ndGgpLnRvLmJlLmVxKDEpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmhhdmUucHJvcGVydHkoJ3RyYWNrJykudGhhdC5lcSgxKVxuXG5cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpXG4gICAgICAgICAgICAgICAgfSwgMzAwMClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KFwic3dpdGNoIHRvIGFub3RoZXIgdmlkZW9cIiwgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dCg1MDAwMCk7XG4gICAgICAgICAgICBQbGF5ZXIuc3RhcnQoX19kaXJuYW1lICsgXCIvLi4vdmlkZW9zL3RvY2NhdGEubXA0XCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmJlLm9rO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3QubGVuZ3RoKS50by5iZS5lcSgxKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5oYXZlLnByb3BlcnR5KCd0cmFjaycpLnRoYXQuZXEoMSlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpXG4gICAgICAgICAgICAgICAgfSwgMzAwMClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG59KTsiXX0=
