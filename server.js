const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Data sesi pengguna
let userLikes = {}; // Menyimpan jumlah likes per pengguna
let userGifts = {}; // Menyimpan jumlah gifts per pengguna
let userShares = {}; // Menyimpan jumlah shares per pengguna
let userProfiles = {}; // Menyimpan data profil pengguna

// Array gambar yang akan ditampilkan untuk like
const profilePictures = [
    'public/images/image1.jpg', // Gambar untuk 1 like
    'public/images/image2.jpg', // Gambar untuk 2 likes
    'public/images/image3.jpg', // Gambar untuk 3 likes
    // Tambahkan lebih banyak gambar sesuai kebutuhan
];

// Variabel untuk menentukan apakah suara sedang diputar
let isPlaying = false;
let currentSoundTimeout = null; // Variable to hold the current sound timeout

// Fungsi untuk mengupdate jumlah likes per pengguna
function updateUserLikes(username, likeCount) {
    userLikes[username] = (userLikes[username] || 0) + likeCount;

    // Tentukan gambar yang akan ditampilkan berdasarkan jumlah like
    let pictureIndex = Math.min(userLikes[username] - 1, profilePictures.length - 1);
    const profilePictureUrl = profilePictures[pictureIndex];

    // Kirimkan update gambar profil dan jumlah like ke klien
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'updateProfilePicture',
                username: username,
                pictureUrl: profilePictureUrl,
                likes: userLikes[username],
                gifts: userGifts[username] || 0,
                shares: userShares[username] || 0
            }));
        }
    });
}

// Fungsi untuk memperbarui tampilan foto profil pengguna
function updateProfilePicture(username) {
    const profileInfo = {
        username: username,
        likes: userLikes[username] || 0,
        gifts: userGifts[username] || 0,
        shares: userShares[username] || 0
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'updateProfilePicture',
                ...profileInfo
            }));
        }
    });
}

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Variable to hold TikTok username
let tiktokLiveConnection;

// Function to play sound on client
function playSound(ws, soundPath) {
    if (!isPlaying) {
        isPlaying = true;
        ws.send(JSON.stringify({
            type: 'play-sound',
            sound: soundPath
        }));

        // Simulasi durasi suara (misalnya, 5 detik)
        currentSoundTimeout = setTimeout(() => {
            isPlaying = false;
            currentSoundTimeout = null;
        }, 5000); // Sesuaikan dengan durasi suara sesungguhnya
    } else {
        console.log('A sound is already playing, skipping this sound.');
    }
}

// Function to stop playing sound
function stopPlayingSound(ws) {
    if (isPlaying) {
        clearTimeout(currentSoundTimeout);
        isPlaying = false;
        currentSoundTimeout = null;
        ws.send(JSON.stringify({
            type: 'stop-sound'
        }));
        console.log('Sound playback stopped.');
    }
}

// Function to display floating photo
function displayFloatingPhoto(ws, profilePictureUrl, userName) {
    ws.send(JSON.stringify({
        type: 'floating-photo',
        profilePictureUrl: profilePictureUrl,
        userName: userName
    }));
}

// Function to show big photo
function showBigPhoto(ws, profilePictureUrl, userName) {
    ws.send(JSON.stringify({
        type: 'big-photo',
        profilePictureUrl: profilePictureUrl,
        userName: userName
    }));
}

// Function to handle member join
function handleMemberJoin(ws, data) {
    console.log(`${data.uniqueId} joined the stream!`);
    displayFloatingPhoto(ws, data.profilePictureUrl, data.uniqueId);
}

// Function to handle gift
function handleGift(ws, data) {
    if (data.giftType === 1 && !data.repeatEnd) {
        // Streak in progress => show only temporary
        console.log(`${data.uniqueId} is sending gift ${data.giftName} x${data.repeatCount}`);
    } else {
        // Streak ended or non-streakable gift => process the gift with final repeat_count
        console.log(`${data.uniqueId} has sent gift ${data.giftName} x${data.repeatCount}`);
        showBigPhoto(ws, data.profilePictureUrl, data.uniqueId);
    }
}

