import Minesweeper from './Minesweeper.js'
import Color from './Color.js'

// region Registering event listeners
// Alternative method of adding event listeners required because of scopes in ES6 modules
let htmlEvents = [
    { selector: '.click-about-minesweeper',      evtType: 'click', functionCall: aboutMinesweeper,     functionParams: [] },
    { selector: '.click-close-menu-dropdown',    evtType: 'click', functionCall: closeMenuDropdown,    functionParams: [] },
    { selector: '.click-close-popup-window',     evtType: 'click', functionCall: closePopupWindow,     functionParams: ['this'] },
    { selector: '.click-configurables-ok',       evtType: 'click', functionCall: configurablesOK,      functionParams: ['this'] },
    { selector: '.click-configurables-open',     evtType: 'click', functionCall: configurablesOpen,    functionParams: [] },
    { selector: '.click-configurables-reset',    evtType: 'click', functionCall: configurablesReset,   functionParams: [] },
    { selector: '.click-custom-field-ok',        evtType: 'click', functionCall: customFieldOK,        functionParams: ['this'] },
    { selector: '.click-custom-field-open',      evtType: 'click', functionCall: customFieldOpen,      functionParams: [] },
    { selector: '.click-recreation-by',          evtType: 'click', functionCall: recreationBy,         functionParams: [] },
    { selector: '.click-restart',                evtType: 'click', functionCall: restart,              functionParams: [] },
    { selector: '.click-restart-beginner',       evtType: 'click', functionCall: restart,              functionParams: [{difficulty: 'beginner'}] },
    { selector: '.click-restart-intermediate',   evtType: 'click', functionCall: restart,              functionParams: [{difficulty: 'intermediate'}] },
    { selector: '.click-restart-expert',         evtType: 'click', functionCall: restart,              functionParams: [{difficulty: 'expert'}] },
    { selector: '.click-toggle-color',           evtType: 'click', functionCall: toggleColor,          functionParams: [] },
    { selector: '.click-toggle-markings',        evtType: 'click', functionCall: toggleMarkings,       functionParams: [] },
    { selector: '.click-toggle-sfx',             evtType: 'click', functionCall: toggleSFX,            functionParams: [] },

    { selector: '.keyup-configurables-input',    evtType: 'keyup', functionCall: configurablesInput,   functionParams: [] },
    { selector: '.keyup-configurables-input-ok', evtType: 'keyup', functionCall: configurablesInputOk, functionParams: ['this'] },
    { selector: '.keyup-custom-field-input-ok',  evtType: 'keyup', functionCall: customFieldInputOk,   functionParams: ['this'] },
]

for (let htmlEvt of htmlEvents) {
    addHtmlEvent(htmlEvt.selector, htmlEvt.evtType, htmlEvt.functionCall, htmlEvt.functionParams)
}

function addHtmlEvent(selector, evtType, functionCall, functionParams) {
    for (let evtClass of document.querySelectorAll(selector)) {
        if (functionParams[0] === 'this') {
            evtClass.addEventListener(evtType, () => {functionCall(evtClass, event)})
        } else {
            evtClass.addEventListener(evtType, () => {functionCall(...functionParams)})
        }
    }
}
// endregion



// Elements
let minesweeper = document.getElementById("minesweeper")
let restartButton = document.getElementById("restart-button")
let smiley = document.getElementById("smiley")
let minefield = document.getElementById("minefield")
let gameTimeCounter = document.getElementById("game-time-counter")
let minesLeft = document.getElementById("mines-left")
let menus = document.getElementById("menus")
let gameMenu = document.getElementById("game-menu")
let helpMenu = document.getElementById("help-menu")
let recreationByMenu = document.getElementById("recreation-by-menu")
let aboutMinesweeperMenu = document.getElementById("about-minesweeper-menu")
let customFieldPopupMenu = document.getElementById("custom-field-popup-menu")
let inputWidth = document.getElementById("input-width")
let inputHeight = document.getElementById("input-height")
let inputMines = document.getElementById("input-mines")
let configurablesPopupMenu = document.getElementById("configurables-popup-menu")
let inputGameTileSize = document.getElementById("input-game-tile-size")
let inputGameSpacerWidth = document.getElementById("input-game-spacer-width")
let inputW95MenuSpacerWidth = document.getElementById("input-w95-menu-spacer-width")
let inputW95ThemeBgColor = document.getElementById("input-w95-theme-bg-color")
let inputW95ThemeButtonFgColor = document.getElementById("input-w95-theme-button-fg-color")
let inputW95ThemeButtonActiveBgColor = document.getElementById("input-w95-theme-button-active-bg-color")
let inputW95ThemeButtonActiveFgColor = document.getElementById("input-w95-theme-button-active-fg-color")

