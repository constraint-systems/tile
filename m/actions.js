import state from '/m/state.js'
import images from '/m/images.js'
import render from '/m/render.js'
import { renderHelp } from '/m/help.js'
import history from '/m/history.js'

let id = Math.max(...state.tiles.map(t => t.id))
function createID() {
  id += 1
  return id
}

export function getByID(id) {
  let map = state.tiles.map(o => o.id)
  let index = map.indexOf(id)
  return state.tiles[index]
}

export function getDimsByID(id) {
  let map = state.render_dims.map(o => o.id)
  let index = map.indexOf(id)
  return state.render_dims[index].dims
}

export function getActive() {
  return getByID(state.active)
}

export function getActiveDims() {
  return getDimsByID(state.active)
}

function ratioSplit(id) {
  let dims = getDimsByID(id)
  return dims[2] > dims[3] ? 'v' : 'h'
}

function getAbsoluteClosestIndex(array, val) {
  let absolutes = array.map(v => Math.abs(v - val))
  let min = Math.min(...absolutes)
  let min_index = absolutes.indexOf(min)
  return min_index
}

function moveToTarget(first_checks, second_checks) {
  // look at cell positions to determine move
  let cell_ids = state.tiles
    .filter(t => t.children === undefined)
    .map(t => t.id)
  let cell_dims = state.render_dims.filter(o => cell_ids.indexOf(o.id) !== -1)
  let cell_edges = cell_dims.map(o => {
    let d = o.dims
    return { id: o.id, edges: [d[0], d[1], d[0] + d[2], d[1] + d[3]] }
  })
  let neighbors = cell_edges.filter(
    o => first_checks[0] === o.edges[first_checks[1]]
  )
  if (neighbors.length > 0) {
    let target_index
    if (second_checks[1] === 'x') {
      for (let i = 0; i < neighbors.length; i++) {
        let neighbor = neighbors[i]
        if (
          neighbor.edges[0] <= second_checks[0] &&
          neighbor.edges[2] > second_checks[0]
        ) {
          target_index = i
          break
        }
      }
    } else if (second_checks[1] === 'y') {
      for (let i = 0; i < neighbors.length; i++) {
        let neighbor = neighbors[i]
        if (
          neighbor.edges[1] <= second_checks[0] &&
          neighbor.edges[3] > second_checks[0]
        ) {
          target_index = i
          break
        }
      }
    }
    state.active = neighbors[target_index].id
    return true
  } else {
    // no neighbors and children means move into children
    return false
  }
}

export function moveCursor(dir) {
  let active = getActive()
  let [x, y, w, h] = getDimsByID(state.active)
  let x2 = x + w
  let y2 = y + h
  if (dir === 'left') {
    if (!moveToTarget([x, 2], [y, 'y']) && active.children !== undefined)
      state.active = getLeaf(active, 'v', 'beg').id
  } else if (dir === 'right') {
    if (!moveToTarget([x2, 0], [y, 'y']) && active.children !== undefined)
      state.active = getLeaf(active, 'v', 'end').id
  } else if (dir === 'up') {
    if (!moveToTarget([y, 3], [x, 'x']) && active.children !== undefined)
      state.active = getLeaf(active, 'h', 'beg').id
  } else if (dir === 'down') {
    if (!moveToTarget([y2, 1], [x, 'x']) && active.children !== undefined)
      state.active = getLeaf(active, 'h', 'end').id
  }
}

export function wrapAndAddTile(prepend = false) {
  let active = getActive()
  let dims = getActiveDims()

  // make sure new cell will be at least 16x16
  if (dims[2] >= 32 || dims[3] >= 32) {
    let new_cell = {
      id: createID(),
      ratio: 0.5,
    }
    let new_wrapper = {
      id: createID(),
      split: ratioSplit(active.id),
      ratio: active.ratio,
      parent: active.parent,
    }
    if (prepend) {
      new_wrapper.children = [new_cell.id, active.id]
    } else {
      new_wrapper.children = [active.id, new_cell.id]
    }

    if (active.img !== undefined) {
      new_cell.img = active.img
      new_cell.fill_type = active.fill_type
    } else if (active.children !== undefined) {
      // check first
      let leaves = getAllLeaves(active)
      let first = leaves[0]
      if (first.img !== undefined) {
        new_cell.img = first.img
        new_cell.fill_type = first.fill_type
      }
    }
    if (active.parent !== null) {
      let parent = getByID(active.parent)
      let active_index = parent.children.indexOf(active.id)
      parent.children[active_index] = new_wrapper.id
      active.parent = new_wrapper.id
    } else {
      active.parent = new_wrapper.id
    }

    new_cell.parent = new_wrapper.id
    active.ratio = 0.5
    state.tiles.push(new_wrapper)
    state.tiles.push(new_cell)
    state.active = new_cell.id

    cleanUpSolos()
  }
}

