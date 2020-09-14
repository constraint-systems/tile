export default {
  mode: 'move',
  tiles: [
    {
      id: 0,
      parent: null,
      ratio: 1,
      children: [1, 2],
      split: 'v',
    },
    {
      id: 1,
      parent: 0,
      ratio: 0.5,
    },
    {
      id: 2,
      parent: 0,
      ratio: 0.5,
      children: [3, 4],
      split: 'h',
    },
    {
      id: 3,
      parent: 2,
      ratio: 0.5,
    },
    {
      id: 4,
      parent: 2,
      ratio: 0.5,
    },
  ],
  move_options: null,
  move_options_dir: null,
  move_options_index: null,
  active: 1,
  show_tree: false,
  fill_types: ['stretch', 'contain', 'cover'],
  fill_type: 'stretch',
  print_preview: false,
  show_sidebar: true,
  control_dirs: 'arrows',
  km: {},
}
