const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#f0f0f0',
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    }
};

const game = new Phaser.Game(config);

let bigBar, smallBar, dot, startButton, retryButton, scoreText, achievementsText, particles, emitter;
let smallBarSpeed = 2;
let dotMoveRightSpeed = 4;
let dotMoveLeftSpeed = 3;
let gameOver = false;
let gameStarted = false;
let moveRightOnClick = false;
let score = 0;
let timeInGame = 0;
let achievementThresholds = [25];
let nextThreshold = 60;
let achievementMessages = ["Awesome!", "Nice!", "Yo!", "Rad!"];
let currentThresholdIndex = 0;

//--------------
// Load assets
//--------------
function preload() {
    this.load.video('bg', 'assets/bg.mp4');
    this.load.audio('wave', 'assets/wave.wav');
    this.load.audio('bgMusic', 'assets/bg.wav');
    this.load.image('countdown1', 'assets/1.png');
    this.load.image('countdown2', 'assets/2.png');
    this.load.image('countdown3', 'assets/3.png');
    this.load.image('startButton', 'assets/start.png');
    this.load.image('gameOver', 'assets/GAMEOVER.png');
    this.load.audio('beep', 'assets/beep.wav');
    this.load.audio('gameOverSound', 'assets/gameover.wav');
    this.load.audio('click', 'assets/click.wav');
    this.load.audio('start', 'assets/start.wav');
    this.load.audio('hit', 'assets/hit.wav');
}