function arrayRemove(array, index) {
  return [...array.slice(0, index), ...array.slice(index + 1)]
}

function bareRemoveTile(id) {
  let map = state.tiles.map(o => o.id)
  let index = map.indexOf(id)
  state.tiles = arrayRemove(state.tiles, index)
}

function removeTile(id) {
  let tile = getByID(id)
  let delete_ids = []
  function checkChildren(tile) {
    delete_ids.push(tile.id)
    if (tile.children !== undefined) {
      for (let child of tile.children) {
        checkChildren(getByID(child))
      }
    }
  }
  checkChildren(tile)
  for (let id of delete_ids) {
    bareRemoveTile(id)
  }
}

function removeChildFromParent(tile) {
  if (tile.parent !== null) {
    let parent = getByID(tile.parent)
    let index = parent.children.indexOf(tile.id)
    parent.children = arrayRemove(parent.children, index)
    let old_space = 1 - tile.ratio
    for (let i = 0; i < parent.children.length; i++) {
      let child = getByID(parent.children[i])
      if (child.id !== tile.id) child.ratio = child.ratio / old_space
    }
  }
}

export function cleanUpSolos() {
  for (let i = 0; i < state.tiles.length; i++) {
    let tile = state.tiles[i]
    if (tile.children !== undefined && tile.children.length === 1) {
      let child = getByID(tile.children[0])
      // replace container with its only child
      if (tile.parent !== null) {
        let parent = getByID(tile.parent)
        let index = parent.children.indexOf(tile.id)
        parent.children[index] = child.id
      }
      child.ratio = tile.ratio
      child.parent = tile.parent
      if (state.active === tile.id) state.active = child.id
      bareRemoveTile(tile.id)
    }
  }
}

export function getAllLeaves(tile) {
  let leaves = []
  function checkLeaf(tile) {
    if (tile.children === undefined) {
      leaves.push(tile)
    } else {
      for (let child of tile.children) {
        checkLeaf(getByID(child))
      }
    }
  }
  checkLeaf(tile)
  return leaves
}

function getLeaf(tile, split, edge) {
  function checkLeaf(tile) {
    if (tile.children === undefined) {
      return tile
    } else {
      let index
      if (tile.split !== split) {
        index = 0
      } else {
        if (edge === 'beg') {
          index = 0
        } else {
          index = tile.children.length - 1
        }
      }
      let child = getByID(tile.children[index])
      return checkLeaf(child)
    }
  }
  return checkLeaf(tile)
}

export function selectParent() {
  let active = getActive()
  if (active.parent !== null) {
    state.active = active.parent
  }
}

export function removeTileAndClean() {
  let active = getActive()

  if (active.parent === null) {
    // if parent remove all children
    // a bit hacky
    let queue = active.children.map(id => getByID(id))
    function stepQueue() {
      let child = queue.splice(0, 1)[0]
      removeChildFromParent(child)
      removeTile(child.id)
      if (queue.length > 0) {
        stepQueue()
      } else {
        delete active.children
        cleanUpSolos()
      }
    }
    stepQueue()
  } else {
    let parent = getByID(active.parent)
    let index = parent.children.indexOf(active.id)

    removeChildFromParent(active)
    removeTile(active.id)
    cleanUpSolos()

    let target_index = index > 0 ? index - 1 : 0
    let target = getByID(parent.children[target_index])
    let leaf = getLeaf(target, parent.split, 'beg')
    state.active = leaf.id
  }
}

function findParentSplit(tile, split) {
  if (tile.parent === null) return null
  let parent = getByID(tile.parent)
  if (parent.split === split) {
    return [parent, tile]
  } else {
    return findParentSplit(parent, split)
  }
}