// Function to handle like
function handleLike(ws, data) {
    console.log(`${data.uniqueId} sent ${data.likeCount} likes`);
    for (let i = 0; i < data.likeCount; i++) {
        setTimeout(() => {
            displayFloatingPhoto(ws, data.profilePictureUrl, data.uniqueId);
        }, i * 1000); // Delay each like
    }
}

// Function to handle share
function handleShare(ws, data) {
    console.log(`${data.uniqueId} shared the stream!`);
    displayFloatingPhoto(ws, data.profilePictureUrl, data.uniqueId);
}

// Function to handle envelope
function handleEnvelope(ws, data) {
    console.log('Envelope received:', data);
}

// Function to handle chat comments
function handleChat(ws, data) {
    console.log(`${data.uniqueId} (userId:${data.userId}) writes: ${data.comment}`);
    ws.send(JSON.stringify({
        type: 'chat',
        userName: data.uniqueId,
        comment: data.comment
    }));

    // Pemetaan komentar ke file suara
    const soundMapping = {
    'stop': 'sounds/stop.mp3',
    't': 'sounds/telolet.mp3',
    '1': 'sounds/1.mp3',
    '2': 'sounds/2.mp3',
    '3': 'sounds/3.mp3',
    '4': 'sounds/4.mp3',
    '5': 'sounds/5.mp3',
    '6': 'sounds/6.mp3',
    '7': 'sounds/7.mp3',
    '8': 'sounds/8.mp3',
    '9': 'sounds/9.mp3',
    '10': 'sounds/10.mp3',
    '11': 'sounds/11.mp3',
    '12': 'sounds/12.mp3',
    '13': 'sounds/13.mp3',
    '14': 'sounds/14.mp3',
    '15': 'sounds/15.mp3',
    '16': 'sounds/16.mp3',
    '17': 'sounds/17.mp3',
    '18': 'sounds/18.mp3',
    '19': 'sounds/19.mp3',
    '20': 'sounds/20.mp3',
    '21': 'sounds/21.mp3',
    '22': 'sounds/22.mp3',
    '23': 'sounds/23.mp3',
    '24': 'sounds/24.mp3',
    '25': 'sounds/25.mp3',
    '26': 'sounds/26.mp3',
    '27': 'sounds/27.mp3',
    '28': 'sounds/28.mp3',
    '29': 'sounds/29.mp3',
    '30': 'sounds/30.mp3',
    '31': 'sounds/31.mp3',
    '32': 'sounds/32.mp3',
    '33': 'sounds/33.mp3',
    '34': 'sounds/34.mp3',
    '35': 'sounds/35.mp3',
    '36': 'sounds/36.mp3',
    '37': 'sounds/37.mp3',
    '38': 'sounds/38.mp3',
    '39': 'sounds/39.mp3',
    '40': 'sounds/40.mp3',
    '41': 'sounds/41.mp3',
    '42': 'sounds/42.mp3',
    '43': 'sounds/43.mp3',
    '44': 'sounds/44.mp3',
    '45': 'sounds/45.mp3',
    '46': 'sounds/46.mp3',
    '47': 'sounds/47.mp3',
    '48': 'sounds/48.mp3',
    '49': 'sounds/49.mp3',
    '50': 'sounds/50.mp3',
    '51': 'sounds/51.mp3',
    '52': 'sounds/52.mp3',
    '53': 'sounds/53.mp3',
    '54': 'sounds/54.mp3',
    '55': 'sounds/55.mp3',
    '56': 'sounds/56.mp3',
    '57': 'sounds/57.mp3',
    '58': 'sounds/58.mp3',
    '59': 'sounds/59.mp3',
    '60': 'sounds/60.mp3',
    '61': 'sounds/61.mp3',
    '62': 'sounds/62.mp3',
    '63': 'sounds/63.mp3',
    '64': 'sounds/64.mp3',
    '65': 'sounds/65.mp3',
    '66': 'sounds/66.mp3',
    '67': 'sounds/67.mp3',
    '68': 'sounds/68.mp3',
    '69': 'sounds/69.mp3',
    '70': 'sounds/70.mp3',
    '71': 'sounds/71.mp3',
    '72': 'sounds/72.mp3',
    '73': 'sounds/73.mp3',
    '74': 'sounds/74.mp3',
    '75': 'sounds/75.mp3',
    '76': 'sounds/76.mp3',
    '77': 'sounds/77.mp3',
    '78': 'sounds/78.mp3',
    '79': 'sounds/79.mp3',
    '80': 'sounds/80.mp3',
    '81': 'sounds/81.mp3',
    '82': 'sounds/82.mp3',
    '83': 'sounds/83.mp3',
    '84': 'sounds/84.mp3',
    '85': 'sounds/85.mp3',
    '86': 'sounds/86.mp3',
    '87': 'sounds/87.mp3',
    '88': 'sounds/88.mp3',
    '89': 'sounds/89.mp3',
    '90': 'sounds/90.mp3',
    '91': 'sounds/91.mp3',
    '92': 'sounds/92.mp3',
    '93': 'sounds/93.mp3',
    '94': 'sounds/94.mp3',
    '95': 'sounds/95.mp3',
    '96': 'sounds/96.mp3',
    '97': 'sounds/97.mp3',
    '98': 'sounds/98.mp3',
    '99': 'sounds/99.mp3',
    '100': 'https://www.youtube.com/watch?v=ZC1o_KNmCpE'
};

    // Cek apakah komentar sesuai dengan salah satu kunci di soundMapping
    const soundFile = soundMapping[data.comment.trim()];
    if (soundFile) {
        playSound(ws, soundFile);
    }

    // Cek apakah komentar adalah "ganti"
    if (data.comment.trim().toLowerCase() === 'ganti') {
        stopPlayingSound(ws);
    }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('WebSocket connection established.');

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'connect') {
            const username = data.username;
            console.log('Connecting to TikTok with username:', username);

            // If there's an existing connection, disconnect it
            if (tiktokLiveConnection) {
                tiktokLiveConnection.disconnect();
            }

            // Create a new WebcastPushConnection object with the new username
            tiktokLiveConnection = new WebcastPushConnection(username);

            tiktokLiveConnection.connect().then(state => {
                console.info(`Connected to roomId ${state.roomId}`);
            }).catch(err => {
                console.error('Failed to connect', err);
            });

            tiktokLiveConnection.on('connected', (state) => {
                console.log('Hurray! Connected!', state);
            });

            tiktokLiveConnection.on('disconnected', () => {
                console.log('Disconnected :(');
            });

            tiktokLiveConnection.on('streamEnd', (actionId) => {
                console.log('Stream ended with actionId:', actionId);
                // Handle stream end event
            });

            tiktokLiveConnection.on('member', (data) => handleMemberJoin(ws, data));

            tiktokLiveConnection.on('gift', (data) => handleGift(ws, data));

            tiktokLiveConnection.on('like', (data) => handleLike(ws, data));

            tiktokLiveConnection.on('share', (data) => handleShare(ws, data));

            tiktokLiveConnection.on('envelope', (data) => handleEnvelope(ws, data));

            tiktokLiveConnection.on('chat', (data) => handleChat(ws, data));

            tiktokLiveConnection.on('websocketConnected', (websocketClient) => {
                console.log("Websocket:", websocketClient.connection);
            });

            tiktokLiveConnection.on('roomUser', (data) => {
                console.log(`Viewer Count: ${data}`);
            });
        }
    });

    // Handle WebSocket closure
    ws.on('close', () => {
        console.log('WebSocket connection closed.');
    });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
