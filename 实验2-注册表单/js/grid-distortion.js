/**
 * GridDistortion —— 原生 WebGL 移植版
 *
 * 1:1 移植自 react-bits 的 GridDistortion（three.js 版），即 Trae 官网尾页使用的组件：
 *   https://github.com/DavidHDev/react-bits -> src/content/Backgrounds/GridDistortion/GridDistortion.jsx
 * （Trae 官网 DOM 中 data-engine="three.js r176" 的 canvas 即该组件）
 *
 * 官方机制（本移植逐行还原，未做二次创作）：
 *   1. 维护 grid × grid（默认 15×15）的浮点偏移网格 DataTexture，
 *      初始值为 Math.random() * 255 - 125
 *   2. 每帧全部偏移 *= relaxation（默认 0.9）——自然回弹
 *   3. 鼠标移动速度 vX / vY 注入半径内的格子：
 *        maxDist = size * mouse（默认 0.1）
 *        power   = min(maxDist / dist, 10)
 *        offset += strength * 100 * vX * power   （Y 轴为 -=）
 *   4. 片元着色器：texture2D(uTexture, uv - 0.02 * offset.rg)
 *      ——图像被切成网格块，被鼠标“推”走后回弹
 *
 * 用法：
 *   new GridDistortion(canvasEl, {
 *     image: canvasOrImageOrUrl,                 // 纹理来源
 *     grid: 15, mouse: 0.1,                     // 官方默认值
 *     strength: 0.15, relaxation: 0.9,          // 官方默认值
 *     pointerEl: hoverElement                   // 鼠标监听区域，默认取 canvas 父元素
 *   });
 * 零依赖，不引入 three.js。
 */
