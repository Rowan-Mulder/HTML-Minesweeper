class Minesweeper {
    constructor(minefield, gameTimeCounter, minesLeft, gridSize, mineChance) {
        this.gameData = {gameId: 1}
        this.gameEnded = false
        this.timerRunning = false
        this.firstClickDone = false
        this.exploredTiles = [] // Inefficient solution to inefficient recursive cross searching
        this.exploringTimer = null
        this.preventNextLMB = false // Seems to be required for quick-clearing surroundings as RMB and LMB events are independently triggered
        this.preventNextRMB = false // Same story as preventNextLMB
        this.markingsToggled = true // Adds optional ? marking (default)

        this.minefield = minefield
        this.gameTimeCounter = gameTimeCounter
        this.minesLeft = minesLeft
        this.gridSize = gridSize
        this.mineChance = mineChance

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
                        let tile = minefield.children[y].children[x]
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

                                // TODO: (1/3) Assuming firstChild will always be a mine (among markings) feels wrong. Browsers could change behavior which could break this. This method isn't called that often, so a little less efficient code here for safety is acceptable.
                                tile.firstChild.classList.remove("mine")
                                tile.firstChild.classList.remove("marking")
                                tile.classList.add("tile-safe")
                                
                                if (randomTile === null) { // If it can't find any empty tiles after searching ten times the amount of current tiles, you're either really lucky or there aren't any empty tiles left.
                                    this.gameWin()
                                    return
                                }

                                // TODO: (2/3) Assuming firstChild will always be a mine (among markings) feels wrong. Browsers could change behavior which could break this. This method isn't called that often, so a little less efficient code here for safety is acceptable.
                                this.clearSurroundingMinesNumber(Array.from(randomTile.parentElement.children).indexOf(randomTile), Array.from(randomTile.parentElement.parentElement.children).indexOf(randomTile.parentElement))
                                randomTile.firstChild.classList.add("mine")
                                randomTile.firstChild.classList.add("marking")
                                randomTile.classList.remove("tile-safe")
                                
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
                tile.addEventListener("mouseup", (evt) => {
                    evt.preventDefault()

                    if (evt.button === 2 && evt.buttons === 0) { // Right click
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

                        // Updates the visualized number of remaining mines
                        let flagCount = this.minefield.querySelectorAll(".markingFlag").length
                        let mineCount = this.minefield.querySelectorAll(".mine").length - flagCount
                        if (mineCount >= 0) {
                            this.minesLeft.innerText = "000".substr(mineCount.toString().length, 3) + mineCount
                        } else {
                            this.minesLeft.innerText = "-" + "00".substr(Math.abs(mineCount).toString().length, 3) + Math.abs(mineCount)
                        }
                    }
                    if (evt.button === 2 && evt.buttons === 1) {
                        this.quickClear(x, y)
                        this.preventNextLMB = true
                    }
                })

                // Mine placement
                if (Math.random() <= this.mineChance) {
                    let mineContainer = document.createElement("div")
                    mineContainer.classList.add("mine")
                    mineContainer.classList.add("marking")
                    mineContainer.classList.add("inner-tile")
                    tile.append(mineContainer)
                    tile.classList.add("tile-unsafe")
                    let mineCount = Number(this.minesLeft.innerText) + 1
                    this.minesLeft.innerText = "000".substr(mineCount.toString().length, 3) + mineCount // TODO: This can be optimised by only being called once when minefield is done generating.
                } else {
                    let noMine = document.createElement("div")
                    noMine.classList.add("inner-tile")
                    tile.classList.add("tile-safe")
                    tile.append(noMine)
                }
                
                row.append(tile)
            }
        }
    }
    
    getRandomTile(minesExcluded = false) {
        let tilesToCheck = (this.gridSize.y * this.gridSize.x) * 10 // Ten times the amount of current tiles (for those really difficult levels).
        let i = 0
        for (
            let randomTile = minefield.children[Math.floor(Math.random() * this.gridSize.y)].children[Math.floor(Math.random() * this.gridSize.x)];
            i < tilesToCheck;
            randomTile = minefield.children[Math.floor(Math.random() * this.gridSize.y)].children[Math.floor(Math.random() * this.gridSize.x)]
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
                        // TODO: (3/3) Assuming firstChild will always be a mine (among markings) feels wrong. Browsers could change behavior which could break this. This method isn't called that often, so a little less efficient code here for safety is acceptable.
                        if (tile.firstChild.classList.contains("mine")) {
                            mineCount++
                        }
                    }
                    
                    if (mineCount > 0) {
                        this.minefield.children[y].children[x].firstChild.innerText = mineCount
                        this.minefield.children[y].children[x].firstChild.classList.add("tile-color" + mineCount)
                    } else {
                        this.minefield.children[y].children[x].firstChild.innerText = ""
                    }
                }
            }
        }
    }

    clearSurroundingMinesNumber(x, y) {
        let tileContent = null

        for (let innerTile of this.minefield.children[y].children[x].querySelectorAll(".inner-tile")) {
            if (!innerTile.classList.contains("marking")) {
                tileContent = innerTile
                break
            }
        }

        if (tileContent !== null) {
            Array.from(tileContent.classList).forEach((tileContentClass) => {
                if (tileContentClass.startsWith("tile-color")) {
                    tileContent.classList.remove(tileContentClass)
                    tileContent.innerText = ""
                }
            })
        }
    }
    
    hideTile(x, y) {
        let tile = this.minefield.children[y].children[x]
        tile.firstChild.style.display = "none"
        tile.classList.add("tile-undiscovered")
    }
    
    showTile(x, y) {
        let tile = this.minefield.children[y].children[x]
        tile.firstChild.style.display = "inline-block"
        tile.classList.remove("tile-undiscovered")
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

    gameOver(x, y) {
        this.stopTimer()
        this.gameEnded = true
        smileyChange("defeat")

        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.showTile(x, y)
                let tile = minefield.children[y].children[x]

                // Replaces incorrectly flagged tiles with crosses
                if (tile.children.length > 1) {
                    let isMineHere = false
                    let isFlagHere = false
                    Array.from(tile.children).forEach((x) => {
                        if (x.classList.contains("markingFlag")) {
                            isFlagHere = true
                            x.remove()
                        }
                        if (x.classList.contains("markingQuestionmark")) {
                            x.remove()
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

        minefield.children[y].children[x].style.backgroundColor = "red"
    }

    gameWin() {
        this.stopTimer()
        this.gameEnded = true
        smileyChange("won")
        
        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.showTile(x, y)

                /*/ Replaces unflagged mines with flags (Officially how it's implemented in w95, but could be a confusing summary when game has won)
                let tile = minefield.children[y].children[x]

                // TODO: Assumption firstChild is a mine. Change this.
                if (tile.firstChild.classList.contains("mine")) {
                    let isMineHere = false
                    let isFlagHere = false
                    Array.from(tile.children).forEach((tileContent) => {
                        if (tileContent.classList.contains("markingFlag")) {
                            isFlagHere = true
                            tileContent.remove()
                        }
                        if (tileContent.classList.contains("markingQuestionmark")) {
                            //tileContent.remove() // TODO: Don't remove it, rather add a breathing animation to show both the mine + marking
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

    // 'mineChance' has to be changed into 'mines'. for every mine placed, place another mine based on probability and take remaining space/mines in account.
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
                        this.gridSize = {x: 10, y: 10}
                        this.mineChance = 0.1
                        inputWidth.value = 10
                        inputHeight.value = 10
                        inputMines.value = (10 * 10) * 0.1
                        break
                    case "intermediate":
                        this.gridSize = {x: 20, y: 12}
                        this.mineChance = 0.15
                        inputWidth.value = 20
                        inputHeight.value = 12
                        inputMines.value = (20 * 12) * 0.15
                        break
                    case "expert":
                        this.gridSize = {x: 30, y: 12}
                        this.mineChance = 0.25
                        inputWidth.value = 30
                        inputHeight.value = 12
                        inputMines.value = (30 * 12) * 0.25
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
        this.minesLeft.innerText = "000"
        smileyChange("regular")
        
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
    
    uncoverCloseTiles(x, y) {
        if (!this.timerRunning) {
            this.startTimer()
        }

        clearTimeout(this.exploringTimer)
        this.exploringTimer = setTimeout(() => {
            this.endOfTurn()
        }, 100 + uncoverSpeedMs)

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
                // Possible bug: if uncoverSpeedMs == 0, some tiles may not be uncovered
                if (uncoverSpeedMs > 0) {
                    setTimeout(() => {
                        clearTimeout(this.exploringTimer)
                        this.exploringTimer = setTimeout(() => {
                            this.endOfTurn()
                        }, 100 + uncoverSpeedMs)

                        this.recursiveCrossSearch(tile.x, tile.y, gameId)
                    }, uncoverSpeedMs)
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

        // TODO: check if multidimensional loop tileContent conflicts between layers (I'm rusty)
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
                game.gameOver(mineDetonated.x, mineDetonated.y)
            }
        }
    }

    endOfTurn() {
        if (minefield.querySelectorAll(".mine").length === minefield.querySelectorAll(".tile-undiscovered").length) {
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




// Elements
let minesweeper = document.getElementById("minesweeper")
let restartButton = document.getElementById("restart-button")
let minefield = document.getElementById("minefield")
let gameTimeCounter = document.getElementById("game-time-counter")
let minesLeft = document.getElementById("mines-left")
let menus = document.getElementById("menus")
let gameMenu = document.getElementById("game-menu")
let helpMenu = document.getElementById("help-menu")
let customFieldPopupMenu = document.getElementById("custom-field-popup-menu")
let inputWidth = document.getElementById("input-width")
let inputHeight = document.getElementById("input-height")
let inputMines = document.getElementById("input-mines")
let recreationByMenu = document.getElementById("recreation-by-menu")
let aboutMinesweeperMenu = document.getElementById("about-minesweeper-menu")

// Settings
let gridSize = { x: 10, y: 10 }
let mineChance = 0.1
let uncoverSpeedMs = 40

let game = new Minesweeper(minefield, gameTimeCounter, minesLeft, gridSize, mineChance)



function restart(options = null) {
    closeMenuDropdown()
    game.gameRestart(options)
}

function toggleMarkings() {
    closeMenuDropdown()
    game.markingsToggled = !game.markingsToggled
    let markingsCheck = document.getElementById("markings-check")
    markingsCheck.innerText = (game.markingsToggled) ? "✔" : ""

    if (!game.markingsToggled) { // Hides all earlier placed ? markings
        this.minefield.querySelectorAll(".marking").forEach((marking) => {
            if (marking.classList.contains("markingQuestionmark")) {
                marking.classList.add("markingQuestionmarkHidden")
            }
        })
    } else { // Shows all earlier hidden ? markings
        this.minefield.querySelectorAll(".marking").forEach((marking) => {
            if (marking.classList.contains("markingQuestionmarkHidden")) {
                marking.classList.remove("markingQuestionmarkHidden")
            }
        })
    }

}

// Closes a specific dropdown when an element was provided from that dropdown menu. Otherwise it closes all dropdown menus.
function closeMenuDropdown(element = null) {
    menus.querySelectorAll("button").forEach((x) => {
        // Will be true if x is either an element within the menu or the menu itself or closes all menus if element is null
        if (!element || x.contains(element)) {
            x.blur()
        }
    })
}

function smileyChange(state) {
    switch (state) {
        case "regular":
            smiley.style.backgroundImage = "url(images/smiley.svg)" // 🙂
            break
        case "exited":
            smiley.style.backgroundImage = "url(images/smileyExcited.svg)" // 😮
            break
        case "won":
            smiley.style.backgroundImage = "url(images/smileyWon.svg)" // 😎
            break
        case "defeat":
            smiley.style.backgroundImage = "url(images/smileyDefeat.svg)" // 😵
            break
    }
}

function customFieldOpen() {
    closeMenuDropdown()
    customFieldPopupMenu.classList.remove("hidden")
}
function customFieldOK(element) {
    let width =  (!Number.isNaN(Number(inputWidth.value)))     ? Math.round(Math.max(Number(inputWidth.value ), 4)) : 4
    let height = (!Number.isNaN(Number(inputHeight.value), 4)) ? Math.round(Math.max(Number(inputHeight.value), 4)) : 4
    let mines =  (!Number.isNaN(Number(inputMines.value)))     ? Math.round(Math.min(Math.max(Number(inputMines.value), 1), (width * height) - 1)) : Math.round((width * height) * 0.1)
    let chance = mines / (width * height)

    restart({difficulty: 'custom', gridSize: {x: width, y: height}, mineChance: chance})
    closePopupWindow(element)

    inputWidth.value = width
    inputHeight.value = height
    inputMines.value = mines
}

function closePopupWindow(element) {
    element.closest(".window-popup").classList.add("hidden")
}

function recreationBy() {
    closeMenuDropdown()
    recreationByMenu.classList.toggle("hidden")
}
function aboutMinesweeper() {
    closeMenuDropdown()
    aboutMinesweeperMenu.classList.toggle("hidden")
}

document.addEventListener("mousedown", (evt) => {
    // Closes menu dropdowns when clicking the dropdown button while it's already open
    if (document.activeElement.closest("#menus") && evt.target.closest("#menus") && document.activeElement === evt.target) {
        setTimeout(() => {
            document.getElementById(document.activeElement.id).blur() // The handle to evt.target and document.activeElement have limited interaction. Also the blur has to be stalled slightly. This is a strange bodgefix.
        }, 0)
    }
})
minesweeper.addEventListener("mousedown", (evt) => {
    if (evt.target !== restartButton && evt.target !== smiley && !game.gameEnded)
        smileyChange("exited")
})
document.addEventListener("mouseup", (evt) => {
    if (!game.gameEnded)
        smileyChange("regular")

    if (game.preventNextLMB && evt.button === 0 && evt.buttons === 0) {
        setTimeout(() => {
            game.preventNextLMB = false
        }, 100)
    }
    if (game.preventNextRMB && evt.button === 2 && evt.buttons === 0) {
        setTimeout(() => {
            game.preventNextRMB = false
        }, 100)
    }
})
/*/ Triggers when the mouse leaves the window
document.documentElement.addEventListener("mouseleave", (evt) => {

})
//*/
// Triggers when the mouse enters the window
document.documentElement.addEventListener("mouseenter", (evt) => {
    // Let go of LMB/RMB outside of the window
    if (evt.button === 0 && evt.buttons === 0) {
        game.preventNextLMB = false
        game.preventNextRMB = false
    }
})
/*/
document.addEventListener('keypress', (evt) => {

})
//*/
document.addEventListener("contextmenu", (evt) => {
    // Disables right-click (context) menu
    evt.preventDefault()
})
window.onkeydown = ((evt) => {
    // Game-menu specific keybindings
    if (getComputedStyle(gameMenu.querySelector(".menu")).display === "block") {
        switch (evt.key) {
            case "n":
                restart()
                break
            case "b":
                restart({difficulty: 'beginner'})
                break
            case "i":
                restart({difficulty: 'intermediate'})
                break
            case "e":
                restart({difficulty: 'expert'})
                break
            case "c":
                customFieldOpen()
                break
            case "m":
                toggleMarkings()
                break
            case "l":
                // Color, not implemented yet
                break
            case "t":
                // Best Times, not implemented yet
                break
            case "x":
                closeMenuDropdown(gameMenu)
                break
        }
    }

    // Help-menu specific keybindings
    if (getComputedStyle(helpMenu.querySelector(".menu")).display === "block") {
        switch (evt.key) {
            case "r":
                recreationBy()
                break
            case "a":
                aboutMinesweeper()
                break
        }
    }

    // Global keybindings
    switch (evt.key) {
        case "F2":
            restart()
            break
    }
})





/* Notes
FIXME
    ...

TODO
    Simplify all for-loops and forEach searches now classes can be directly approached each tile
    Create images and use them instead of emoji's
        SVG: 7-segment display for mineCounter+gameTimer and light them up via an api (to prevent dependency and scaling issues)
    Settings menu for configurables
        Styling
            Tilesize
            W95 theme colors

OPTIONAL
    Minigame based on time where you mark mines to clear. Mines gradually will be added but also removed on mark and wrong mark will end the game?
*/