// Sounds
let sounds = {
    "sfx01": new Audio("audio/sfx01.mp3"),
    "sfx02": new Audio("audio/sfx02.mp3"),
    "sfx03": new Audio("audio/sfx03.mp3"),
}
Object.entries(sounds).forEach((sound) => {
    sound[1].load()
})

// Settings
let gridSize = { x: 15, y: 15 }
let mineChance = 0.1
let uncoverSpeedMs = 40
let inputs = {
    inputWidth,
    inputHeight,
    inputMines,
    inputGameTileSize,
    inputGameSpacerWidth,
    inputW95MenuSpacerWidth,
    inputW95ThemeBgColor,
    inputW95ThemeButtonFgColor,
    inputW95ThemeButtonActiveBgColor,
    inputW95ThemeButtonActiveFgColor
}

let game = new Minesweeper(minefield, gameTimeCounter, minesLeft, gridSize, mineChance, uncoverSpeedMs, sounds, smileyChange, inputs)

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
        game.minefield.querySelectorAll(".marking").forEach((marking) => {
            if (marking.classList.contains("markingQuestionmark")) {
                marking.classList.add("markingQuestionmarkHidden")
            }
        })
    } else { // Shows all earlier hidden ? markings
        game.minefield.querySelectorAll(".marking").forEach((marking) => {
            if (marking.classList.contains("markingQuestionmarkHidden")) {
                marking.classList.remove("markingQuestionmarkHidden")
            }
        })
    }

}

function toggleColor() {
    closeMenuDropdown()
    game.colorToggled = !game.colorToggled
    let colorCheck = document.getElementById("color-check")
    colorCheck.innerText = (game.colorToggled) ? "✔" : ""

    if (game.colorToggled) {
        document.querySelector("#game-container").classList.remove("desaturation")
    } else {
        document.querySelector("#game-container").classList.add("desaturation")
    }
}

function toggleSFX() {
    closeMenuDropdown()
    game.sfxToggled = !game.sfxToggled
    let sfxCheck = document.getElementById("sfx-check")
    sfxCheck.innerText = (game.sfxToggled) ? "✔" : ""
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
    setTimeout(() => {inputHeight.select()}, 0)
}
function customFieldOK(element) {
    // Input validation
    let width =  (!Number.isNaN(Number(inputWidth.value)))  ? Math.round(Math.max(Number(inputWidth.value ), 4)) : 4
    let height = (!Number.isNaN(Number(inputHeight.value))) ? Math.round(Math.max(Number(inputHeight.value), 4)) : 4
    let mines =  (!Number.isNaN(Number(inputMines.value)))  ? Math.round(Math.min(Math.max(Number(inputMines.value), 1), (width * height) - 1)) : Math.round((width * height) * 0.1)
    let chance = mines / (width * height)

    restart({difficulty: 'custom', gridSize: {x: width, y: height}, mineChance: chance})
    closePopupWindow(element)

    // Replacing input with validated input
    inputWidth.value = width
    inputHeight.value = height
    inputMines.value = mines
}
function customFieldInputOk(element, event) {
    if (event.key === "Enter") {
        customFieldOK(element)
    }
}