export function resize(diff, shift = false) {
  let [dw, dh] = diff
  let active = getActive()
  if (active.parent === null) {
    // root special case
    resizeCanvas(diff, shift)
  } else {
    let parent = getByID(active.parent)
    // resize horizontal
    if (dw !== 0) {
      let check_parent = findParentSplit(active, 'v')
      if (check_parent === null) {
        resizeCanvas(diff, shift)
      } else {
        let [parent, active_child] = check_parent
        let parent_dims = getDimsByID(parent.id)
        let wpx = 1 / parent_dims[2]
        let siblings = parent.children.filter(id => id !== active_child.id)
        let change = dw * wpx * (shift ? 1 : 8)
        let min = 16 * wpx
        let max = 1 - siblings.length * 16 * wpx
        if (
          active_child.ratio + change >= min &&
          active_child.ratio + change <= max
        ) {
          active_child.ratio += change
          let distribute = -change / siblings.length
          for (let i = 0; i < siblings.length; i++) {
            let sibling = getByID(siblings[i])
            sibling.ratio += distribute
          }
        }
      }
    }
    if (dh !== 0) {
      let check_parent = findParentSplit(active, 'h')
      if (check_parent === null) {
        resizeCanvas(diff, shift)
      } else {
        let [parent, active_child] = findParentSplit(active, 'h')
        let parent_dims = getDimsByID(parent.id)
        let hpx = 1 / parent_dims[3]
        let siblings = parent.children.filter(id => id !== active_child.id)
        let change = dh * hpx * (shift ? 1 : 8)
        let min = 16 * hpx
        let max = 1 - siblings.length * 16 * hpx
        if (
          active_child.ratio + change >= min &&
          active_child.ratio + change <= max
        ) {
          active_child.ratio += change
          let distribute = -change / siblings.length
          for (let i = 0; i < siblings.length; i++) {
            let sibling = getByID(siblings[i])
            sibling.ratio += distribute
          }
        }
      }
    }
  }
}

let img_id = 0
export function _loadImage(tile, src) {
  let px = state.px
  let img = document.createElement('img')
  img.onload = function() {
    let w = img.width
    let h = img.height
    let canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    let cx = canvas.getContext('2d')
    cx.drawImage(img, 0, 0, w, h, 0, 0, w, h)
    tile.fill_type = state.fill_type
    images.loaded[img_id.toString()] = canvas
    tile.img = img_id.toString()
    img_id++
    render()
  }
  img.src = src
}

export function clearImage() {
  let active = getActive()
  let tiles = []
  if (active.children !== undefined) {
    tiles = getAllLeaves(active)
  } else {
    tiles = [active]
  }
  for (let i = 0; i < tiles.length; i++) {
    let tile = tiles[i]
    delete tile.img
    delete tile.fill_type
  }
}

function loadAllImages(target_tile, srcs) {
  let tiles = []
  if (target_tile.children !== undefined) {
    tiles = getAllLeaves(target_tile)
  } else {
    tiles = [target_tile]
  }
  for (let i = 0; i < tiles.length; i++) {
    let tile = tiles[i]
    if (srcs.length === 1) {
      let src = srcs[0]
      if (tile !== undefined && src !== undefined) {
        _loadImage(tile, src)
      }
    } else {
      let src = srcs[i]
      if (tile !== undefined && src !== undefined) {
        _loadImage(tile, src)
      }
    }
  }
}

export function loadImage() {
  let active = getActive()
  let input = document.querySelector('#file_input')
  if (active.children !== undefined) {
    input.setAttribute('multiple', 'multiple')
  } else {
    input.removeAttribute('multiple')
  }
  function handleChange(e) {
    let images = []
    for (let item of this.files) {
      if (item.type.indexOf('image') < 0) {
        continue
      }
      let src = URL.createObjectURL(item)
      images.push(src)
    }
    loadAllImages(active, images)
    this.removeEventListener('change', handleChange)
  }
  input.addEventListener('change', handleChange)

  input.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    })
  )
}