(function (global) {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D uDataTexture;',
    'uniform sampler2D uTexture;',
    'uniform vec4 resolution;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 uv = vUv;',
    '  vec4 offset = texture2D(uDataTexture, vUv);',
    '  gl_FragColor = texture2D(uTexture, uv - 0.02 * offset.rg);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('shader compile: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  function buildProgram(gl) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('program link: ' + gl.getProgramInfoLog(p));
    }
    return p;
  }

  function GridDistortion(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;

    // ---- 官方默认参数（GridDistortion.jsx 第 28 行）----
    this.gridSize = opts.grid != null ? opts.grid : 15;
    this.mouse = opts.mouse != null ? opts.mouse : 0.1;
    this.strength = opts.strength != null ? opts.strength : 0.15;
    this.relaxation = opts.relaxation != null ? opts.relaxation : 0.9;

    var container = opts.pointerEl || canvas.parentElement || canvas;
    this.container = container;

    var gl = canvas.getContext('webgl2', {
      antialias: true, alpha: true, powerPreference: 'high-performance'
    });
    this.isGL2 = !!gl;
    if (!gl) {
      gl = canvas.getContext('webgl', {
        antialias: true, alpha: true, powerPreference: 'high-performance'
      });
    }
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;

    // 官方使用 FloatType 的 DataTexture
    if (!this.isGL2 && !gl.getExtension('OES_texture_float')) {
      throw new Error('float texture unsupported');
    }

    gl.clearColor(0, 0, 0, 0);
    this.prog = buildProgram(gl);
    gl.useProgram(this.prog);

    // 全屏四边形（等价 three.js 的 PlaneGeometry + OrthographicCamera）
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.uResolution = gl.getUniformLocation(this.prog, 'resolution');
    gl.uniform1i(gl.getUniformLocation(this.prog, 'uTexture'), 0);
    gl.uniform1i(gl.getUniformLocation(this.prog, 'uDataTexture'), 1);

    // ---- 偏移网格 DataTexture（初始随机值，与官方一致）----
    var size = this.gridSize;
    var data = new Float32Array(4 * size * size);
    for (var i = 0; i < size * size; i++) {
      data[i * 4] = Math.random() * 255 - 125;
      data[i * 4 + 1] = Math.random() * 255 - 125;
    }
    this.data = data;
    this.dataTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.uploadData();

    // ---- 图像纹理 ----
    this.tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setImage(opts.image);

    // ---- 鼠标状态（只记录移动速度，与官方一致）----
    this.mouseState = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 };
    this.bindEvents();

    this.resize();
    if (global.ResizeObserver) {
      this.ro = new ResizeObserver(this.resize.bind(this));
      this.ro.observe(container);
    } else {
      global.addEventListener('resize', this.resize.bind(this));
    }

    // 离屏暂停渲染（仅为省电，不改变观感）
    this.visible = true;
    if (global.IntersectionObserver) {
      var self0 = this;
      var io = new IntersectionObserver(function (entries) {
        self0.visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      io.observe(canvas);
    }

    this.time = 0;
    this.raf = requestAnimationFrame(this.animate.bind(this));
  }

  GridDistortion.prototype.uploadData = function () {
    var gl = this.gl;
    var size = this.gridSize;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0,
      this.isGL2 ? gl.RGBA32F : gl.RGBA,
      size, size, 0, gl.RGBA, gl.FLOAT, this.data
    );
  };

  GridDistortion.prototype.setImage = function (image) {
    if (!image) return;
    var self = this;
    var apply = function (src) {
      var gl = self.gl;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, self.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      self.resize();
    };
    if (typeof image === 'string') {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { apply(img); };
      img.src = image;
    } else {
      apply(image);
    }
  };

  GridDistortion.prototype.resize = function () {
    var gl = this.gl;
    var rect = this.container.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    if (!w || !h) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var pw = Math.max(1, Math.round(w * dpr));
    var ph = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    gl.viewport(0, 0, pw, ph);
    gl.useProgram(this.prog);
    gl.uniform4f(this.uResolution, w, h, 1, 1);
  };

  GridDistortion.prototype.bindEvents = function () {
    var self = this;
    this.container.addEventListener('mousemove', function (e) {
      var r = self.container.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = 1 - (e.clientY - r.top) / r.height;
      self.mouseState.vX = x - self.mouseState.prevX;
      self.mouseState.vY = y - self.mouseState.prevY;
      self.mouseState.x = x;
      self.mouseState.y = y;
      self.mouseState.prevX = x;
      self.mouseState.prevY = y;
    });
    this.container.addEventListener('mouseleave', function () {
      self.mouseState.x = 0;
      self.mouseState.y = 0;
      self.mouseState.prevX = 0;
      self.mouseState.prevY = 0;
      self.mouseState.vX = 0;
      self.mouseState.vY = 0;
    });
  };

  GridDistortion.prototype.animate = function () {
    this.raf = requestAnimationFrame(this.animate.bind(this));
    if (!this.visible) return;

    var gl = this.gl;
    var size = this.gridSize;
    var data = this.data;

    this.time += 0.05;

    // 1) 整体衰减回弹
    for (var i = 0; i < size * size; i++) {
      data[i * 4] *= this.relaxation;
      data[i * 4 + 1] *= this.relaxation;
    }

    // 2) 鼠标速度注入（与官方同一套公式）
    var gridMouseX = size * this.mouseState.x;
    var gridMouseY = size * this.mouseState.y;
    var maxDist = size * this.mouse;
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        var dSq = Math.pow(gridMouseX - a, 2) + Math.pow(gridMouseY - b, 2);
        if (dSq < maxDist * maxDist) {
          var index = 4 * (a + size * b);
          var power = Math.min(maxDist / Math.sqrt(dSq), 10);
          data[index] += this.strength * 100 * this.mouseState.vX * power;
          data[index + 1] -= this.strength * 100 * this.mouseState.vY * power;
        }
      }
    }

    // 3) 上传偏移网格并渲染
    this.uploadData();
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  GridDistortion.prototype.destroy = function () {
    cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
  };

  global.GridDistortion = GridDistortion;
})(window);