//--------------
// Create game objects
//--------------
function create() {
    const bgVideo = this.add.video(this.cameras.main.centerX, this.cameras.main.centerY, 'bg');
    bgVideo.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
    bgVideo.setLoop(true);
    bgVideo.play();
    
    this.sound.add('wave').play({ loop: true });

    particles = this.add.particles(0, 0, 0x00ff00, 50);
    emitter = particles.createEmitter({
        x: this.cameras.main.centerX,
        y: this.cameras.main.centerY,
        speed: 100,
        lifespan: 500,
        blendMode: 'ADD',
        scale: { start: 0.4, end: 0 },
        quantity: 5,
        frequency: 50
    });

    bigBar = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 800, 20, 0x808080);
    smallBar = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 150, 20, 0xff0000);
    dot = this.add.circle(this.cameras.main.centerX, this.cameras.main.centerY, 10, 0xffff00);

    startButton = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY + 150, 'startButton')
        .setInteractive()
        .setOrigin(0.5, 0.5)
        .on('pointerdown', () => {
            this.sound.play('click');
            startGame.call(this);
        })
        .on('pointerover', () => {
            this.input.setDefaultCursor('pointer');
        })
        .on('pointerout', () => {
            this.input.setDefaultCursor('auto');
        });

    retryButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 250, 'Retry', { 
        fontFamily: 'Permanent Marker', 
        fontSize: '50px', 
        fill: '#00ff00', 
        stroke: '#000000', 
        strokeThickness: 10 
    })
    .setInteractive()
    .setVisible(false)
    .setOrigin(0.5, 0.5)
    .on('pointerdown', () => {
        location.reload();
    })
    .on('pointerover', () => {
        this.input.setDefaultCursor('pointer');
    })
    .on('pointerout', () => {
        this.input.setDefaultCursor('auto');
    });

    scoreText = this.add.text(10, 10, 'Score: 0', {
        fontFamily: 'Permanent Marker',
        fontSize: '50px',
        fill: '#00ff00',
        stroke: '#000000',
        strokeThickness: 10
    });

    achievementsText = this.add.text(this.cameras.main.centerX, 100, '', {
        fontFamily: 'Permanent Marker',
        fontSize: '50px',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 10,
        fontWeight: 'normal'
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.input.on('pointerdown', () => {
        if (gameStarted && !gameOver) {
            moveRightOnClick = true;
            this.sound.play('click');
        }
    });

    this.input.on('pointerup', () => {
        if (gameStarted && !gameOver) {
            moveRightOnClick = false;
        }
    });

    this.input.on('pointerout', () => {
        this.input.setDefaultCursor('auto');
    });

    window.addEventListener('resize', resizeGame.bind(this));
}

//--------------
// Start the game
//--------------
function startGame() {
    this.sound.play('start');
    const bgMusic = this.sound.add('bgMusic');
    bgMusic.play({ loop: true });

    gameStarted = false;
    startButton.setVisible(false);
    retryButton.setVisible(false);
    score = 0;
    timeInGame = 0;
    scoreText.setText('Score: ' + score);
    dot.x = this.cameras.main.centerX;

    const countdownImages = ['countdown3', 'countdown2', 'countdown1'];
    let countdownIndex = 0;
    let currentImage;

    const countdownInterval = setInterval(() => {
        if (currentImage) {
            currentImage.destroy();
        }

        if (countdownIndex < countdownImages.length) {
            currentImage = this.add.image(this.cameras.main.centerX, 50, countdownImages[countdownIndex])
                .setScale(0.5);
            this.sound.play('beep');
            countdownIndex++;
        } else {
            clearInterval(countdownInterval);
            this.input.once('pointerdown', () => {
                gameStarted = true;
                moveRightOnClick = (smallBarSpeed > 0);
                if (currentImage) currentImage.destroy();
            });
        }
    }, 1000);
}

//--------------
// Game update loop
//--------------
function update(time, delta) {
    if (gameOver || !gameStarted) return;

    smallBar.x += smallBarSpeed;

    const bigBarLeftBoundary = bigBar.x - bigBar.width / 2;
    const bigBarRightBoundary = bigBar.x + bigBar.width / 2;

    if (smallBar.x < bigBarLeftBoundary + smallBar.width / 2) {
        smallBar.x = bigBarLeftBoundary + smallBar.width / 2;
        smallBarSpeed *= -1;
        this.sound.play('hit');
    } else if (smallBar.x > bigBarRightBoundary - smallBar.width / 2) {
        smallBar.x = bigBarRightBoundary - smallBar.width / 2;
        smallBarSpeed *= -1;
        this.sound.play('hit');
    }

    if (moveRightOnClick) {
        dot.x += dotMoveRightSpeed;
    } else {
        dot.x -= dotMoveLeftSpeed;
    }

    if (dot.x < 25) dot.x = 25;
    if (dot.x > this.cameras.main.width - 25) dot.x = this.cameras.main.width - 25;

    const dotLeft = dot.x - dot.radius;
    const dotRight = dot.x + dot.radius;
    const smallBarLeft = smallBar.x - smallBar.width / 2;
    const smallBarRight = smallBar.x + smallBar.width / 2;

    const insideSmallBar = !(dotRight < smallBarLeft || dotLeft > smallBarRight);

    if (insideSmallBar) {
        timeInGame += delta;
        if (timeInGame >= 1000) {
            score += 1;
            timeInGame = 0;
            scoreText.setText('Score: ' + score);

            if (score >= achievementThresholds[currentThresholdIndex]) {
                achievementsText.setText(achievementMessages[currentThresholdIndex % achievementMessages.length]).setVisible(true);
                setTimeout(() => achievementsText.setVisible(false), 3000);

                currentThresholdIndex++;
                if (currentThresholdIndex < achievementThresholds.length) {
                    nextThreshold = achievementThresholds[currentThresholdIndex - 1] * 2 + 10;
                } else {
                    nextThreshold = achievementThresholds[achievementThresholds.length - 1] * 2 + 10;
                }
                achievementThresholds.push(nextThreshold);
            }
        }
    } else {
        endGame.call(this);
    }

    emitter.setPosition(dot.x, dot.y);
}

//--------------
// End the game
//--------------
function endGame() {
    gameOver = true;
    scoreText.setText('Final Score: ' + score);
    retryButton.setVisible(true);
    this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'gameOver').setOrigin(0.5, 0.5).setScale(0.5);
    this.sound.play('gameOverSound');
}

//--------------
// Resize game
//--------------
function resizeGame() {
    const canvas = document.querySelector('canvas');
    const { width, height } = this.scale;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    bigBar.x = this.cameras.main.centerX;
    bigBar.y = this.cameras.main.centerY;

    smallBar.x = this.cameras.main.centerX;
    smallBar.y = this.cameras.main.centerY;

    dot.x = this.cameras.main.centerX;
    dot.y = this.cameras.main.centerY;

    scoreText.setPosition(10, 10);
    achievementsText.setPosition(this.cameras.main.centerX, 100);
    startButton.setPosition(this.cameras.main.centerX, this.cameras.main.centerY + 150);
    retryButton.setPosition(this.cameras.main.centerX, this.cameras.main.centerY + 250);
}