export function setFillType(tile) {
  let active = getActive()
  let fill_types = state.fill_types
  let current
  if (active.children === undefined) {
    current = active.fill_type || state.fill_type
  } else {
    let leaves = getAllLeaves(active)
    let unanimous = leaves[0].fill_type
    for (let leaf of leaves) {
      if (
        leaf.fill_type === undefined ||
        leaf.fill_type !== leaves[0].fill_type
      ) {
        unanimous = null
      }
    }
    if (unanimous) {
      current = unanimous
    } else {
      current = state.fill_type
    }
  }
  let index = fill_types.indexOf(current)
  let next_index = index + 1
  if (next_index > fill_types.length - 1) next_index = 0
  let next = fill_types[next_index]
  if (active.children === undefined) {
    active.fill_type = next
  } else {
    let leaves = getAllLeaves(active)
    for (let leaf of leaves) {
      leaf.fill_type = next
    }
  }
  state.fill_type = next
}

function moveChild(parent, current_index, diff) {
  let spliced = parent.children.splice(current_index, 1)[0]
  parent.children.splice(current_index + diff, 0, spliced)
}

function invertSplit(split) {
  if (split === 'v') {
    return 'h'
  } else {
    return 'v'
  }
}

function replaceChildID(tile, old_id, new_id) {
  let index = tile.children.indexOf(old_id)
  tile.children[index] = new_id
}

function insertTile(parent, tile, index) {
  let children_length = parent.children.length
  let new_ratio = 1 / (children_length + 1)
  for (let cid of parent.children) {
    let child = getByID(cid)
    let multiplier = child.ratio
    child.ratio -= new_ratio * child.ratio
  }
  tile.ratio = new_ratio
  tile.parent = parent.id
  parent.children.splice(index, 0, tile.id)
}

function wrapTile(tile, split) {
  let new_wrapper = {
    id: createID(),
    split: split,
    ratio: tile.ratio,
    parent: tile.parent,
    children: [tile.id],
  }
  if (tile.parent !== null) {
    let parent = getByID(tile.parent)
    replaceChildID(parent, tile.id, new_wrapper.id)
  }
  tile.parent = new_wrapper.id
  tile.ratio = 1
  state.tiles.push(new_wrapper)
  return new_wrapper.id
}

export function moveTile(dir) {
  let active = getActive()

  // Root special case
  if (active.parent !== null) {
    let parent = getByID(active.parent)
    let active_index = parent.children.indexOf(active.id)
    let children_length = parent.children.length
    let parent_split = parent.split

    // position variables
    let to_beg = dir === 'left' || dir === 'up'
    let to_end = dir === 'right' || dir === 'down'
    let at_beg = active_index === 0
    let at_end = active_index === children_length - 1
    // TODO fix pop end more conditions to make sure you are going the same dir
    let move_hor = dir === 'left' || dir === 'right'
    let move_ver = dir === 'up' || dir === 'down'
    let with_split =
      (move_hor && parent_split === 'v') || (move_ver && parent_split === 'h')
    let against_split = !with_split
    let pop_end =
      (with_split && to_beg && at_beg) || (with_split && to_end && at_end)
    let pair = children_length === 2

    // move withing pair parent
    if (pair) {
      if (with_split && !pop_end) {
        let diff = to_beg ? -1 : 1
        let next = getByID(parent.children[active_index + diff])
        if (next.children === undefined) {
          moveChild(parent, active_index, diff)
          return
        }
      }
      if (against_split) {
        if (at_end && to_beg) {
          moveChild(parent, active_index, -1)
        } else if (at_beg && to_end) {
          moveChild(parent, active_index, 1)
        }
        parent.split = invertSplit(parent_split)
        return
      }
    }

    // pop out of pair into parent
    if (pair && pop_end) {
      if (parent.parent !== null) {
        let parpar = getByID(parent.parent)
        let with_parpar_split =
          (move_hor && parpar.split === 'v') ||
          (move_ver && parpar.split === 'h')
        let parent_index = parpar.children.indexOf(parent.id)
        let diff = to_end ? 1 : 0
        removeChildFromParent(active)
        if (with_parpar_split) {
          insertTile(parpar, active, parent_index + diff)
        } else {
          let wrapper_id = wrapTile(parpar, move_hor ? 'v' : 'h')
          let wrapper = getByID(wrapper_id)
          insertTile(wrapper, active, to_beg ? 0 : 1)
        }
        cleanUpSolos()
        return
      }
    }

    // pop out of > pair
    if (pop_end || against_split) {
      removeChildFromParent(active)
      let wrapper_id = wrapTile(parent, move_hor ? 'v' : 'h')
      let wrapper = getByID(wrapper_id)
      insertTile(wrapper, active, to_beg ? 0 : 1)
      cleanUpSolos()
      return
    }

    if ((to_end && !at_end) || (to_beg && !at_beg)) {
      // pair swap already taken care of
      let diff = to_beg ? -1 : 1
      let next = getByID(parent.children[active_index + diff])
      if (next.children === undefined) {
        removeChildFromParent(active)
        let wrapper_id = wrapTile(next, move_hor ? 'v' : 'h')
        let wrapper = getByID(wrapper_id)
        insertTile(wrapper, active, to_beg ? 1 : 0)
        cleanUpSolos()
        return
      } else {
        if (parent.split === next.split) {
          removeChildFromParent(active)
          let next_children_length = next.children.length
          insertTile(next, active, to_beg ? next_children_length : 0)
          cleanUpSolos()
          return
        } else {
          let active_dims = getActiveDims()
          let leaves = getAllLeaves(next)
          let leave_dims = leaves.map(l => {
            return { id: l.id, dims: getDimsByID(l.id) }
          })
          let neighbors = leave_dims.filter(l => {
            let check1
            if (dir === 'left') check1 = active_dims[0]
            if (dir === 'right') check1 = active_dims[0] + active_dims[2]
            if (dir === 'up') check1 = active_dims[1]
            if (dir === 'down') check1 = active_dims[1] + active_dims[3]
            let check2
            if (dir === 'left') check2 = l.dims[0] + l.dims[2]
            if (dir === 'right') check2 = l.dims[0]
            if (dir === 'up') check2 = l.dims[1] + l.dims[3]
            if (dir === 'down') check2 = l.dims[1]
            return check1 === check2
          })
          // TODO sort options by distance
          let neighbor_ids = neighbors.map(l => l.id)
          state.move_options = neighbor_ids
          state.move_options_dir = dir
          state.move_options_index = 0
          renderHelp()
          return
        }
      }
    }
  }
}

