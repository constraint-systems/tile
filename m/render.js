import state from '/m/state.js'
import { getByID, getDimsByID, getActive, getAllLeaves } from '/m/actions.js'
import images from '/m/images.js'
import { addHistory } from '/m/actions.js'
import history from '/m/history.js'

function fillImage(tile, x, y, w, h) {
  let bx = state.bx

  let canvas = images.loaded[tile.img]
  if (tile.fill_type === 'contain') {
    // contain
    let ix = x
    let iy = y
    let iw = w
    let ih = h

    let tile_aspect = iw / ih
    let img_aspect = canvas.width / canvas.height
    if (img_aspect > tile_aspect) {
      // limit width
      ih = w / img_aspect
      iy = y + Math.round((h - ih) / 2)
    } else {
      // limit height
      iw = h * img_aspect
      ix = x + Math.round((w - iw) / 2)
    }

    bx.drawImage(canvas, 0, 0, canvas.width, canvas.height, ix, iy, iw, ih)
  } else if (tile.fill_type === 'cover') {
    // cover
    let temp = document.createElement('canvas')
    temp.width = w
    temp.height = h
    let tx = temp.getContext('2d')
    let tile_aspect = w / h
    let img_aspect = canvas.width / canvas.height
    let ix = x
    let iy = y
    let iw, ih
    if (img_aspect > tile_aspect) {
      // stretch height
      ih = h
      iw = Math.round(h * img_aspect)
    } else {
      // stretch width
      iw = w
      ih = Math.round(w / img_aspect)
    }
    let ox = Math.round((w - iw) / 2)
    let oy = Math.round((h - ih) / 2)

    tx.drawImage(canvas, 0, 0, canvas.width, canvas.height, ox, oy, iw, ih)
    bx.drawImage(temp, 0, 0, temp.width, temp.height, x, y, w, h)
  } else {
    // fill
    bx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, w, h)
  }
}

function drawTile(tile, x, y, w, h) {
  let { bx, cx } = state

  // image
  if (tile.img) {
    fillImage(tile, x, y, w, h)
  }

  if (!state.print_preview) {
    // outlines
    cx.strokeStyle = '#ddd'
    cx.lineWidth = 2
    cx.strokeRect(x, y, w, h)
  }
}

function drawParent(id) {
  let cx = state.cx
  let [x, y, w, h] = getDimsByID(id)
  cx.strokeStyle = '#bbb'
  cx.lineWidth = 6
  cx.strokeRect(x, y, w, h)
  // cx.strokeStyle = '#ffaaff'
  // cx.lineWidth = 2
  // cx.strokeRect(x, y, w, h)
}

function drawMoveOptions() {
  let cx = state.cx
  let dir = state.move_options_dir
  cx.fillStyle = 'magenta'

  let move_options = state.move_options.map(id => getDimsByID(id))
  for (let i = 0; i < move_options.length; i++) {
    let option = move_options[i]
    let [x, y, w, h] = option
    if (i === state.move_options_index) {
      let thickness = 12
      switch (dir) {
        case 'left':
          cx.fillStyle = '#bbb'
          cx.fillRect(x + w - thickness / 2 - 1, y - 1, thickness + 2, h + 2)
          cx.fillStyle = 'magenta'
          cx.fillRect(x + w - thickness / 2, y, thickness, h)
          break
        case 'right':
          cx.fillStyle = '#bbb'
          cx.fillRect(x - thickness / 2 - 1, y - 1, thickness + 2, h + 2)
          cx.fillStyle = 'magenta'
          cx.fillRect(x - thickness / 2, y, thickness, h)
          break
        case 'up':
          cx.fillStyle = '#bbb'
          cx.fillRect(x - 1, y + h - thickness / 2 - 1, w + 2, thickness + 2)
          cx.fillStyle = 'magenta'
          cx.fillRect(x, y + h - thickness / 2, w, thickness)
          break
        case 'down':
          cx.fillStyle = '#bbb'
          cx.fillRect(x - 1, y - thickness / 2 - 1, w + 2, thickness + 2)
          cx.fillStyle = 'magenta'
          cx.fillRect(x, y - thickness / 2, w, thickness)
          break
      }
    }
  }
}

function drawActive() {
  let cx = state.cx
  let tile = getByID(state.active)

  let [x, y, w, h] = getDimsByID(state.active)
  cx.strokeStyle = '#bbb'
  cx.lineWidth = 6
  cx.strokeRect(x, y, w, h)

  if (true && tile.parent !== null) {
    drawParent(tile.parent)
  }

  if (state.mode === 'move') {
    cx.strokeStyle = 'magenta'
  } else if (state.mode === 'resize') {
    cx.strokeStyle = 'blue'
  }
  cx.lineWidth = 4
  cx.strokeRect(x, y, w, h)
}