function configurablesOpen() {
    closeMenuDropdown()
    configurablesPopupMenu.classList.remove("hidden")
    setTimeout(() => {inputGameTileSize.select()}, 0)
}
function configurablesInput() {
    switch(event.key) {
        case " ":
        case "Enter":
            configurablesOpen()
            break;
    }
}
function configurablesOK(element) {
    // Input validation
    let gameTileSize = (!Number.isNaN(Number(inputGameTileSize.value))) ? Math.round(Math.max(Number(inputGameTileSize.value), 5)) : 40
    let gameSpacerWidth = (!Number.isNaN(Number(inputGameSpacerWidth.value))) ? Math.round(Math.max(Number(inputGameSpacerWidth.value), 0)) : 3
    let w95MenuSpacerWidth = (!Number.isNaN(Number(inputW95MenuSpacerWidth.value))) ? Math.round(Math.max(Number(inputW95MenuSpacerWidth.value), 0)) : 2
    let w95ThemeBgColor = inputW95ThemeBgColor.value
    let w95ThemeBorderColorTopleft = new Color(inputW95ThemeBgColor.value).brighten(1.4)
    let w95ThemeBorderColorBottomright = new Color(inputW95ThemeBgColor.value).brighten(0.35)
    let w95ThemeButtonFgColor = inputW95ThemeButtonFgColor.value
    let w95ThemeButtonActiveBgColor = inputW95ThemeButtonActiveBgColor.value
    let w95ThemeButtonActiveFgColor = inputW95ThemeButtonActiveFgColor.value

    closePopupWindow(element)

    let docElStyle = document.documentElement.style
    docElStyle.setProperty("--game-tile-size", `${gameTileSize}px`)
    docElStyle.setProperty("--game-spacer-width", `${gameSpacerWidth}px`)
    docElStyle.setProperty("--w95-menu-spacer-width", `${w95MenuSpacerWidth}px`)
    docElStyle.setProperty("--w95-theme-bg-color", w95ThemeBgColor)
    docElStyle.setProperty("--w95-theme-border-color-topleft", w95ThemeBorderColorTopleft)
    docElStyle.setProperty("--w95-theme-border-color-bottomright", w95ThemeBorderColorBottomright)
    docElStyle.setProperty("--w95-theme-button-fg-color", w95ThemeButtonFgColor)
    docElStyle.setProperty("--w95-theme-button-active-bg-color", w95ThemeButtonActiveBgColor)
    docElStyle.setProperty("--w95-theme-button-active-fg-color", w95ThemeButtonActiveFgColor)

    // Replacing input with validated input
    inputGameTileSize.value = gameTileSize
    inputGameSpacerWidth.value = gameSpacerWidth
    inputW95MenuSpacerWidth.value = w95MenuSpacerWidth

    // Balancing contrast
    let bgLuminosity = new Color(w95ThemeBgColor).toHSL().l
    if (bgLuminosity < 50) {
        docElStyle.setProperty("--contrast-color", "#FFFFFF")
        document.querySelector(".settings-icon").classList.add("color-invert")
    } else {
        docElStyle.setProperty("--contrast-color", "#000000")
        document.querySelector(".settings-icon").classList.remove("color-invert")
    }
}
function configurablesInputOk(element, event) {
    if (event.key === "Enter") {
        configurablesOK(element)
    }
}
function configurablesReset() {
    inputGameTileSize.value = 40
    inputGameSpacerWidth.value = 3
    inputW95MenuSpacerWidth.value = 2
    inputW95ThemeBgColor.value = "#C0C0C0"
    inputW95ThemeButtonFgColor.value = "#030303"
    inputW95ThemeButtonActiveBgColor.value = "#000080"
    inputW95ThemeButtonActiveFgColor.value = "#FCFCFC"

    let docElStyle = document.documentElement.style
    docElStyle.setProperty("--game-tile-size", "40px")
    docElStyle.setProperty("--game-spacer-width", "3px")
    docElStyle.setProperty("--w95-menu-spacer-width", "2px")
    docElStyle.setProperty("--w95-theme-bg-color", "#C0C0C0")
    docElStyle.setProperty("--w95-theme-border-color-topleft", new Color(inputW95ThemeBgColor.value).brighten(1.4))
    docElStyle.setProperty("--w95-theme-border-color-bottomright", new Color(inputW95ThemeBgColor.value).brighten(0.35))
    docElStyle.setProperty("--w95-theme-button-fg-color", "#030303")
    docElStyle.setProperty("--w95-theme-button-active-bg-color", "#000080")
    docElStyle.setProperty("--w95-theme-button-active-fg-color", "#FCFCFC")
    docElStyle.setProperty("--contrast-color", "#000000")

    document.querySelector(".settings-icon").classList.remove("color-invert")
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
    if (document.activeElement.closest("#menus") && !evt.target.closest(".settings-icon") && evt.target.closest("#menus") && document.activeElement === evt.target) {
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
                toggleColor()
                break
            case "s":
                toggleSFX()
                break
            case "t":
                // Best Times, not implemented yet
                break
            case "x":
            case "Escape":
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
            case "Escape":
                closeMenuDropdown(helpMenu)
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

// Adds event to all popup-windows to allow closing it when pressing the escape key while focused
document.querySelectorAll(".window-popup").forEach((popupWindow) => {
    popupWindow.setAttribute("tabindex", "-1") // Allows element to be focusable, required for key-events
    popupWindow.addEventListener("keydown", (evt) => {
        if (evt.key === "Escape") {
            closePopupWindow(evt.target)
        }
    })
})







/* Notes
TODO
    Highscores
    Browser cookie to remember preferences and highscores
    Add settings to preferences
        simply click to uncover close tiles (if the surrounding mines match with flag amount), in addition to LMB+RMB/RMB+LMB/MMB/longpress
    Create images and use them instead of emoji's
        SVG: 7-segment display for mineCounter+gameTimer and light them up via an api (to prevent dependency and scaling issues)
        Minecount numbers 1-8
    Tweak custom minefield to accurately place input amount of mines
        Random tile placement will prevent patterns but processing time will be bound to mine to tile ratio
            To solve all problems, an algoritm needs to tweak the RNG for likelyness of placing a mine.
                In theory, the only problem this may cause is near guaranteed mines on the last 1-2 tiles

OPTIONAL
    Minigame based on time where you mark mines to clear. Mines gradually will be added but also removed on mark and wrong mark will end the game?
    Prevent double-tap zoom on mobile (it doesn't seem possible to seperate functionalities double-tap zoom and pinch-zooming, possibly due to this game deviating too far from normal web standards)
    Movable windows
*/
