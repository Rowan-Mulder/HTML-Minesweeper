class Minesweeper {
    constructor(minefield, gameTimeCounter, minesLeft, gridSize, mineChance, uncoverSpeedMs, sounds, smileyChange, inputs) {
        this.gameData = {gameId: 1}
        this.gameEnded = false
        this.timerRunning = false
        this.firstClickDone = false
        this.exploredTiles = [] // Inefficient solution to inefficient recursive cross searching
        this.exploringTimer = null
        this.preventNextLMB = false // Seems to be required for quick-clearing surroundings as RMB and LMB events are independently triggered
        this.preventNextRMB = false // Same story as preventNextLMB
        this.markingsToggled = true // Adds optional ? marking (default)
        this.colorToggled = true
        this.sfxToggled = true
        this.sfxLoop = null // The interval limiting sound effects being played too fast when uncovering large fields
        this.endOfTurnFunctions = [] // Array of functionName:parameter functions to call after endOfTurn

        this.minefield = minefield
        this.gameTimeCounter = gameTimeCounter
        this.minesLeft = minesLeft
        this.gridSize = gridSize
        this.mineChance = mineChance
        this.uncoverSpeedMs = uncoverSpeedMs
        this.sounds = sounds
        this.smileyChange = smileyChange
        this.inputs = inputs

        this.init()
    }

    init() {
        this.placeMines()
        this.calcSurroundingMinesNumbers()
        this.hideAllTiles()
    }

    placeMines() {
        for (let y = 0; y < this.gridSize.y; y++) {
            let row = document.createElement("div")
            row.classList.add("row")
            this.minefield.append(row)

            for (let x = 0; x < this.gridSize.x; x++) {
                let tile = document.createElement("button")
                tile.classList.add("tile", "border-white-black")
                tile.addEventListener("click", (evt) => {
                    if (this.preventNextLMB) {
                        return
                    }

                    if (!this.gameEnded) {
                        let tile = this.minefield.children[y].children[x]
                        let containsFlag = false
                        let containsMine = false
                        Array.from(tile.children).forEach((x) => {
                            if (x.classList.contains("markingFlag")) {
                                containsFlag = true
                            }
                            if (x.classList.contains("mine")) {
                                containsMine = true
                            }
                        })

                        if (containsFlag) {
                            return
                        } else if (containsMine && evt.buttons === 0) {
                            if (!this.firstClickDone) { // Moves first clicked mine to a different spot. It doesn't make the rest of the game fair though.
                                let randomTile = this.getRandomTile(true)

                                let mineTile = tile.querySelector(".mine")
                                mineTile.classList.remove("mine")
                                mineTile.classList.remove("marking")
                                tile.classList.remove("tile-unsafe")
                                tile.classList.add("tile-safe")

                                if (randomTile === null) { // If it can't find any empty tiles after searching ten times the amount of current tiles, you're either really lucky or there aren't any empty tiles left.
                                    this.gameWin()
                                    return
                                }

                                this.clearSurroundingMinesNumber(Array.from(randomTile.parentElement.children).indexOf(randomTile), Array.from(randomTile.parentElement.parentElement.children).indexOf(randomTile.parentElement))

                                for (let innerTile of randomTile.children) {
                                    if (!innerTile.classList.contains("marking")) {
                                        innerTile.classList.add("mine")
                                        innerTile.classList.add("marking")
                                        randomTile.classList.remove("tile-safe")
                                        randomTile.classList.add("tile-unsafe")
                                        break
                                    }
                                }

                                this.calcSurroundingMinesNumbers()
                                this.uncoverCloseTiles(x, y)
                            } else {
                                this.gameOver(x, y)
                            }
                        } else if (evt.buttons === 0) {
                            this.uncoverCloseTiles(x, y)
                        } else if (evt.buttons === 2) {
                            this.quickClear(x, y)
                            this.preventNextRMB = true
                        }
                        this.firstClickDone = true
                    }
                })
                tile.addEventListener("mousedown", (evt) => {
                    if (evt.button === 1) { // Middle click
                        evt.preventDefault()

                        this.quickClear(x, y)
                    }
                })
                tile.addEventListener("contextmenu", (evt) => {
                    evt.preventDefault()

                    if ((evt.button === 2 && evt.buttons) === 0 || evt.pointerType) { // Right click on PC or long-press on touch/pen devices
                        if (this.preventNextRMB) {
                            return
                        }

                        if (!tile.classList.contains("tile-undiscovered")) {
                            return
                        }

                        // Cycles through markings (also clears up possible duplicates by potential bugs, hence the weird code)
                        let markings = (this.markingsToggled) ? ["markingFlag", "markingQuestionmark"] : ["markingFlag"]
                        let previousMarkingIndex = -1
                        if (tile.children.length > 1) {
                            Array.from(tile.children).forEach((x) => {
                                if (x.classList.contains("markingFlag")) {
                                    if (markings.indexOf("markingFlag") > previousMarkingIndex) {
                                        previousMarkingIndex = markings.indexOf("markingFlag")
                                    }
                                    x.remove()
                                }
                                if (x.classList.contains("markingQuestionmark")) {
                                    if (markings.indexOf("markingQuestionmark") > previousMarkingIndex) {
                                        previousMarkingIndex = markings.indexOf("markingQuestionmark")
                                    }
                                    x.remove()
                                }
                            })
                            if (previousMarkingIndex >= markings.length - 1) {
                                return
                            }
                        }
                        let marking = document.createElement("div")
                        marking.classList.add(`${markings[previousMarkingIndex + 1]}`)
                        marking.classList.add("inner-tile")
                        marking.classList.add("marking")
                        tile.append(marking)

                        this.updateMineCount()
                    }
                    if (evt.button === 2 && evt.buttons === 1) {
                        this.quickClear(x, y)
                        this.preventNextLMB = true
                    }
                })

                // Mine placement
                // TODO: improve tile placement algorithm to ensure input amount of mines will be present.
                if (Math.random() <= this.mineChance) {
                    let mineContainer = document.createElement("div")
                    mineContainer.classList.add("mine")
                    mineContainer.classList.add("marking")
                    mineContainer.classList.add("inner-tile")
                    tile.append(mineContainer)
                    tile.classList.add("tile-unsafe")
                } else {
                    let noMine = document.createElement("div")
                    noMine.classList.add("inner-tile")
                    tile.classList.add("tile-safe")
                    tile.append(noMine)
                }

                row.append(tile)
                this.updateMineCount()
            }
        }
    }

    getRandomTile(minesExcluded = false) {
        let tilesToCheck = (this.gridSize.y * this.gridSize.x) * 10 // Ten times the amount of current tiles (for those really difficult levels).
        let i = 0
        for (
            let randomTile = this.minefield.children[Math.floor(Math.random() * this.gridSize.y)].children[Math.floor(Math.random() * this.gridSize.x)];
            i < tilesToCheck;
            randomTile = this.minefield.children[Math.floor(Math.random() * this.gridSize.y)].children[Math.floor(Math.random() * this.gridSize.x)]
        ) {
            let containsMine = false
            Array.from(randomTile.children).forEach((x) => {
                if (x.classList.contains("mine")) {
                    containsMine = true
                }
            })
            if (!minesExcluded || !containsMine) {
                return randomTile
            }
            i++
        }
        return null
    }

    calcSurroundingMinesNumbers() {
        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.clearSurroundingMinesNumber(x, y)

                if (this.minefield.children[y].children[x].classList.contains("tile-safe")) {
                    let mineCheckArea = []
                    let mineCount = 0

                    if ((y - 1) >= 0) {
                        mineCheckArea.push(this.minefield.children[y - 1].children[x]) // UP
                        if ((x - 1) >= 0) {
                            mineCheckArea.push(this.minefield.children[y - 1].children[x - 1]) // UP-lEFT
                        }
                    }
                    if ((y + 1) < this.gridSize.y) {
                        mineCheckArea.push(this.minefield.children[y + 1].children[x]) // DOWN
                        if ((x + 1) < this.gridSize.x) {
                            mineCheckArea.push(this.minefield.children[y + 1].children[x + 1]) // DOWN-RIGHT
                        }
                    }
                    if ((x - 1) >= 0) {
                        mineCheckArea.push(this.minefield.children[y].children[x - 1]) // LEFT
                        if ((y + 1) < this.gridSize.y) {
                            mineCheckArea.push(this.minefield.children[y + 1].children[x - 1]) // DOWN-LEFT
                        }
                    }
                    if ((x + 1) < this.gridSize.x) {
                        mineCheckArea.push(this.minefield.children[y].children[x + 1]) // RIGHT
                        if ((y - 1) >= 0) {
                            mineCheckArea.push(this.minefield.children[y - 1].children[x + 1]) // UP-RIGHT
                        }
                    }

                    for (let tile of mineCheckArea) {
                        if (tile.querySelector(".mine")) {
                            mineCount++
                        }
                    }

                    if (mineCount > 0) {
                        for (let innerTile of this.minefield.children[y].children[x].children) {
                            if (!innerTile.classList.contains("marking")) {
                                innerTile.innerText = mineCount
                                innerTile.classList.add(`tile-color${mineCount}`)
                                break
                            }
                        }
                    }
                }
            }
        }
    }

    clearSurroundingMinesNumber(x, y) {
        if (x < 0 || y < 0) {
            console.error(`Invalid index for clearing surrounding mines number: x:${x},y:${y}`)
        }

        for (let innerTile of this.minefield.children[y].children[x].querySelectorAll(".inner-tile")) {
            if (!innerTile.classList.contains("marking")) {
                Array.from(innerTile.classList).forEach((tileContentClass) => {
                    if (tileContentClass.startsWith("tile-color")) {
                        innerTile.classList.remove(tileContentClass)
                        innerTile.innerText = ""
                    }
                })
                break
            }
        }
    }

    hideTile(x, y) {
        let tile = this.minefield.children[y].children[x]
        tile.firstChild.style.display = "none"
        tile.classList.add("tile-undiscovered")
    }

    showTile(x, y) {
        let tile = this.minefield.children[y].children[x]

        if (tile.querySelector(".mine")) {
            if (tile.querySelector(".markingQuestionmark")) {
                tile.querySelector(".markingQuestionmark").classList.add("animationBreathing")
            }
            if (tile.querySelector(".markingFlag")) {
                tile.querySelector(".mine").remove()
            }
        } else {
            if (tile.querySelector(".markingQuestionmark")) {
                if (this.gameEnded) {
                    if (tile.querySelector(".markingQuestionmark").classList.contains("animationFadeout")) {
                        tile.querySelector(".markingQuestionmark").remove()
                    } else {
                        tile.querySelector(".markingQuestionmark").classList.add("animationBreathing")
                    }
                } else {
                    if (!tile.querySelector(".markingQuestionmark").classList.contains("animationFadeout")) {
                        tile.querySelector(".markingQuestionmark").classList.add("animationFadeout")
                    }
                }
            }
            if (tile.querySelector(".markingFlag")) {
                if (this.gameEnded) {
                    if (tile.querySelector(".markingFlag").classList.contains("animationFadeout")) {
                        tile.querySelector(".markingFlag").remove()
                    } else {
                        tile.querySelector(".markingFlag").classList.add("animationFadeout")
                    }
                } else {
                    if (!tile.querySelector(".markingFlag").classList.contains("animationFadeout")) {
                        tile.querySelector(".markingFlag").classList.add("animationFadeout")
                    }
                }
            }
        }

        if (tile.classList.contains("tile-undiscovered")) {
            tile.firstChild.style.display = "inline-block"
            tile.classList.remove("tile-undiscovered")
            this.tileDiscovered()
        }
    }

    hideAllTiles() {
        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.hideTile(x, y)
            }
        }
    }

    showAllTiles() {
        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.showTile(x, y)
            }
        }
    }

    tileDiscovered() {
        if (this.gameEnded) {
            return
        }

        if (this.uncoverSpeedMs > 0) {
            if (this.sfxLoop === null) {
                this.sfxLoop = setInterval(() => { // Prevents the audio from looping too fast
                    this.playSound("sfx01")
                }, Math.max(this.uncoverSpeedMs, 90)) // This prevents it from looping the audio on a single tile
            }
        } else {
            if (this.endOfTurnFunctions.indexOf("playSound:sfx01") === -1) {
                this.endOfTurnFunctions.push("playSound:sfx01")
            }
        }
    }

    // Updates the visualized number of remaining mines
    updateMineCount() {
        let flagCount = this.minefield.querySelectorAll(".markingFlag").length
        let flagMarkingsFaded = this.minefield.querySelectorAll(".animationFadeout.markingFlag").length
        let mineCount = this.minefield.querySelectorAll(".mine").length - (flagCount - flagMarkingsFaded)
        if (mineCount >= 0) {
            this.minesLeft.innerText = "000".substr(mineCount.toString().length, 3) + mineCount
        } else {
            this.minesLeft.innerText = "-" + "00".substr(Math.abs(mineCount).toString().length, 3) + Math.abs(mineCount)
        }
    }

    gameOver(x, y) {
        this.stopTimer()
        this.gameEnded = true
        this.smileyChange("defeat")
        this.playSound("sfx03", 150)

        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.showTile(x, y)
                let tile = this.minefield.children[y].children[x]

                // Replaces incorrectly flagged tiles with crosses
                if (tile.children.length > 1) {
                    let isMineHere = false
                    let isFlagHere = false
                    Array.from(tile.children).forEach((x) => {
                        if (x.classList.contains("markingFlag")) {
                            isFlagHere = true
                        }
                        if (x.classList.contains("mine")) {
                            isMineHere = true
                        }
                    })
                    if (isFlagHere && isMineHere) {
                        tile.innerHTML = ""
                        let marking = document.createElement("div")
                        marking.classList.add("markingFlag")
                        marking.classList.add("inner-tile")
                        marking.classList.add("marking")
                        tile.append(marking)
                    }
                    if (isFlagHere && !isMineHere) {
                        tile.innerHTML = ""
                        let marking = document.createElement("div")
                        marking.classList.add("markingCross")
                        marking.classList.add("inner-tile")
                        marking.classList.add("marking")
                        tile.append(marking)
                    }
                }
            }
        }

        this.minefield.children[y].children[x].style.backgroundColor = "red"
        this.minefield.children[y].children[x].style.borderColor = "#F88 #800 #800 #F88"
    }

    gameWin() {
        this.stopTimer()
        this.gameEnded = true
        this.smileyChange("won")
        this.minesLeft.innerText = "000"
        this.playSound("sfx02", 150)

        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.showTile(x, y)

                /*/ Replaces unflagged mines with flags (Officially how it's implemented in w95, but could be a confusing summary when game has won)
                let tile = minefield.children[y].children[x]

                if (tile.firstChild.classList.contains("mine")) {
                    let isMineHere = false
                    let isFlagHere = false
                    Array.from(tile.children).forEach((tileContent) => {
                        if (tileContent.classList.contains("markingFlag")) {
                            isFlagHere = true
                            tileContent.remove()
                        }
                        if (tileContent.classList.contains("mine")) {
                            isMineHere = true
                        }
                    })
                    if (!isFlagHere && isMineHere) {
                        let marking = document.createElement("div")
                        marking.classList.add("markingFlag")
                        marking.classList.add("inner-tile")
                        marking.classList.add("marking")
                        tile.append(marking)
                    }
                }
                //*/
            }
        }
    }

    // TODO: 'mineChance' has to be changed into 'mines'. for every mine placed, place another mine based on probability and take remaining space/mines in account.
    gameRestart(options = null) {
        this.stopTimer()
        this.gameData.gameId++

        if (options) {
            let difficultyBeginnerCheck = document.getElementById("difficulty-beginner-check")
            let difficultyIntermediateCheck = document.getElementById("difficulty-intermediate-check")
            let difficultyExpertCheck = document.getElementById("difficulty-expert-check")
            let difficultyCustomCheck = document.getElementById("difficulty-custom-check")

            if (options.difficulty) {
                difficultyBeginnerCheck.innerText = (options.difficulty === "beginner") ? "✔" : ""
                difficultyIntermediateCheck.innerText = (options.difficulty === "intermediate") ? "✔" : ""
                difficultyExpertCheck.innerText = (options.difficulty === "expert") ? "✔" : ""
                difficultyCustomCheck.innerText = (options.difficulty === "custom") ? "✔" : ""

                switch (options.difficulty) {
                    case "beginner":
                        this.gridSize = {x: 15, y: 15}
                        this.mineChance = 0.1
                        this.inputs.inputWidth.value = this.gridSize.x
                        this.inputs.inputHeight.value = this.gridSize.y
                        this.inputs.inputMines.value = Math.round((this.gridSize.x * this.gridSize.y) * this.mineChance)
                        break
                    case "intermediate":
                        this.gridSize = {x: 30, y: 17}
                        this.mineChance = 0.15
                        this.inputs.inputWidth.value = this.gridSize.x
                        this.inputs.inputHeight.value = this.gridSize.y
                        this.inputs.inputMines.value = Math.round((this.gridSize.x * this.gridSize.y) * this.mineChance)
                        break
                    case "expert":
                        this.gridSize = {x: 45, y: 17}
                        this.mineChance = 0.25
                        this.inputs.inputWidth.value = this.gridSize.x
                        this.inputs.inputHeight.value = this.gridSize.y
                        this.inputs.inputMines.value = Math.round((this.gridSize.x * this.gridSize.y) * this.mineChance)
                        break
                }
            }

            if (options.gridSize) {
                this.gridSize = options.gridSize
            }
            if (options.mineChance) {
                this.mineChance = options.mineChance
            }
        }

        this.gameEnded = false
        this.firstClickDone = false
        this.exploredTiles = []

        this.minefield.innerHTML = ""
        this.gameTimeCounter.innerText = "000"
        this.smileyChange("regular")

        this.placeMines()
        this.calcSurroundingMinesNumbers()
        this.hideAllTiles()
    }

    startTimer() {
        if (!this.timerRunning) {
            this.timerRunning = true
            this.gameTimer = setInterval(() => {
                let newTime = Number(this.gameTimeCounter.innerText) + 1
                this.gameTimeCounter.innerText = "000".substr(newTime.toString().length, 3) + newTime

                if (newTime >= 999) {
                    this.stopTimer()
                }
            }, 1000)
        }
    }

    stopTimer() {
        if (this.timerRunning) {
            clearInterval(this.gameTimer)
            this.timerRunning = false
        }
    }

    playSound(name, delayInMs = 0, volume = 0.1) {
        if (!this.sfxToggled) {
            return
        }

        let foundSound = false
        Object.entries(this.sounds).forEach((x) => {
            if (x[0] === name) {
                foundSound = true
            }
        })
        if (!foundSound) {
            console.error(`Sound ${name} couldn't be found`)
            return
        }

        let sound = this.sounds[name].cloneNode(true)
        sound.volume = volume

        if (delayInMs > 0) {
            setTimeout(() => {
                sound.play()
            }, delayInMs)
        } else {
            sound.play()
        }
    }

    uncoverCloseTiles(x, y) {
        if (!this.timerRunning) {
            this.startTimer()
        }

        clearTimeout(this.exploringTimer)
        this.exploringTimer = setTimeout(() => {
            this.endOfTurn()
        }, 100 + this.uncoverSpeedMs)

        let currentGameId = this.gameData.gameId // Allows passing by value instead of reference. I'm a little rusty..
        this.recursiveCrossSearch(x, y, currentGameId)
    }

    recursiveCrossSearch(x, y, gameId) {
        /*/ Messing around
        let rgb = "110"
        this.minefield.children[y].children[x].style.backgroundColor = `rgba(${(rgb[0] == "1") ? Math.round(Math.random() * 255) : 0}, ${(rgb[1] == "1") ? Math.round(Math.random() * 255) : 0}, ${(rgb[2] == "1") ? Math.round(Math.random() * 255) : 0}, 0.1)`
        //*/

        // Stop exploring if tile is already explored, the game ended (a state when you clicked a mine) or a new game has started.
        if (this.exploredTiles.indexOf(`x:${x},y:${y}`) !== -1 || this.gameEnded || gameId !== this.gameData.gameId) {
            return
        }

        this.showTile(x, y)

        if (this.minefield.children[y].children[x].firstChild.innerText !== "") {
            return
        }

        let nextCrossSearches = []

        // Potential bug: It assumes firstChild is never a marking. Perhaps some browsers will deal with the element ordering differently.
        if ((y - 1) >= 0) {
            this.showTile(x, y - 1) // UP
            if (this.minefield.children[y - 1].children[x].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x},y:${y - 1}`) === -1) {
                    nextCrossSearches.push({x, y: y - 1})
                }
            }
            if ((x - 1) >= 0) {
                this.showTile(x - 1, y - 1) // UP-LEFT
                if (this.minefield.children[y - 1].children[x - 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x - 1},y:${y - 1}`) === -1) {
                        nextCrossSearches.push({x: x - 1, y: y - 1})
                    }
                }
            }
        }
        if ((y + 1) < this.gridSize.y) {
            this.showTile(x, y + 1) // DOWN
            if (this.minefield.children[y + 1].children[x].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x},y:${y + 1}`) === -1) {
                    nextCrossSearches.push({x, y: y + 1})
                }
            }
            if ((x + 1) < this.gridSize.x) {
                this.showTile(x + 1, y + 1) // DOWN-RIGHT

                if (this.minefield.children[y + 1].children[x + 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x + 1},y:${y + 1}`) === -1) {
                        nextCrossSearches.push({x: x + 1, y: y + 1})
                    }
                }
            }
        }
        if ((x - 1) >= 0) {
            this.showTile(x - 1, y) // LEFT
            if (this.minefield.children[y].children[x - 1].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x - 1},y:${y}`) === -1) {
                    nextCrossSearches.push({x: x - 1, y})
                }
            }
            if ((y + 1) < this.gridSize.y) {
                this.showTile(x - 1, y + 1) // DOWN-LEFT

                if (this.minefield.children[y + 1].children[x - 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x - 1},y:${y + 1}`) === -1) {
                        nextCrossSearches.push({x: x - 1, y: y + 1})
                    }
                }
            }
        }
        if ((x + 1) < this.gridSize.x) {
            this.showTile(x + 1, y) // RIGHT
            if (this.minefield.children[y].children[x + 1].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x + 1},y:${y}`) === -1) {
                    nextCrossSearches.push({x: x + 1, y})
                }
            }
            if ((y - 1) >= 0) {
                this.showTile(x + 1, y - 1) // UP-RIGHT

                if (this.minefield.children[y - 1].children[x + 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x + 1},y:${y - 1}`) === -1) {
                        nextCrossSearches.push({x: x + 1, y: y - 1})
                    }
                }
            }
        }

        for (let tile of nextCrossSearches) {
            if (!this.isCloseTilesUncovered(tile.x, tile.y)) {
                // for (let marking of this.minefield.children[tile.y].children[tile.x].querySelectorAll(".marking")) {
                //     marking.remove()
                // }

                if (this.uncoverSpeedMs > 0) {
                    setTimeout(() => {
                        clearTimeout(this.exploringTimer)
                        this.exploringTimer = setTimeout(() => {
                            this.endOfTurn()
                        }, 100 + this.uncoverSpeedMs)

                        this.recursiveCrossSearch(tile.x, tile.y, gameId)
                    }, this.uncoverSpeedMs)
                } else {
                    clearTimeout(this.exploringTimer)
                    this.exploringTimer = setTimeout(() => {
                        this.endOfTurn()
                    }, 100)

                    this.recursiveCrossSearch(tile.x, tile.y, gameId)
                }
            }
        }
    }

    // Clears surrounding tiles if its number aligns with the amount of marked flags
    quickClear(x, y) {
        if (this.minefield.children[y].children[x].classList.contains("tile-undiscovered")) {
            return
        }

        let clearList = []
        let mineCount = 0
        let flagCount = 0
        let tempContainsFlag = false

        if ((y - 1) >= 0) {
            // UP
            Array.from(this.minefield.children[y - 1].children[x].children).forEach((tileContent) => {
                if (tileContent.classList.contains("markingFlag")) {
                    flagCount++
                    tempContainsFlag = true
                }
                if (tileContent.classList.contains("mine")) {
                    mineCount++
                }
            })
            if (!tempContainsFlag) {
                clearList.push({x, y: y - 1})
            } else {
                tempContainsFlag = false
            }
            if ((x - 1) >= 0) {
                // UP-LEFT
                Array.from(this.minefield.children[y - 1].children[x - 1].children).forEach((tileContent) => {
                    if (tileContent.classList.contains("markingFlag")) {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (tileContent.classList.contains("mine")) {
                        mineCount++
                    }
                })
                if (!tempContainsFlag) {
                    clearList.push({x: x - 1, y: y - 1})
                } else {
                    tempContainsFlag = false
                }
            }
        }
        if ((y + 1) < this.gridSize.y) {
            // DOWN
            Array.from(this.minefield.children[y + 1].children[x].children).forEach((tileContent) => {
                if (tileContent.classList.contains("markingFlag")) {
                    flagCount++
                    tempContainsFlag = true
                }
                if (tileContent.classList.contains("mine")) {
                    mineCount++
                }
            })
            if (!tempContainsFlag) {
                clearList.push({x, y: y + 1})
            } else {
                tempContainsFlag = false
            }
            if ((x + 1) < this.gridSize.x) {
                // DOWN-RIGHT
                Array.from(this.minefield.children[y + 1].children[x + 1].children).forEach((tileContent) => {
                    if (tileContent.classList.contains("markingFlag")) {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (tileContent.classList.contains("mine")) {
                        mineCount++
                    }
                })
                if (!tempContainsFlag) {
                    clearList.push({x: x + 1, y: y + 1})
                } else {
                    tempContainsFlag = false
                }
            }
        }
        if ((x - 1) >= 0) {
            // LEFT
            Array.from(this.minefield.children[y].children[x - 1].children).forEach((tileContent) => {
                if (tileContent.classList.contains("markingFlag")) {
                    flagCount++
                    tempContainsFlag = true
                }
                if (tileContent.classList.contains("mine")) {
                    mineCount++
                }
            })
            if (!tempContainsFlag) {
                clearList.push({x: x - 1, y})
            } else {
                tempContainsFlag = false
            }
            if ((y + 1) < this.gridSize.y) {
                // DOWN-LEFT
                Array.from(this.minefield.children[y + 1].children[x - 1].children).forEach((tileContent) => {
                    if (tileContent.classList.contains("markingFlag")) {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (tileContent.classList.contains("mine")) {
                        mineCount++
                    }
                })
                if (!tempContainsFlag) {
                    clearList.push({x: x - 1, y: y + 1})
                } else {
                    tempContainsFlag = false
                }
            }
        }
        if ((x + 1) < this.gridSize.x) {
            // RIGHT
            Array.from(this.minefield.children[y].children[x + 1].children).forEach((tileContent) => {
                if (tileContent.classList.contains("markingFlag")) {
                    flagCount++
                    tempContainsFlag = true
                }
                if (tileContent.classList.contains("mine")) {
                    mineCount++
                }
            })
            if (!tempContainsFlag) {
                clearList.push({x: x + 1, y})
            } else {
                tempContainsFlag = false
            }
            if ((y - 1) >= 0) {
                // UP-RIGHT
                Array.from(this.minefield.children[y - 1].children[x + 1].children).forEach((tileContent) => {
                    if (tileContent.classList.contains("markingFlag")) {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (tileContent.classList.contains("mine")) {
                        mineCount++
                    }
                })
                if (!tempContainsFlag) {
                    clearList.push({x: x + 1, y: y - 1})
                } else {
                    tempContainsFlag = false
                }
            }
        }

        if (mineCount === flagCount) {
            let mineDetonated = null
            for (let tile of clearList) {
                this.uncoverCloseTiles(tile.x, tile.y)
                if (mineDetonated === null) {
                    Array.from(this.minefield.children[tile.y].children[tile.x].children).forEach((tileContent) => {
                        if (tileContent.classList.contains("mine")) {
                            mineDetonated = {x: tile.x, y: tile.y}
                        }
                    })
                }
            }
            if (mineDetonated) {
                this.gameOver(mineDetonated.x, mineDetonated.y)
            }
        }
    }

    endOfTurn() {
        this.updateMineCount()

        for (let fn of this.endOfTurnFunctions) {
            eval("this." + fn.split(":")[0])(fn.split(":")[1])
        }
        this.endOfTurnFunctions = []

        clearInterval(this.sfxLoop)
        this.sfxLoop = null

        if (this.minefield.querySelectorAll(".mine").length === this.minefield.querySelectorAll(".tile-undiscovered").length) {
            // Prevents triggering twice if you're going world record pace
            if (!this.gameEnded) {
                this.gameWin()
            }
        }
    }

    isCloseTilesUncovered(x, y) {
        if ((y - 1) >= 0) { // UP
            if (this.minefield.children[y - 1].children[x].classList.contains("tile-undiscovered")) {
                return false
            }
            if ((x - 1) >= 0) { // UP-LEFT
                if (this.minefield.children[y - 1].children[x - 1].classList.contains("tile-undiscovered")) {
                    return false
                }
            }
        }
        if ((y + 1) < this.gridSize.y) { // DOWN
            if (this.minefield.children[y + 1].children[x].classList.contains("tile-undiscovered")) {
                return false
            }
            if ((x + 1) < this.gridSize.x) { // DOWN-RIGHT
                if (this.minefield.children[y + 1].children[x + 1].classList.contains("tile-undiscovered")) {
                    return false
                }
            }
        }
        if ((x - 1) >= 0) { // LEFT
            if (this.minefield.children[y].children[x - 1].classList.contains("tile-undiscovered")) {
                return false
            }
            if ((y + 1) < this.gridSize.y) { // DOWN-LEFT
                if (this.minefield.children[y + 1].children[x - 1].classList.contains("tile-undiscovered")) {
                    return false
                }
            }
        }
        if ((x + 1) < this.gridSize.x) { // RIGHT
            if (this.minefield.children[y].children[x + 1].classList.contains("tile-undiscovered")) {
                return false
            }
            if ((y - 1) >= 0) { // UP-RIGHT
                if (this.minefield.children[y - 1].children[x + 1].classList.contains("tile-undiscovered")) {
                    return false
                }
            }
        }

        if (this.exploredTiles.indexOf(`x:${x},y:${y}`) === -1) {
            this.exploredTiles.push(`x:${x},y:${y}`)
        }
        return true
    }
}

export default Minesweeper