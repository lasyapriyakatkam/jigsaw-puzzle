document.addEventListener("DOMContentLoaded", function () {
    const stageWidth = 600;
    const stageHeight = 600;
    let rows = 3;
    let cols = 3;
    let snapDistance = 20;
    let imageObj = new Image();
    let stage = new Konva.Stage({
        container: 'container',
        width: stageWidth,
        height: stageHeight,
    });
    let layer = new Konva.Layer();
    stage.add(layer);
    let pieces = [];
    let originalPositions = [];

    document.getElementById('difficultySelect').addEventListener('change', function (e) {
        rows = parseInt(e.target.value);
        cols = parseInt(e.target.value);
        if (imageObj.src) {
            createPuzzle(imageObj);
        }
    });

    document.getElementById('snapDistance').addEventListener('input', function (e) {
        snapDistance = parseInt(e.target.value);
        document.getElementById('snapValue').textContent = snapDistance + 'px';
    });

    document.getElementById('newGameButton').addEventListener('click', function () {
        if (imageObj.src) {
            createPuzzle(imageObj);
        } else {
            showNotification("Please upload an image first!", "warning");
        }
    });

    function createPuzzlePiece(ctx, x, y, w, h) {
        const bezierIntensity = 0.2 * w;

        ctx.beginPath();
        ctx.moveTo(x, y);

        // Top edge
        if (y === 0) {
            ctx.lineTo(x + w / 3, y);
            ctx.bezierCurveTo(x + w / 2, y - bezierIntensity,
                x + w / 2, y - bezierIntensity,
                x + 2 * w / 3, y);
        }
        ctx.lineTo(x + w, y);

        // Right edge
        if (x < w * (cols - 1)) {
            ctx.lineTo(x + w, y + h / 3);
            ctx.bezierCurveTo(x + w + bezierIntensity, y + h / 2,
                x + w + bezierIntensity, y + h / 2,
                x + w, y + 2 * h / 3);
        }
        ctx.lineTo(x + w, y + h);

        // Bottom edge
        if (y < h * (rows - 1)) {
            ctx.lineTo(x + 2 * w / 3, y + h);
            ctx.bezierCurveTo(x + w / 2, y + h + bezierIntensity,
                x + w / 2, y + h + bezierIntensity,
                x + w / 3, y + h);
        }
        ctx.lineTo(x, y + h);

        // Left edge
        if (x === 0) {
            ctx.lineTo(x, y + 2 * h / 3);
            ctx.bezierCurveTo(x - bezierIntensity, y + h / 2,
                x - bezierIntensity, y + h / 2,
                x, y + h / 3);
        }
        ctx.lineTo(x, y);

        ctx.closePath();
        return ctx;
    }

    function createPuzzle(image) {
        layer.destroyChildren();
        pieces = [];
        originalPositions = [];

        let pieceWidth = image.width / cols;
        let pieceHeight = image.height / rows;
        let scale = Math.min(stageWidth / image.width, stageHeight / image.height);

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let canvas = document.createElement('canvas');
                canvas.width = pieceWidth;
                canvas.height = pieceHeight;
                let ctx = canvas.getContext('2d');

                createPuzzlePiece(ctx, 0, 0, pieceWidth, pieceHeight);
                ctx.clip();

                ctx.drawImage(image,
                    x * pieceWidth, y * pieceHeight, pieceWidth, pieceHeight,
                    0, 0, pieceWidth, pieceHeight);

                let pieceImage = new Image();
                pieceImage.src = canvas.toDataURL();

                let piece = new Konva.Image({
                    image: pieceImage,
                    x: x * pieceWidth * scale,
                    y: y * pieceHeight * scale,
                    width: pieceWidth * scale,
                    height: pieceHeight * scale,
                    draggable: true
                });

                piece.originalX = piece.x();
                piece.originalY = piece.y();
                originalPositions.push({x: piece.originalX, y: piece.originalY});

                piece.on('dragmove', function () {
                    let newX = this.x();
                    let newY = this.y();

                    if (newX < 0) newX = 0;
                    if (newY < 0) newY = 0;
                    if (newX + this.width() > stageWidth) newX = stageWidth - this.width();
                    if (newY + this.height() > stageHeight) newY = stageHeight - this.height();

                    this.position({x: newX, y: newY});
                });

                piece.on('dragend', function () {
                    if (trySnap(this)) {
                        layer.draw();
                    }
                    checkPuzzleCompletion();
                    updateProgress();
                });

                layer.add(piece);
                pieces.push(piece);
            }
        }
        layer.draw();
        updateProgress();
    }

    function trySnap(piece) {
        let closestPiece = null;
        let minDistance = snapDistance;

        let distToOriginal = Math.sqrt(
            Math.pow(piece.x() - piece.originalX, 2) +
            Math.pow(piece.y() - piece.originalY, 2)
        );

        if (distToOriginal < minDistance) {
            piece.position({
                x: piece.originalX,
                y: piece.originalY
            });
            return true;
        }

        pieces.forEach(otherPiece => {
            if (otherPiece === piece) return;

            let expectedPositions = [];

            if (piece.originalX + piece.width() === otherPiece.originalX) {
                expectedPositions.push({
                    x: otherPiece.x() - piece.width(),
                    y: otherPiece.y()
                });
            }
            if (piece.originalX === otherPiece.originalX + otherPiece.width()) {
                expectedPositions.push({
                    x: otherPiece.x() + otherPiece.width(),
                    y: otherPiece.y()
                });
            }
            if (piece.originalY + piece.height() === otherPiece.originalY) {
                expectedPositions.push({
                    x: otherPiece.x(),
                    y: otherPiece.y() - piece.height()
                });
            }
            if (piece.originalY === otherPiece.originalY + otherPiece.height()) {
                expectedPositions.push({
                    x: otherPiece.x(),
                    y: otherPiece.y() + otherPiece.height()
                });
            }

            expectedPositions.forEach(pos => {
                let distance = Math.sqrt(
                    Math.pow(piece.x() - pos.x, 2) +
                    Math.pow(piece.y() - pos.y, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPiece = pos;
                }
            });
        });

        if (closestPiece) {
            piece.position(closestPiece);
            return true;
        }

        return false;
    }

    function updateProgress() {
        let correctPieces = pieces.filter(piece =>
            Math.abs(piece.x() - piece.originalX) < 5 &&
            Math.abs(piece.y() - piece.originalY) < 5
        ).length;

        let progress = (correctPieces / pieces.length) * 100;
        document.querySelector('.progress-bar-fill').style.width = `${progress}%`;
    }

    function checkPuzzleCompletion() {
        let solved = pieces.every(piece =>
            Math.abs(piece.x() - piece.originalX) < 5 &&
            Math.abs(piece.y() - piece.originalY) < 5
        );

        if (solved) {
            showNotification("🎉 Congratulations! Puzzle Solved! 🎉", "success");
        }
    }

    function showNotification(message, type = 'success') {
        let notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.innerText = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    document.getElementById('shuffleButton').addEventListener('click', function () {
        pieces.forEach(piece => {
            let randomX = Math.random() * (stageWidth - piece.width());
            let randomY = Math.random() * (stageHeight - piece.height());
            piece.position({x: randomX, y: randomY});
        });
        layer.draw();
        updateProgress();
    });

    document.getElementById('solveButton').addEventListener('click', function () {
        pieces.forEach((piece, index) => {
            piece.position(originalPositions[index]);
        });
        layer.draw();
        updateProgress();
        showNotification("✔ Puzzle Solved Automatically!", "success");
    });

    document.getElementById('fileInput').addEventListener('change', function (event) {
        let file = event.target.files[0];
        if (file) {
            let reader = new FileReader();
            reader.onload = function (e) {
                imageObj.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    imageObj.onload = function () {
        createPuzzle(imageObj);
    };
});