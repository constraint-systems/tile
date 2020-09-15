import state from '/m/state.js'
import {
  moveCursor,
  moveTile,
  wrapAndAddTile,
  removeTileAndClean,
  selectParent,
  resize,
  loadImage,
  setFillType,
  chooseOption,
  clearMoveOptions,
  confirmMoveTile,
  setPrintPreview,
  clearImage,
  saveImage,
  travelHistory,
  toggleTree,
  toggleHelp,
} from '/m/actions.js'
import render from '/m/render.js'
import { renderHelp } from '/m/help.js'

function combineArrow(key) {
  switch (key) {
    case 'h':
    case 'arrowleft':
      return 'h'
      break
    case 'j':
    case 'arrowdown':
      return 'j'
      break
    case 'k':
    case 'arrowup':
      return 'k'
      break
    case 'l':
    case 'arrowright':
      return 'l'
      break
  }
}

function setMode(mode) {
  state.mode = mode
  renderHelp()
}

function getDir(vim_key) {
  switch (vim_key) {
    case 'h':
      return 'left'
      break
    case 'j':
      return 'down'
      break
    case 'k':
      return 'up'
      break
    case 'l':
      return 'right'
      break
  }
}

export function keyAction(key, e) {
  switch (key) {
    case 'z':
      if (e.shiftKey) {
        travelHistory('forward')
      } else {
        travelHistory()
      }
      break
  }
  if (state.move_options) {
    // move options select special mode
    switch (key) {
      case 'arrowleft':
      case 'arrowup':
      case 'arrowdown':
      case 'arrowright':
      case 'h':
      case 'j':
      case 'k':
      case 'l':
        e.preventDefault()
        let vim_key = combineArrow(key)
        let dir = getDir(vim_key)
        chooseOption(dir)
        render()
        return
        break
      case 'shift':
        // do nothing
        break
      default:
        clearMoveOptions()
        render()
        return
        break
    }
  } else {
    if (key === 'p') {
      if (e.shiftKey) {
        setPrintPreview(!state.print_preview)
        console.log(JSON.stringify(state.tiles))
        render()
      } else {
        saveImage()
        render(false)
      }
    } else {
      if (state.print_preview) {
        setPrintPreview(false)
        render()
        return
      }
    }
    if (key === '?') {
      toggleHelp()
      render()
    }

    if (state.mode === 'resize') {
      switch (key) {
        case 'enter':
        case 'escape':
          setMode('move')
          render()
          break
        case 'arrowleft':
        case 'arrowup':
        case 'arrowdown':
        case 'arrowright':
        case 'h':
        case 'j':
        case 'k':
        case 'l':
          e.preventDefault()
          let vim_key = combineArrow(key)
          let dir = getDir(vim_key)
          let diff = [0, 0]
          if (dir === 'left') diff[0] = -1
          if (dir === 'up') diff[1] = -1
          if (dir === 'down') diff[1] = 1
          if (dir === 'right') diff[0] = 1
          if (e.shiftKey) {
            resize(diff, true)
          } else {
            resize(diff)
          }
          render()
          break
        case 't':
          toggleTree()
          renderHelp()
          render()
          break
      }
    } else if (state.mode === 'move') {
      switch (key) {
        case 'arrowleft':
        case 'arrowup':
        case 'arrowdown':
        case 'arrowright':
        case 'h':
        case 'j':
        case 'k':
        case 'l':
          e.preventDefault()
          let vim_key = combineArrow(key)
          let dir = getDir(vim_key)
          if (e.shiftKey) {
            moveTile(dir)
          } else {
            moveCursor(dir)
          }
          render()
          break
        case 'enter':
          if (e.shiftKey) {
            wrapAndAddTile(true)
          } else {
            wrapAndAddTile()
          }
          render()
          break
        case 'backspace':
          removeTileAndClean()
          render()
          break
        case 'o':
          loadImage()
          render()
          break
        case 'a':
          selectParent()
          render()
          break
        case 'r':
          setMode('resize')
          render()
          break
        case 'f':
          setFillType()
          render()
          break
        case 'x':
          clearImage()
          render()
          break
        case 't':
          toggleTree()
          renderHelp()
          render()
          break
      }
    }
  }
}

function downHandler(e) {
  state.km[e.key.toLowerCase()] = true
  keyAction(e.key.toLowerCase(), e)
}

function upHandler(e) {
  state.km[e.key.toLowerCase()] = false
}

export function initKeyboard() {
  window.addEventListener('keydown', downHandler)
  window.addEventListener('keyup', upHandler)
  window.trigger = function(key, shift = false) {
    key = key.toLowerCase()
    state.km[key] = true
    keyAction(key, { preventDefault: () => null, shiftKey: shift })
    setTimeout(() => {
      state.km[key] = false
    }, 200)
  }
}
