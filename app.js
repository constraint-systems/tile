import state from '/m/state.js'
import render from '/m/render.js'
import { initKeyboard } from '/m/keyboard.js'
import {
  setCanvasSizes,
  onDrag,
  onDrop,
  onPaste,
  mouseSelect,
  getByID,
  _loadImage,
} from '/m/actions.js'
import { renderHelp, setControlDirs } from '/m/help.js'

window.addEventListener('load', () => {
  // init
  let w = window.innerWidth
  let h = window.innerHeight

  // render canvas
  let rx = document.querySelector('#render').getContext('2d')
  state.rx = rx

  // base canvas
  let bx = document.createElement('canvas').getContext('2d')
  state.bx = bx

  // cursor canvas
  let cx = document.createElement('canvas').getContext('2d')
  state.cx = cx

  let adjust_w = w - 352 - 16 * 2 + 4
  let adjust_h = h - 16 * 2 - 20 + 4

  state.root_size = [adjust_w, adjust_h]
  rx.canvas.style.marginTop = 14 + 'px'
  rx.canvas.style.marginLeft = 14 + 'px'

  // layout is preset in state, loading images depends on it
  _loadImage(getByID(1), '/images/forest.jpg')
  _loadImage(getByID(3), '/images/moon.jpg')
  _loadImage(getByID(4), '/images/sea.jpg')
  _loadImage(getByID(5), '/images/forest.jpg')
  _loadImage(getByID(7), '/images/forest.jpg')
  _loadImage(getByID(15), '/images/forest.jpg')
  _loadImage(getByID(19), '/images/moon.jpg')
  _loadImage(getByID(21), '/images/moon.jpg')
  _loadImage(getByID(23), '/images/moon.jpg')

  // dom
  state.$tree = document.querySelector('#tree')
  state.$readout = document.querySelector('#readout')
  state.$help = document.querySelector('#help-content')
  state.$mode = document.querySelector('#mode')
  state.$main = document.querySelector('#main')
  state.$sidebar = document.querySelector('#sidebar')
  state.$sidebar_button = document.querySelector('#sidebar-button')

  // global functions
  window.setControlDirs = setControlDirs
  window.addEventListener('paste', onPaste)
  window.addEventListener('dragover', onDrag)
  window.addEventListener('drop', onDrop)
  rx.canvas.addEventListener('click', mouseSelect)
  initKeyboard()

  render()
  renderHelp()
})
