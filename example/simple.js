var fit = require('canvas-fit')
var mouseWheel = require('mouse-wheel')
var mouseChange = require('mouse-change')
var createContour = require('../contour')
var createSelectBox = require('gl-select-box')
var createSpikes = require('gl-spikes2d')
var createPlot = require('gl-plot2d')

var canvas = document.createElement('canvas')
document.body.appendChild(canvas)
window.addEventListener('resize', fit(canvas, null, +window.devicePixelRatio), false)

var gl = canvas.getContext('webgl')

var aspect = gl.drawingBufferWidth / gl.drawingBufferHeight
var dataBox = [-10,-10/aspect,10,10/aspect]

function makeTicks(lo, hi) {
  var result = []
  for(var i=lo; i<=hi; ++i) {
    result.push({
      x: i,
      text: i + ''
    })
  }
  return result
}

var options = {
  gl:             gl,
  dataBox:        dataBox,
  title:          '100 million points',
  ticks:          [ makeTicks(-20,20), makeTicks(-20,20) ],
  labels:         ['x', 'y'],
  pixelRatio:     +window.devicePixelRatio,
  tickMarkWidth:  [2,2,2,2],
  tickMarkLength: [6,6,6,6]
}

var plot = createPlot(options)

var selectBox = createSelectBox(plot, {
  innerFill: false,
  outerFill: true
})
selectBox.enabled = false

var spikes = createSpikes(plot)

var z = new Array(5*20)
var ptr = 0
for(var i=0; i<5; ++i)
for(var j=0; j<20; ++j) {
  z[ptr++] = (i * i)/(5*5) + (j * j)/(20*20)
}

console.time('createContour')
var heatmap = createContour(plot, {
  z:           z,
  shape:       [5,20],
  levels: [0.1, 0.5, 1, 1.5],
  lineWidth: 4,
  levelColors: [
    0, 0, 1, 1,
    0, 1, 0, 1,
    1, 0, 0, 1,
    1, 1, 0, 1
  ],
  fillColors: [
    1, 1, 0, 1,
    0, 1, 1, 1,
    1, 0, 1, 1,
    0, 0, 0, 1,
    0.8, 1, 0.3, 1
  ]
})
console.timeEnd('createContour')

var lastX = 0, lastY = 0
var boxStart = [0,0]
var boxEnd   = [0,0]
var boxEnabled = false
mouseChange(function(buttons, x, y, mods) {
  y = window.innerHeight - y
  x *= plot.pixelRatio
  y *= plot.pixelRatio

  if(buttons & 1) {
    if(mods.shift) {
      var dataX = (x - plot.viewBox[0]) / (plot.viewBox[2]-plot.viewBox[0]) * (dataBox[2] - dataBox[0]) + dataBox[0]
      var dataY = (y - plot.viewBox[1]) / (plot.viewBox[3]-plot.viewBox[1]) * (dataBox[3] - dataBox[1]) + dataBox[1]
      if(!boxEnabled) {
        boxStart[0] = dataX
        boxStart[1] = dataY
      }
      boxEnd[0] = dataX
      boxEnd[1] = dataY
      boxEnabled = true
      spikes.update()
    } else {
      var dx = (lastX - x) * (dataBox[2] - dataBox[0]) / (plot.viewBox[2]-plot.viewBox[0])
      var dy = (lastY - y) * (dataBox[3] - dataBox[1]) / (plot.viewBox[3] - plot.viewBox[1])

      dataBox[0] += dx
      dataBox[1] += dy
      dataBox[2] += dx
      dataBox[3] += dy

      plot.setDataBox(dataBox)
      spikes.update()
    }
  } else {
    var result = plot.pick(x/plot.pixelRatio, y/plot.pixelRatio)
    if(result) {
      spikes.update({center: result.dataCoord})
    } else {
      spikes.update()
    }
  }

  if(boxEnabled) {
    selectBox.enabled = true
    selectBox.selectBox = [
      Math.min(boxStart[0], boxEnd[0]),
      Math.min(boxStart[1], boxEnd[1]),
      Math.max(boxStart[0], boxEnd[0]),
      Math.max(boxStart[1], boxEnd[1])
    ]
    plot.setDirty()
    if(!((buttons&1) && mods.shift)) {
      selectBox.enabled = false
      dataBox = [
        Math.min(boxStart[0], boxEnd[0]),
        Math.min(boxStart[1], boxEnd[1]),
        Math.max(boxStart[0], boxEnd[0]),
        Math.max(boxStart[1], boxEnd[1])
      ]
      plot.setDataBox(dataBox)
      boxEnabled = false
    }
  }

  lastX = x
  lastY = y
})

mouseWheel(function(dx, dy, dz) {
  var scale = Math.exp(0.1 * dy / gl.drawingBufferHeight)

  var cx = (lastX - plot.viewBox[0]) / (plot.viewBox[2] - plot.viewBox[0]) * (dataBox[2] - dataBox[0]) + dataBox[0]
  var cy = (plot.viewBox[1] - lastY) / (plot.viewBox[3] - plot.viewBox[1]) * (dataBox[3] - dataBox[1]) + dataBox[3]

  dataBox[0] = (dataBox[0] - cx) * scale + cx
  dataBox[1] = (dataBox[1] - cy) * scale + cy
  dataBox[2] = (dataBox[2] - cx) * scale + cx
  dataBox[3] = (dataBox[3] - cy) * scale + cy

  plot.setDataBox(dataBox)

  return true
})

function render() {
  requestAnimationFrame(render)
  plot.draw()
}

render()
