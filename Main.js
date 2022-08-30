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
        this.marksToggled = true // Adds ? mark (default)

        this.minefield = minefield
        this.gameTimeCounter = gameTimeCounter
        this.minesLeft = minesLeft
        this.gridSize = gridSize
        this.mineChance = mineChance

        this.init()
    }
    
    init() {
        this.placeMines()
        this.calcSurroundingMines()
        this.hideAllCells()
    }
    
    placeMines() {
        for (let y = 0; y < this.gridSize.y; y++) {
            let row = document.createElement("div")
            row.classList.add("row")
            this.minefield.append(row)

            for (let x = 0; x < this.gridSize.x; x++) {
                let blokje = document.createElement("button")
                blokje.classList.add("blokje", "borderWhiteBlack")
                blokje.addEventListener("click", (evt) => {
                    if (this.preventNextLMB) {
                        return
                    }

                    if (!this.gameEnded) {
                        let blokje = minefield.children[y].children[x]
                        let containsFlag = false
                        let containsMine = false
                        Array.from(blokje.children).forEach((x) => {
                            if (x.innerText === "🚩") {
                                containsFlag = true
                            }
                            if (x.innerText === "💣") {
                                containsMine = true
                            }
                        })
                        
                        if (containsFlag) {
                            return
                        } else if (containsMine && evt.buttons === 0) {
                            if (!this.firstClickDone) { // Moves first clicked mine to a different spot. It doesn't make the rest of the game fair though.
                                let randomTile = this.getRandomTile(true)
                                
                                blokje.firstChild.innerText = ""
                                blokje.classList.remove("blokjeMine")
                                blokje.classList.add("blokjeSafe")
                                
                                if (randomTile === null) { // If it can't find any empty tiles after searching ten times the amount of current tiles, you're either really lucky or there aren't any empty tiles left.
                                    this.gameWin()
                                    return
                                }
                                randomTile.firstChild.innerText = "💣"
                                randomTile.classList.remove("blokjeSafe")
                                randomTile.classList.add("blokjeMine")
                                
                                this.calcSurroundingMines()
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
                blokje.addEventListener("mousedown", (evt) => {
                    if (evt.button === 1) { // Middle click
                        evt.preventDefault()

                        this.quickClear(x, y)
                    }
                })
                blokje.addEventListener("mouseup", (evt) => {
                    evt.preventDefault()

                    if (evt.button === 2 && evt.buttons === 0) { // Right click
                        if (this.preventNextRMB) {
                            return
                        }

                        if (!blokje.classList.contains("blokjeOnbekend")) {
                            return
                        }

                        // Cycles through markings (also clears up possible duplicates by potential bugs, hence the weird code)
                        let markings = (this.marksToggled) ? ["🚩", "❓"] : ["🚩"]
                        let previousMarkingIndex = -1
                        if (blokje.children.length > 1) {
                            Array.from(blokje.children).forEach((x) => {
                                if (x.classList.contains("marking")) {
                                    if (markings.indexOf(x.innerText) > previousMarkingIndex) {
                                        previousMarkingIndex = markings.indexOf(x.innerText)
                                    }
                                    x.remove()
                                }
                            })
                            if (previousMarkingIndex >= markings.length - 1) {
                                return
                            }
                        }
                        let marking = document.createElement("div")
                        marking.innerText = markings[previousMarkingIndex + 1]
                        if (marking.innerText === markings[1]) {
                            marking.style.filter = "sepia() saturate(50) hue-rotate(180deg)"
                        }
                        marking.classList.add("innerBlokje")
                        marking.classList.add("marking")
                        blokje.append(marking)
                    }
                    if (evt.button === 2 && evt.buttons === 1) {
                        this.quickClear(x, y)
                        this.preventNextLMB = true
                    }
                })

                if (Math.random() <= this.mineChance) {
                    let mineContainer = document.createElement("div")

                    mineContainer.innerHTML = "💣"
                    mineContainer.classList.add("innerBlokje")
                    blokje.classList.add("blokjeMine")
                    blokje.append(mineContainer)
                    let mineCount = Number(this.minesLeft.innerText) + 1
                    this.minesLeft.innerText = "000".substr(mineCount.toString().length, 3) + mineCount
                } else {
                    let noMine = document.createElement("div")
                    noMine.classList.add("innerBlokje")
                    blokje.classList.add("blokjeSafe")
                    blokje.append(noMine)
                }
                
                row.append(blokje)
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
                if (x.innerText === "💣") {
                    containsMine = true
                }
            })
            if (!minesExcluded || !containsMine) {
                return randomTile
                break
            }
            i++
        }
        return null
    }
    
    calcSurroundingMines() {
        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.clearSurroundingMinesNumber(x, y)

                if (this.minefield.children[y].children[x].classList.contains("blokjeSafe")) {
                    let mineCheckArea = []
                    let mineCount = 0

                    if ((y - 1) >= 0) {
                        mineCheckArea.push(this.minefield.children[y - 1].children[x])
                        if ((x - 1) >= 0) {
                            mineCheckArea.push(this.minefield.children[y - 1].children[x - 1])
                        }
                    }
                    if ((y + 1) < this.gridSize.y) {
                        mineCheckArea.push(this.minefield.children[y + 1].children[x])
                        if ((x + 1) < this.gridSize.x) {
                            mineCheckArea.push(this.minefield.children[y + 1].children[x + 1])
                        }
                    }
                    if ((x - 1) >= 0) {
                        mineCheckArea.push(this.minefield.children[y].children[x - 1])
                        if ((y + 1) < this.gridSize.y) {
                            mineCheckArea.push(this.minefield.children[y + 1].children[x - 1])
                        }
                    }
                    if ((x + 1) < this.gridSize.x) {
                        mineCheckArea.push(this.minefield.children[y].children[x + 1])
                        if ((y - 1) >= 0) {
                            mineCheckArea.push(this.minefield.children[y - 1].children[x + 1])
                        }
                    }
                    
                    for (let blokje of mineCheckArea) {
                        if (blokje.firstChild.innerText === "💣") {
                            mineCount++
                        }
                    }
                    
                    if (mineCount > 0) {
                        this.minefield.children[y].children[x].firstChild.innerText = mineCount
                        this.minefield.children[y].children[x].firstChild.classList.add("blokKleur" + mineCount)
                    } else {
                        this.minefield.children[y].children[x].firstChild.innerText = ""
                    }
                }
            }
        }
    }

    clearSurroundingMinesNumber(x, y) {
        let blokjeContent = null

        for (let innerBlokje of this.minefield.children[y].children[x].querySelectorAll(".innerBlokje")) {
            if (!innerBlokje.classList.contains("marking")) {
                blokjeContent = innerBlokje
                break
            }
        }

        if (blokjeContent !== null) {
            Array.from(blokjeContent.classList).forEach((blokjeContentClass) => {
                if (blokjeContentClass.startsWith("blokKleur")) {
                    blokjeContent.classList.remove(blokjeContentClass)
                }
            })
        }
    }
    
    hideCell(x, y) {
        let blokje = this.minefield.children[y].children[x]
        blokje.firstChild.style.display = "none"
        blokje.classList.add("blokjeOnbekend")
    }
    
    showCell(x, y) {
        let blokje = this.minefield.children[y].children[x]
        blokje.firstChild.style.display = "inline-block"
        blokje.classList.remove("blokjeOnbekend")
    }
    
    hideAllCells() {
        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.hideCell(x, y)
            }
        }
    }
    
    showAllCells() {
        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                this.showCell(x, y)
            }
        }
    }

    gameOver(x, y) {
        this.stopTimer()
        this.gameEnded = true
        smileyChange("defeat")

        for (let y = 0; y < this.gridSize.y; y++) {
            for (let x = 0; x < this.gridSize.x; x++) {
                let blokje = minefield.children[y].children[x]
                blokje.firstChild.style.display = "inline-block"
                blokje.classList.remove("blokjeOnbekend")

                // Replaces incorrectly flagged tiles with crosses
                if (blokje.children.length > 1) {
                    let isMineHere = false
                    let isFlagHere = false
                    Array.from(blokje.children).forEach((x) => {
                        if (x.innerText === "🚩") {
                            isFlagHere = true
                            x.remove()
                        }
                        if (x.innerText === "❓") {
                            x.remove()
                        }
                        if (x.innerText === "💣") {
                            isMineHere = true
                        }
                    })
                    if (isFlagHere && isMineHere) {
                        blokje.innerHTML = ""
                        let marking = document.createElement("div")
                        marking.innerText = "🚩"
                        marking.classList.add("innerBlokje")
                        marking.classList.add("marking")
                        blokje.append(marking)
                    }
                    if (isFlagHere && !isMineHere) {
                        blokje.innerHTML = ""
                        let marking = document.createElement("div")
                        marking.innerText = "❌"
                        marking.classList.add("innerBlokje")
                        marking.classList.add("marking")
                        blokje.append(marking)
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
                let blokje = minefield.children[y].children[x]
                blokje.firstChild.style.display = "inline-block"
                blokje.classList.remove("blokjeOnbekend")
                
                // Replaces mines with flags
                if (blokje.children.length > 1) {
                    let isMineHere = false
                    let isFlagHere = false
                    Array.from(blokje.children).forEach((x) => {
                        if (x.innerText === "🚩") {
                            isFlagHere = true
                            x.remove()
                        }
                        if (x.innerText === "❓") {
                            x.remove()
                        }
                        if (x.innerText === "💣") {
                            isMineHere = true
                        }
                    })
                    if (isFlagHere && isMineHere) {
                        blokje.innerHTML = ""
                        let marking = document.createElement("div")
                        marking.innerText = "🚩"
                        marking.classList.add("innerBlokje")
                        marking.classList.add("marking")
                        blokje.append(marking)
                    }
                }
            }
        }
    }

    // 'mineChance' has to be changed into 'mines'. for every mine placed, place another mine based on probability and take remaining space/mines in account.
    gameRestart(options = null) {
        this.stopTimer()
        this.gameData.gameId++

        if (options) {
            let difficultyBeginnerCheck = document.getElementById("difficultyBeginnerCheck")
            let difficultyIntermediateCheck = document.getElementById("difficultyIntermediateCheck")
            let difficultyExpertCheck = document.getElementById("difficultyExpertCheck")
            let difficultyCustomCheck = document.getElementById("difficultyCustomCheck")

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
        this.calcSurroundingMines()
        this.hideAllCells()
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
        
        this.showCell(x, y)
        
        if (this.minefield.children[y].children[x].firstChild.innerText !== "") {
            return
        }
        
        let nextCrossSearches = []
        
        // Potential bug: It assumes firstChild is never a marking. Perhaps some browsers will deal with the element ordering differently.
        if ((y - 1) >= 0) {
            this.showCell(x, y - 1) // UP
            if (this.minefield.children[y - 1].children[x].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x},y:${y - 1}`) === -1) {
                    nextCrossSearches.push({x, y: y - 1})
                }
            }
            if ((x - 1) >= 0) {
                this.showCell(x - 1, y - 1) // UP-LEFT
                if (this.minefield.children[y - 1].children[x - 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x - 1},y:${y - 1}`) === -1) {
                        nextCrossSearches.push({x: x - 1, y: y - 1})
                    }
                }
            }
        }
        if ((y + 1) < this.gridSize.y) {
            this.showCell(x, y + 1) // DOWN
            if (this.minefield.children[y + 1].children[x].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x},y:${y + 1}`) === -1) {
                    nextCrossSearches.push({x, y: y + 1})
                }
            }
            if ((x + 1) < this.gridSize.x) {
                this.showCell(x + 1, y + 1) // DOWN-RIGHT
                
                if (this.minefield.children[y + 1].children[x + 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x + 1},y:${y + 1}`) === -1) {
                        nextCrossSearches.push({x: x + 1, y: y + 1})
                    }
                }
            }
        }
        if ((x - 1) >= 0) {
            this.showCell(x - 1, y) // LEFT
            if (this.minefield.children[y].children[x - 1].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x - 1},y:${y}`) === -1) {
                    nextCrossSearches.push({x: x - 1, y})
                }
            }
            if ((y + 1) < this.gridSize.y) {
                this.showCell(x - 1, y + 1) // DOWN-LEFT
                
                if (this.minefield.children[y + 1].children[x - 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x - 1},y:${y + 1}`) === -1) {
                        nextCrossSearches.push({x: x - 1, y: y + 1})
                    }
                }
            }
        }
        if ((x + 1) < this.gridSize.x) {
            this.showCell(x + 1, y) // RIGHT
            if (this.minefield.children[y].children[x + 1].firstChild.innerText === "") {
                if (this.exploredTiles.indexOf(`x:${x + 1},y:${y}`) === -1) {
                    nextCrossSearches.push({x: x + 1, y})
                }
            }
            if ((y - 1) >= 0) {
                this.showCell(x + 1, y - 1) // UP-RIGHT
                
                if (this.minefield.children[y - 1].children[x + 1].firstChild.innerText === "") {
                    if (this.exploredTiles.indexOf(`x:${x + 1},y:${y - 1}`) === -1) {
                        nextCrossSearches.push({x: x + 1, y: y - 1})
                    }
                }
            }
        }
        
        for (let tile of nextCrossSearches) {
            if (!this.isCloseTilesUncovered(tile.x, tile.y)) {
                // Due to inefficient processing on higher scale, even a millisecond will massively impact time proces large empty areas.
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
        let clearList = []
        let mineCount = 0
        let flagCount = 0
        let tempContainsFlag = false

        if ((y - 1) >= 0) {
            // UP
            Array.from(this.minefield.children[y - 1].children[x].children).forEach((marking) => {
                if (marking.innerText === "🚩") {
                    flagCount++
                    tempContainsFlag = true
                }
                if (marking.innerText === "💣") {
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
                Array.from(this.minefield.children[y - 1].children[x - 1].children).forEach((marking) => {
                    if (marking.innerText === "🚩") {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (marking.innerText === "💣") {
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
            Array.from(this.minefield.children[y + 1].children[x].children).forEach((marking) => {
                if (marking.innerText === "🚩") {
                    flagCount++
                    tempContainsFlag = true
                }
                if (marking.innerText === "💣") {
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
                Array.from(this.minefield.children[y + 1].children[x + 1].children).forEach((marking) => {
                    if (marking.innerText === "🚩") {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (marking.innerText === "💣") {
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
            Array.from(this.minefield.children[y].children[x - 1].children).forEach((marking) => {
                if (marking.innerText === "🚩") {
                    flagCount++
                    tempContainsFlag = true
                }
                if (marking.innerText === "💣") {
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
                Array.from(this.minefield.children[y + 1].children[x - 1].children).forEach((marking) => {
                    if (marking.innerText === "🚩") {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (marking.innerText === "💣") {
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
            Array.from(this.minefield.children[y].children[x + 1].children).forEach((marking) => {
                if (marking.innerText === "🚩") {
                    flagCount++
                    tempContainsFlag = true
                }
                if (marking.innerText === "💣") {
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
                Array.from(this.minefield.children[y - 1].children[x + 1].children).forEach((marking) => {
                    if (marking.innerText === "🚩") {
                        flagCount++
                        tempContainsFlag = true
                    }
                    if (marking.innerText === "💣") {
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
                    Array.from(this.minefield.children[tile.y].children[tile.x].children).forEach((marking) => {
                        if (marking.innerText === "💣") {
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
        if (minefield.querySelectorAll(".blokjeMine").length === minefield.querySelectorAll(".blokjeOnbekend").length) {
            // Prevents triggering twice if you're going world record pace
            if (!this.gameEnded) {
                this.gameWin()
            }
        }
    }
    
    isCloseTilesUncovered(x, y) {
        if ((y - 1) >= 0) { // UP
            if (this.minefield.children[y - 1].children[x].classList.contains("blokjeOnbekend")) {
                return false
            }
            if ((x - 1) >= 0) { // UP-LEFT
                if (this.minefield.children[y - 1].children[x - 1].classList.contains("blokjeOnbekend")) {
                    return false
                }
            }
        }
        if ((y + 1) < this.gridSize.y) { // DOWN
            if (this.minefield.children[y + 1].children[x].classList.contains("blokjeOnbekend")) {
                return false
            }
            if ((x + 1) < this.gridSize.x) { // DOWN-RIGHT
                if (this.minefield.children[y + 1].children[x + 1].classList.contains("blokjeOnbekend")) {
                    return false
                }
            }
        }
        if ((x - 1) >= 0) { // LEFT
            if (this.minefield.children[y].children[x - 1].classList.contains("blokjeOnbekend")) {
                return false
            }
            if ((y + 1) < this.gridSize.y) { // DOWN-LEFT
                if (this.minefield.children[y + 1].children[x - 1].classList.contains("blokjeOnbekend")) {
                    return false
                }
            }
        }
        if ((x + 1) < this.gridSize.x) { // RIGHT
            if (this.minefield.children[y].children[x + 1].classList.contains("blokjeOnbekend")) {
                return false
            }
            if ((y - 1) >= 0) { // UP-RIGHT
                if (this.minefield.children[y - 1].children[x + 1].classList.contains("blokjeOnbekend")) {
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
let restartButton = document.getElementById("restartButton")
let minefield = document.getElementById("minefield")
let gameTimeCounter = document.getElementById("gameTimeCounter")
let minesLeft = document.getElementById("minesLeft")
let menus = document.getElementById("menus")
let gameMenu = document.getElementById("gameMenu")
let helpMenu = document.getElementById("helpMenu")
let customFieldPopupMenu = document.getElementById("customFieldPopupMenu")
let recreationByMenu = document.getElementById("recreationByMenu")
let aboutMinesweeperMenu = document.getElementById("aboutMinesweeperMenu")

// Settings
let gridSize = { x: 10, y: 10 }
let mineChance = 0.1
let uncoverSpeedMs = 40

let game = new Minesweeper(minefield, gameTimeCounter, minesLeft, gridSize, mineChance)


function restart(options = null) {
    closeMenuDropdown()
    game.gameRestart(options)
}

function toggleMarks() {
    closeMenuDropdown()
    game.marksToggled = !game.marksToggled
    let marksCheck = document.getElementById("marksCheck")
    marksCheck.innerText = (game.marksToggled) ? "✔" : ""

    // Removes all earlier placed ? marks

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
    element.closest(".windowPopup").classList.add("hidden")
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
// Triggers when the mouse leaves the window
// document.documentElement.addEventListener("mouseleave", (evt) => {
//
// })
// Triggers when the mouse enters the window
document.documentElement.addEventListener("mouseenter", (evt) => {
    // Let go of LMB/RMB outside of the window
    if (evt.button === 0 && evt.buttons === 0) {
        game.preventNextLMB = false
        game.preventNextRMB = false
    }
})
// document.addEventListener('keypress', (evt) => {
//
// })
document.addEventListener("contextmenu", (evt) => {
    // Disables right-click (context) menu
    evt.preventDefault()
})
window.onkeydown = ((evt) => {
    // Game menu specific shortcuts
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
                toggleMarks()
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



    // Global shortcuts
    switch (evt.key) {
        case "F2":
            restart()
            break
    }
})




/* Notes
FIXME
    It's possible to quick-clear undiscovered tiles and spam quick-clearing results in clearing area's that shouldn't be possible to clear.
    Clear ❓ and 🚩 on all forms of tile showing

TODO
    Continue work on the menus
        Help-menu:
            Add a link to my other projects in https://rowan-mulder.github.io/
    Create images and use them instead of emoji's
        SVG: 7-segment display for mineCounter+gameTimer and light them up via an api (to prevent dependency and scaling issues)
        PNG: Original w95 icons, nearest neighbour scaling. (test scaling on chome+firefox)

OPTIONAL
    Minigame based on time where you mark mines to clear. Mines gradually will be added but also removed on mark and wrong mark will end the game?
*/