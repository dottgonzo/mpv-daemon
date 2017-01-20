"use strict";
var chai = require("chai");
var index_1 = require("../index");
var Player = new index_1.mpvdaemon({ verbose: true });
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
        it("load a playlist from object", function (done) {
            this.timeout(50000);
            Player.loadList([{ uri: __dirname + "/../videos/best.mkv" }, { title: "test2", uri: __dirname + "/../videos/what.mkv" }]).then(function (a) {
                expect(Player.playlist.length).to.be.eq(2);
                expect(Player.playlist[0]).to.have.property('uri').that.eq(__dirname + "/../videos/best.mkv");
                expect(Player.playlist[0]).to.have.property('label').that.is.a("string");
                expect(Player.playlist[1]).to.have.property('title').that.eq("test2");
                expect(Player.playlist[1]).to.have.property('uri').that.eq(__dirname + "/../videos/what.mkv");
                expect(Player.playlist[1]).to.have.property('label').that.is.a("string");
                setTimeout(function () {
                    done();
                }, 23000);
            }).catch(function (err) {
                console.log(err);
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
                }, 23000);
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
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXBCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFDO2dCQUNqQixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBR25ELFVBQVUsQ0FBQztvQkFDUCxJQUFJLEVBQUUsQ0FBQTtnQkFDVixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFWixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxHQUFHO2dCQUNULE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQTtnQkFDeEIsSUFBSSxFQUFFLENBQUE7WUFDVixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFDO0lBTVAsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJ0ZXN0L2NoZWNrbG9hZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIG1vY2hhIGZyb20gXCJtb2NoYVwiO1xuaW1wb3J0ICogYXMgY2hhaSBmcm9tIFwiY2hhaVwiO1xuXG4vLyBpbXBvcnQgY291Y2hhdXRoPSByZXF1aXJlKFwiLi4vaW5kZXhcIik7XG5cbmltcG9ydCB7IG1wdmRhZW1vbiB9IGZyb20gXCIuLi9pbmRleFwiO1xuXG5cbmNvbnN0IFBsYXllciA9IG5ldyBtcHZkYWVtb24oe3ZlcmJvc2U6dHJ1ZX0pXG5cblxuXG5jb25zdCBleHBlY3QgPSBjaGFpLmV4cGVjdDtcblxuZGVzY3JpYmUoXCJtcHYgY2xhc3NcIiwgZnVuY3Rpb24gKCkge1xuICAgIGRlc2NyaWJlKFwiY29uZmlndXJhdGlvblwiLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgaXQoXCJleHBlY3QgcmV0dXJuIGFuIG9iamVjdFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5iZS5vaztcbiAgICAgICAgfSk7XG4gICAgICAgIGl0KFwiZXhwZWN0IHRvIGhhdmUgcHJvcGVydHkgcGxheWxpc3RcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXhwZWN0KFBsYXllcikudG8uaGF2ZS5wcm9wZXJ0eSgncGxheWxpc3QnKS50aGF0LmlzLmFuKCdhcnJheScpO1xuICAgICAgICB9KTtcbiAgICAgICAgaXQoXCJleHBlY3QgdG8gaGF2ZSBwcm9wZXJ0eSBkYWVtb25pemVkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmhhdmUucHJvcGVydHkoJ2RhZW1vbml6ZWQnKS50aGF0LmlzLm5vdC5va1xuICAgICAgICB9KTtcblxuICAgICAgICBpdChcInN0YXJ0XCIsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVvdXQoNTAwMDApO1xuXG4gICAgICAgICAgICBQbGF5ZXIuc3RhcnQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllcikudG8uaGF2ZS5wcm9wZXJ0eSgnZGFlbW9uaXplZCcpLnRoYXQuaXMub2tcbiAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoZXJyKS50by5ub3QuZXhpc3RcbiAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgICAgICBpdChcInBsYXllciBpcyBub3cgZGFlbW9uaXplZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5oYXZlLnByb3BlcnR5KCdkYWVtb25pemVkJykudGhhdC5pcy5va1xuICAgICAgICB9KTtcbiAgICAgICAgaXQoXCJwbGF5ZXIgaXMgbm90IHBsYXlpbmcgbm93XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIpLnRvLmhhdmUucHJvcGVydHkoJ3BsYXlpbmcnKS50aGF0LmlzLm5vdC5va1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuXG4gICAgZGVzY3JpYmUoXCJwbGF5bGlzdFwiLCBmdW5jdGlvbiAoKSB7XG5cblxuICAgICAgICBpdChcImxvYWQgYSBwbGF5bGlzdCBmcm9tIG9iamVjdFwiLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0KDUwMDAwKTtcblxuICAgICAgICAgICAgUGxheWVyLmxvYWRMaXN0KFt7IHVyaTogX19kaXJuYW1lICsgXCIvLi4vdmlkZW9zL2Jlc3QubWt2XCIgfSwgeyB0aXRsZTogXCJ0ZXN0MlwiLCB1cmk6IF9fZGlybmFtZSArIFwiLy4uL3ZpZGVvcy93aGF0Lm1rdlwiIH1dKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllci5wbGF5bGlzdC5sZW5ndGgpLnRvLmJlLmVxKDIpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3RbMF0pLnRvLmhhdmUucHJvcGVydHkoJ3VyaScpLnRoYXQuZXEoX19kaXJuYW1lICsgXCIvLi4vdmlkZW9zL2Jlc3QubWt2XCIpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3RbMF0pLnRvLmhhdmUucHJvcGVydHkoJ2xhYmVsJykudGhhdC5pcy5hKFwic3RyaW5nXCIpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3RbMV0pLnRvLmhhdmUucHJvcGVydHkoJ3RpdGxlJykudGhhdC5lcShcInRlc3QyXCIpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3RbMV0pLnRvLmhhdmUucHJvcGVydHkoJ3VyaScpLnRoYXQuZXEoX19kaXJuYW1lICsgXCIvLi4vdmlkZW9zL3doYXQubWt2XCIpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3RbMV0pLnRvLmhhdmUucHJvcGVydHkoJ2xhYmVsJykudGhhdC5pcy5hKFwic3RyaW5nXCIpO1xuXG5cbiAgICAgICAgICAgIC8vICAgIGV4cGVjdChQbGF5ZXIucGxheWluZykudG8uYmUub2s7XG5cblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgICAgICB9LCAyMzAwMClcblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgICAgICBleHBlY3QoZXJyKS50by5ub3QuZXhpc3RcbiAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KFwicGxheWVyIGlzIHN0aWxsIHJ1bm5pbmdcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXhwZWN0KFBsYXllcikudG8uaGF2ZS5wcm9wZXJ0eSgncGxheWluZycpLnRoYXQuaXMub2tcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoXCJzd2l0Y2ggdG8gbmV4dCB0cmFjayB3aGF0XCIsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVvdXQoNTAwMDApO1xuXG4gICAgICAgICAgICBQbGF5ZXIubmV4dCgpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyLnBsYXlsaXN0Lmxlbmd0aCkudG8uYmUuZXEoMik7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFBsYXllcikudG8uaGF2ZS5wcm9wZXJ0eSgndHJhY2snKS50aGF0LmVxKDIpXG5cblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgICAgICB9LCAyMzAwMClcblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGV4cGVjdChlcnIpLnRvLm5vdC5leGlzdFxuICAgICAgICAgICAgICAgIGRvbmUoKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBpdChcInN3aXRjaCB0byBwcmV2IHRyYWNrIGJlc3RcIiwgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dCg1MDAwMCk7XG5cbiAgICAgICAgICAgIFBsYXllci5wcmV2KCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4cGVjdChQbGF5ZXIucGxheWxpc3QubGVuZ3RoKS50by5iZS5lcSgyKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoUGxheWVyKS50by5oYXZlLnByb3BlcnR5KCd0cmFjaycpLnRoYXQuZXEoMSlcblxuXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKVxuICAgICAgICAgICAgICAgIH0sIDMwMDApXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBleHBlY3QoZXJyKS50by5ub3QuZXhpc3RcbiAgICAgICAgICAgICAgICBkb25lKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG5cblxuICAgIFxuXG4gICAgfSk7XG59KTsiXX0=