export function confirmMoveTile(target_id, dir) {
  let active = getActive()
  let target = getByID(target_id)
  let to_beg = dir === 'left' || dir === 'up'
  let to_end = dir === 'right' || dir === 'down'
  let move_hor = dir === 'left' || dir === 'right'
  let move_ver = dir === 'up' || dir === 'down'
  removeChildFromParent(active)
  let wrapper_id = wrapTile(target, move_hor ? 'v' : 'h')
  let wrapper = getByID(wrapper_id)
  insertTile(wrapper, active, to_beg ? 1 : 0)
  cleanUpSolos()
  clearMoveOptions()
  return
}

export function clearMoveOptions() {
  state.move_options = null
  state.move_options_index = null
  state.move_options_dir = null
  renderHelp()
}

export function chooseOption(dir) {
  let to_end = dir === 'right' || dir === 'down'
  let to_beg = !to_end
  let hor = ['left', 'right']
  let ver = ['up', 'down']
  let with_dir =
    (hor.includes(dir) && hor.includes(state.move_options_dir)) ||
    (ver.includes(dir) && ver.includes(state.move_options_dir))
  let against_dir = !with_dir

  if (with_dir) {
    if (dir === state.move_options_dir) {
      // confirm
      confirmMoveTile(state.move_options[state.move_options_index], dir)
    } else {
      clearMoveOptions()
    }
  } else if (against_dir) {
    let diff = to_end ? 1 : -1
    let min = 0
    let max = state.move_options.length - 1
    let new_index = Math.max(
      min,
      Math.min(max, state.move_options_index + diff)
    )
    // this wrapped it
    // if (new_index < 0) new_index = state.move_options.length - 1
    // if (new_index > state.move_options.length - 1) new_index = 0
    state.move_options_index = new_index
  }
}

export function setPrintPreview(val) {
  state.print_preview = val
}

