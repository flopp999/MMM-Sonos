/* Magic Mirror
 * Module: MagicMirror-Sonos-Module
 *
 * By Christopher Fenner https://github.com/CFenner
 * Modified by Snille https://github.com/Snille
 * MIT Licensed.
 */

 Module.register('MMM-Sonos', {
        defaults: {
                showStoppedRoom: true,
                showAlbumArt: true,
                preRoomText: 'Zone: ',
                preArtistText: 'Artist: ',
                preTrackText: 'Track: ',
                preTypeText: 'Source: ',
                preStationText: 'Station: ',
                showRoomName: true,
                animationSpeed: 1000,
                updateInterval: 0.5, // every 0.5 minutes
                apiBase: 'http://localhost',
                apiPort: 5005,
                apiEndpoint: 'zones',
                exclude: []
        },
        start: function() {
                Log.info('Starting module: ' + this.name);
                this.update();
                // refresh every x minutes
                setInterval(
                        this.update.bind(this),
                        this.config.updateInterval * 60 * 1000);
        },
        update: function(){
                this.sendSocketNotification(
                        'SONOS_UPDATE',
                        this.config.apiBase + ":" + this.config.apiPort + "/" + this.config.apiEndpoint);
        },
        render: function(data){
                var text = '';
                $.each(data, function (i, item) {
                        var room = '';
                        var isGroup = item.members.length > 1;
                        if(isGroup){
                                $.each(item.members, function (j, member) {
                                        var isExcluded = this.config.exclude.indexOf(member.roomName) !== -1;
                                        room += isExcluded?'':(member.roomName + ', ');
                                }.bind(this));
                                room = room.replace(/, $/,"");
                        }else{
                                room = item.coordinator.roomName;
                                var isExcluded = this.config.exclude.indexOf(room) !== -1;
                                room = isExcluded?'':room;
                        }
                        if(room !== ''){
                                var state = item.coordinator.state.playbackState;
                                var artist = item.coordinator.state.currentTrack.artist;
                                var track = item.coordinator.state.currentTrack.title;
                                var cover = item.coordinator.state.currentTrack.albumArtUri;
//                              var streamInfo = item.coordinator.state.currentTrack.streamInfo;
                                var stationname = item.coordinator.state.currentTrack.stationName;
                                var type = item.coordinator.state.currentTrack.type;
                                var preroom = this.config.preRoomText;
                                var preartist = this.config.preArtistText;
                                var pretrack = this.config.preTrackText;
                                var pretype = this.config.preTypeText;
                                var prestream = this.config.preStreamText;
                                var prestation = this.config.preStationText;
                                text += this.renderRoom(state, pretype, type, preroom, room, preartist, artist, pretrack, track, cover, prestation, stationname);
                        }
                }.bind(this));
                this.loaded = true;
                // only update dom if content changed
                if(this.dom !== text){
                        this.show();
                        this.dom = text;
                        this.updateDom(this.config.animationSpeed);
                }
                // Hide module if not playing.
                if(text == ''){
                        this.hide(this.config.animationSpeed);
                }
        },
        renderRoom: function(state, pretype, type, preroom, roomName, preartist, artist, pretrack, track, cover, prestation, stationname) {
                if(type === 'radio'){
                        var res = track.split(" - ");
                        artist = res[0], track = res[1];
                        cover = cover?cover:"";
                }else{
                        artist = artist?artist:"";
                        track = track?track:"";
                        cover = cover?cover:"";
                        prestation = "";
                }

                var room = '';

                var isEmpty = (artist && artist.trim().length) == 0
                        && (track && track.trim().length) == 0
                        && (cover && cover.trim().length) == 0;
//              var isEmpty = true;

                // show room name if 'showRoomName' is set and PLAYING or 'showStoppedRoom' is set
                if(this.config.showRoomName && (state === 'PLAYING' || this.config.showStoppedRoom) && !isEmpty) {
                        room += this.html.room.format(preroom, roomName);
                }
                // if Sonos Playbar is in TV mode, no title is provided and therefore the room should not be displayed

                // show song if PLAYING
                if(state === 'PLAYING' && !isEmpty) {
//              if(state === 'PLAYING' && !type === 'line_in') {
                        room += this.html.type.format(pretype, type.charAt(0).toUpperCase() + type.slice(1), prestation, stationname);
                        room += this.html.song.format(
                                this.html.name.format(preartist, artist, pretrack, track)+
                                // show album art if 'showAlbumArt' is set
                                (this.config.showAlbumArt
                                        ?this.html.art.format("http://192.168.100.43:1400"+cover)
                                        :''
                                )
                        );
                }

                return this.html.roomWrapper.format(room);
        },
        html: {
                loading: '<div class="dimmed light small">Loading music ...</div>',
                roomWrapper: '{0}',
                room: '<div class="room xsmall">{0}{1}</div>',
                song: '<div class="song">{0}</div>',
                type: '<div class="type normal small">{0}{1}<div>{2}{3}</div></div>',
                name: '<div class="name normal small"><div>{0}{1}</div><div>{2}{3}</div></div>',
                art: '<div class="art"><img src="{0}"/></div>',
        },
        capitalize: function() {
                return this.charAt(0).toUpperCase() + this.slice(1);
        },
        getScripts: function() {
                return [
                        'String.format.js',
                        '//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.2/jquery.js'
                ];
        },
        getStyles: function() {
                return ['sonos.css'];
        },
        getDom: function() {
                var content = '';
                if (!this.loaded) {
                        content = this.html.loading;
                }else if(this.data.position.endsWith("left")){
                        content = '<ul class="flip">'+this.dom+'</ul>';
                }else{
                        content = '<ul>'+this.dom+'</ul>';
                }
                return $('<div class="sonos">'+content+'</div>')[0];
        },
        socketNotificationReceived: function(notification, payload) {
      if (notification === 'SONOS_DATA') {
          Log.info('received SONOS_DATA');
                                        this.render(payload);
      }
  }
});
