import state from '/m/state.js'

function b(key, override, className, shift = false) {
  let shift_string = `'shift'`
  return `<div class="button ${
    className === undefined ? '' : className
  }" role="button" onclick="trigger('${
    override === undefined ? key : override
  }'${shift ? ',' + shift_string : ''})">${key}</div>`
}
function l(label) {
  return ` - ${label}`
}
function d(val) {
  return `<div>${val}</div>`
}

let qspace = `<div class="qspacer"></div>`
let hspace = `<div class="hspacer"></div>`
let space = `<div class="spacer"></div>`

function getDirSymbol(vim_key) {
  if (state.control_dirs === 'arrows') {
    if (vim_key === 'h') return '←'
    if (vim_key === 'j') return '↓'
    if (vim_key === 'k') return '↑'
    if (vim_key === 'l') return '→'
  } else {
    return vim_key
  }
}

function getVimFromDir(dir) {
  if (dir === 'left') return 'h'
  if (dir === 'right') return 'l'
  if (dir === 'up') return 'k'
  if (dir === 'down') return 'j'
}

let move_keys = (shift = false) => {
  let shift_value = shift ? true : undefined
  if (state.control_dirs === 'arrows') {
    return (
      b('←', 'arrowleft', undefined, shift_value) +
      b('↓', 'arrowdown', undefined, shift_value) +
      b('↑', 'arrowup', undefined, shift_value) +
      b('→', 'arrowright', undefined, shift_value)
    )
  } else {
    return (
      b('h', undefined, undefined, shift_value) +
      b('j', undefined, undefined, shift_value) +
      b('k', undefined, undefined, shift_value) +
      b('l', undefined, undefined, shift_value)
    )
  }
}

export function setControlDirs(val) {
  state.control_dirs = val
  renderHelp()
}

let hor_keys = ['h', 'l']
let ver_keys = ['j', 'k']

export function renderHelp() {
  let $help = state.$help

  let html = ``
  html += d(
    `Controls - show <span class="link ${
      state.control_dirs === 'arrows' ? 'active' : ''
    }" role="button" onclick="setControlDirs('arrows')">arrows</span> <span class="link ${
      state.control_dirs === 'vim' ? 'active' : ''
    }" role="button" onclick="setControlDirs('vim')">Vim</span>`
  )

  if (state.mode === 'move') {
    if (state.move_options !== null) {
      let confirm_key = getVimFromDir(state.move_options_dir)
      let cancel_key, choose_keys
      if (hor_keys.includes(confirm_key)) {
        cancel_key = hor_keys.filter(v => v !== confirm_key)[0]
        choose_keys = ver_keys
      } else {
        cancel_key = ver_keys.filter(v => v !== confirm_key)[0]
        choose_keys = hor_keys
      }
      html += hspace
      html += qspace
      html += d('Choose move')
      html += hspace
      html += d(b(getDirSymbol(confirm_key), confirm_key) + l('confirm move'))
      html += hspace
      html += d(
        choose_keys.map(k => b(getDirSymbol(k), k)).join(' ') +
          l('choose move slot')
      )
      html += hspace
      html += d(b(getDirSymbol(cancel_key), cancel_key) + l('cancel move'))
      html += space
    } else {
      html += hspace
      html += qspace
      html += d(
        '<span style="background: #ffaaff; padding-left: 0.5ch; padding-right: 0.5ch; margin-left: -0.25ch;">Move</span>'
      )
      html += hspace
      html += d(move_keys() + l('move cursor'))
      html += hspace
      html += d(b('enter') + l('split tile'))
      html += hspace
      html += d(
        b('shift + enter', 'enter', undefined, true) + l('split tile front')
      )
      html += hspace
      html += d(b('backspace') + l('delete tile'))
      html += hspace
      html += d(b('a') + l('select parent'))
      html += hspace
      html += d(b('shift +') + move_keys('shift') + l('move tile'))
      html += space
      html += d('Images')
      html += hspace
      html += d(b('o') + l('load image to tile'))
      html += hspace
      html += d(b('f') + l('set tile image fill type'))
      html += hspace
      html += d(b('x') + l('clear tile image'))
      html += space
      html += d('Mode')
      html += hspace
      html += d(b('r') + l('resize mode'))
      html += hspace
      html += d(b('t') + l(state.show_tree ? 'hide tree' : 'show tree'))
      html += space
      html += d('Undo')
      html += hspace
      html += d(b('z') + l('undo'))
      html += hspace
      html += d(b('shift + z', 'z', undefined, true) + l('redo'))
      html += space
      html += d('Save')
      html += hspace
      html += d(b('p') + l('download image'))
      html += hspace
      html += d(b('shift + p', 'p', undefined, true) + l('preview image'))
      html += space
      html += hspace
      html += d(
        '<a href="https://github.com/constraint-systems/tile" target="_blank">View source</a>'
      )
      html += qspace
      html += d(
        '<a href="https://constraint.systems" target="_blank">Constraint Systems</a>'
      )
      html += space
      html += hspace
      html += d(
        `Default images by <a href="https://unsplash.com/photos/qx-fv-jB0iM" target="_blank">Maddy Baker</a>, <a href="https://unsplash.com/photos/9kbsq91NFwg" target="_blank">Ganapathy Kumar</a>, and <a href="https://unsplash.com/photos/58pDwteN9b8" target="_blank">Marco Mons</a>`
      )
      html += space
    }
  } else if (state.mode === 'resize') {
    html += hspace
    html += qspace
    html += d(
      '<span style="background: #ccccff; padding-left: 0.5ch; padding-right: 0.5ch; margin-left: -0.25ch;">Resize</span>'
    )
    html += hspace
    html += d(b(getDirSymbol('l'), 'l') + l('wider'))
    html += hspace
    html += d(b(getDirSymbol('h'), 'h') + l('narrower'))
    html += hspace
    html += d(b(getDirSymbol('j'), 'j') + l('taller'))
    html += hspace
    html += d(b(getDirSymbol('k'), 'k') + l('shorter'))
    html += hspace
    html += d('hold ' + b('shift') + ' to resize by 1px')
    html += space
    html += d('Mode')
    html += hspace
    html += d(b('enter') + ' or ' + b('escape') + l('exit resize'))
    html += space
    html += d('Undo')
    html += hspace
    html += d(b('z') + l('undo'))
    html += hspace
    html += d(b('shift + z', 'z', undefined, true) + l('redo'))
    html += space
    html += d('Save')
    html += hspace
    html += d(b('p') + l('download image'))
    html += hspace
    html += d(b('shift + p', 'p', undefined, true) + l('preview image'))
    html += space
  }
  $help.innerHTML = html
}