export function setCanvasSizes(w, h) {
  let rx = state.rx
  rx.canvas.width = w
  rx.canvas.height = h

  let bx = state.bx
  bx.canvas.width = rx.canvas.width - 2 * 2
  bx.canvas.height = rx.canvas.height - 2 * 2

  let cx = state.cx
  cx.canvas.width = rx.canvas.width
  cx.canvas.height = rx.canvas.height
  cx.translate(2, 2)

  // container size taken care of in render now
}

export function resizeCanvas(resize, shift) {
  // bx size is reference size
  let bx = state.bx
  let [dw, dh] = resize
  let change = shift ? 1 : 8
  let adjust = 2 * 2
  let new_width = bx.canvas.width + adjust
  let new_height = bx.canvas.height + adjust
  if (dw !== 0) {
    if (bx.canvas.width + dw * change > 64) {
      new_width = bx.canvas.width + dw * change + adjust
    }
  }
  if (dh !== 0) {
    if (bx.canvas.height + dh * change > 64) {
      new_height = bx.canvas.height + dh * change + adjust
    }
  }
  state.root_size = [new_width, new_height]
}

export function saveImage() {
  // art only render
  render(true)
  let link = document.createElement('a')
  let bx = state.bx

  bx.canvas.toBlob(function(blob) {
    link.setAttribute(
      'download',
      'tile-' + Math.round(new Date().getTime() / 1000) + '.png'
    )

    link.setAttribute('href', URL.createObjectURL(blob))
    link.dispatchEvent(
      new MouseEvent(`click`, {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    )
  })
}

export function addHistory() {
  let frozen_state = JSON.stringify(state)
  if (history.index === null) {
    history.stack.push(frozen_state)
  } else {
    history.stack = history.stack.slice(0, history.index)
    history.stack.push(frozen_state)
    history.index = null
  }
}

function changeState(new_state) {
  let render_help = false
  function changeProp(prop_key) {
    state[prop_key] = new_state[prop_key]
  }
  function changeProps(prop_keys) {
    for (let i = 0; i < prop_keys.length; i++) {
      let prop_key = prop_keys[i]
      changeProp(prop_key)
    }
  }
  if (state.mode !== new_state.mode) render_help = true
  let prop_keys = [
    'mode',
    'tiles',
    'move_options',
    'move_options_dir',
    'move_options_index',
    'active',
    'fill_type',
    'print_preview',
    'root_size',
  ]
  changeProps(prop_keys)
  if (render_help) renderHelp()
}

export function travelHistory(option) {
  if (option === 'forward') {
    if (history.index !== null && history.index !== history.stack.length - 1) {
      history.index += 1
      changeState(JSON.parse(history.stack[history.index]))
      render(false)
    }
  } else {
    if (history.index === null) {
      history.index = history.stack.length - 2
      changeState(JSON.parse(history.stack[history.index]))
      render(false)
    } else {
      if (history.index > 0) {
        history.index -= 1
        changeState(JSON.parse(history.stack[history.index]))
        render(false)
      }
    }
  }
}

export function toggleTree() {
  state.show_tree = !state.show_tree
}

export function onDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  let file = e.dataTransfer.files[0]
  let filename = file.path ? file.path : file.name ? file.name : ''
  let src = URL.createObjectURL(file)
  let active = getActive()
  _loadImage(active, src)
}

export function onDrag(e) {
  e.stopPropagation()
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}

export function onPaste(e) {
  e.preventDefault()
  e.stopPropagation()
  for (const item of e.clipboardData.items) {
    if (item.type.indexOf('image') < 0) {
      continue
    }
    let file = item.getAsFile()
    let src = URL.createObjectURL(file)
    let active = getActive()
    loadAllImages(active, [src])
  }
}

export function mouseSelect(e) {
  let rect = e.target.getBoundingClientRect()
  let x = e.clientX - rect.left
  let y = e.clientY - rect.top
  for (let i = 0; i < state.render_dims.length; i++) {
    let d = state.render_dims[i]
    let tile = getByID(d.id)
    if (tile.children === undefined) {
      let x0 = d.dims[0]
      let x1 = d.dims[0] + d.dims[2]
      let y0 = d.dims[1]
      let y1 = d.dims[1] + d.dims[3]
      if (x >= x0 && x < x1 && y >= y0 && y < y1) {
        state.active = d.id
        break
      }
    }
  }
  render()
}

export function toggleHelp() {
  state.show_sidebar = !state.show_sidebar
}