export default function(add_history = true) {
  let { tiles, rx, bx, cx } = state

  rx.canvas.width = state.root_size[0]
  rx.canvas.height = state.root_size[1]

  bx.canvas.width = rx.canvas.width - 2 * 2
  bx.canvas.height = rx.canvas.height - 2 * 2

  cx.canvas.width = rx.canvas.width
  cx.canvas.height = rx.canvas.height
  cx.translate(2, 2)

  // 14 hardcoded on canvas in app.js
  let width = rx.canvas.width + 14
  if (state.show_sidebar) {
    state.$sidebar.style.display = 'block'
    if (window.innerWidth > 799) {
      state.$main.style.width = width + 362 + 'px'
      state.$main.style.paddingRight = 362 + 'px'
    } else {
      state.$main.style.width = width + 'px'
      state.$main.style.paddingRight = 0 + 'px'
    }
    state.$sidebar_button.style.display = 'none'
  } else {
    state.$sidebar.style.display = 'none'
    state.$main.style.width = width + 'px'
    state.$main.style.paddingRight = 0 + 'px'
    state.$sidebar_button.style.display = 'block'
  }

  bx.clearRect(0, 0, bx.canvas.width, bx.canvas.height)
  cx.clearRect(-2, -2, cx.canvas.width, cx.canvas.height)

  let render_dims = []

  let root = tiles.filter(t => t.parent === null)[0]

  function renderTile(tile, dims) {
    let [x, y, w, h] = dims

    // root special case
    if (tile.parent === null) {
      drawTile(root, 0, 0, bx.canvas.width, bx.canvas.height)
      render_dims.push({ id: tile.id, dims: [x, y, w, h] })
    }

    if (tile.children !== undefined) {
      let offset = 0
      for (let i = 0; i < tile.children.length; i++) {
        let child = getByID(tile.children[i])

        let cx, cy, cw, ch
        if (tile.split === 'v') {
          cx = x + offset
          cy = y
          cw = w * child.ratio
          ch = h
          offset += cw
        } else if (tile.split === 'h') {
          cx = x
          cy = y + offset
          cw = w
          ch = h * child.ratio
          offset += ch
        }

        // rounded for drawing
        let rcx = Math.round(cx)
        let rcy = Math.round(cy)
        let rcw = Math.round(cx + cw) - Math.round(cx)
        let rch = Math.round(cy + ch) - Math.round(cy)
        drawTile(child, rcx, rcy, rcw, rch)
        render_dims.push({ id: child.id, dims: [rcx, rcy, rcw, rch] })

        renderTile(child, [cx, cy, cw, ch])
      }
    }
  }
  renderTile(root, [0, 0, bx.canvas.width, bx.canvas.height])

  function renderTree(tile, $node) {
    let active = getActive()
    let $li = document.createElement('li')
    let $label = document.createElement('div')
    $label.innerText = tile.id
    if (active.parent === tile.id) $li.style.background = '#ccc'
    if (state.active === tile.id) $li.style.background = '#ffaaff'
    $li.appendChild($label)
    if (tile.children !== undefined) {
      let $ul = document.createElement('ul')
      $li.appendChild($ul)
      for (let i = 0; i < tile.children.length; i++) {
        let child = getByID(tile.children[i])
        renderTree(child, $ul)
      }
    }
    $node.appendChild($li)
  }
  if (state.show_tree) {
    state.$tree.style.display = 'block'
    state.$tree.innerHTML = `<div>Tree</div>`
    renderTree(root, state.$tree)
  } else {
    state.$tree.style.display = 'none'
  }

  state.render_dims = render_dims

  if (!state.print_preview) {
    // draw active outline over top
    drawActive()
  }

  if (state.move_options !== null) {
    drawMoveOptions()
  }

  let active = getActive()
  let read_fill_type
  if (active.children === undefined) {
    if (active.fill_type !== undefined) {
      read_fill_type = active.fill_type
    } else {
      read_fill_type = state.fill_type
    }
  } else {
    let leaves = getAllLeaves(active)
    let set_fill_type = null
    for (let leaf of leaves) {
      if (leaf.fill_type !== undefined) {
        if (leaf.fill_type === set_fill_type) {
        } else {
          if (set_fill_type === null) {
            set_fill_type = leaf.fill_type
          } else {
            set_fill_type = 'mixed'
          }
        }
      }
    }
    if (set_fill_type === null) set_fill_type = state.fill_type
    read_fill_type = set_fill_type
  }
  let fill_type = 'fill:' + read_fill_type
  state.$readout.innerHTML =
    't-' + state.active + (active.children === undefined ? '' : ' container')
  state.$mode.innerText = fill_type

  // composite
  rx.clearRect(0, 0, rx.canvas.width, rx.canvas.height)
  rx.fillStyle = 'white'
  rx.fillRect(2, 2, bx.canvas.width, bx.canvas.height)
  rx.drawImage(
    bx.canvas,
    0,
    0,
    bx.canvas.width,
    bx.canvas.height,
    2,
    2,
    bx.canvas.width,
    bx.canvas.height
  )
  rx.drawImage(
    cx.canvas,
    0,
    0,
    cx.canvas.width,
    cx.canvas.height,
    0,
    0,
    cx.canvas.width,
    cx.canvas.height
  )

  if (add_history) {
    addHistory()
  }
}
