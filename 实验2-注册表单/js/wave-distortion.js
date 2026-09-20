/*
 * GridDistortion - 网格扭曲
 * 贴图在鼠标周围产生「水波荡漾」般的径向 UV 位移，离开后缓慢回弹。
 *
 * 零依赖 WebGL 实现，不挑框架。
 *
 * 用法:
 *   const gd = new GridDistortion(canvasEl, {
 *     image: '/assets/logo.png',                 // URL / HTMLImageElement / Canvas
 *     strength: 0.22,
 *     radius: 0.55,
 *     waveFreq: 16,
 *     waveAmp: 0.055
 *   });
 *   gd.set({ strength: 0.35 });   // 运行时改参数
 *   gd.destroy();
 *
 * 没有图片时可用内置生成器画一张占位贴图:
 *   image: GridDistortion.createTextTexture({ text: 'MY LOGO' })
 */
(function (global) {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2  uRes;',
    'uniform vec2  uImg;',
    'uniform vec2  uMouse;',
    'uniform float uTime;',
    'uniform float uHover;',
    'uniform float uStrength;',
    'uniform float uRadius;',
    'uniform float uWaveFreq;',
    'uniform float uWaveAmp;',

    'void main(){',
    // background-size: cover 的等比裁切
    '  float ra = uRes.x / uRes.y;',
    '  float ri = uImg.x / uImg.y;',
    '  vec2 ratio = vec2(min(ra / ri, 1.0), min(ri / ra, 1.0));',
    '  vec2 uv = vec2(',
    '    vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,',
    '    vUv.y * ratio.y + (1.0 - ratio.y) * 0.5',
    '  );',

    // 转到「各向同性」空间算距离，避免宽高比把圆形扭曲拉成椭圆
    '  vec2 asp = vec2(uRes.x / uRes.y, 1.0);',
    '  vec2 p = (uv - uMouse) * asp;',
    '  float dist = length(p);',

    // 衰减：离光标越远推动越弱，2 次方让边界过渡更柔
    '  float falloff = 1.0 - smoothstep(0.0, uRadius, dist);',
    '  falloff = falloff * falloff;',

    // 叠加一圈随时间推进的正弦波，形成持续荡漾
    '  float wave = sin(dist * uWaveFreq - uTime * 2.2);',

    '  vec2 dir = vec2(0.0);',
    '  if (dist > 0.0001) dir = p / dist;',

    '  vec2 offset = dir * falloff * (uStrength + wave * uWaveAmp) * uHover;',
    '  uv += offset / asp;',

    '  gl_FragColor = texture2D(uTex, uv);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('GridDistortion shader 编译失败: ' + log);
    }
    return sh;
  }

  function createProgram(gl, vs, fs) {
    var p = gl.createProgram();
    var a = compile(gl, gl.VERTEX_SHADER, vs);
    var b = compile(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, a);
    gl.attachShader(p, b);
    gl.linkProgram(p);
    gl.deleteShader(a);
    gl.deleteShader(b);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error('GridDistortion program 链接失败: ' + log);
    }
    return p;
  }

  /* 生成一张占位贴图，没素材时也能直接跑起来 */
  function createTextTexture(opts) {
    opts = opts || {};
    var w = opts.width || 1200;
    var h = opts.height || 600;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');

    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, opts.bgFrom || '#111a38');
    g.addColorStop(1, opts.bgTo || '#05070f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var rg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
    rg.addColorStop(0, 'rgba(110,140,255,0.35)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    if (opts.grid !== false) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (var x = 0; x <= w; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (var y = 0; y <= h; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + (opts.fontSize || 150) + 'px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    if (opts.letterSpacing) ctx.letterSpacing = opts.letterSpacing;
    ctx.fillStyle = opts.color || '#eaf0ff';
    ctx.shadowColor = 'rgba(120,150,255,0.55)';
    ctx.shadowBlur = 40;
    ctx.fillText(opts.text || 'LOGO', w / 2, h / 2);

    return c;
  }

  function GridDistortion(canvas, options) {
    if (!canvas) throw new Error('GridDistortion: 需要一个 canvas 元素');

    this.canvas = canvas;
    this.opts = Object.assign({
      image: null,
      strength: 0.22,
      radius: 0.55,
      waveFreq: 16,
      waveAmp: 0.055,
      followEase: 0.1,
      hoverEase: 0.06,
      idleCenter: true,
      maxDpr: 2
    }, options || {});

    this.mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    this.hover = 0;
    this.hoverTarget = 0;
    this.startTime = 0;
    this.visible = true;
    this.destroyed = false;
    this.imageReady = false;

    this.reduced = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    var attrs = { alpha: true, antialias: true, premultipliedAlpha: false, depth: false };
    this.gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!this.gl) {
      canvas.style.display = 'none';
      console.warn('GridDistortion: 当前环境不支持 WebGL，已降级为隐藏。');
      return;
    }

    try {
      this.program = createProgram(this.gl, VERT, FRAG);
    } catch (e) {
      console.error(e);
      canvas.style.display = 'none';
      return;
    }

    this._initGL();
    this._bindEvents();
    this.setTexture(this.opts.image || createTextTexture());
    this.resize();
    this.start();
  }

  GridDistortion.prototype._initGL = function () {
    var gl = this.gl;
    gl.useProgram(this.program);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    ['uTex', 'uRes', 'uImg', 'uMouse', 'uTime', 'uHover', 'uStrength', 'uRadius',
      'uWaveFreq', 'uWaveAmp'].forEach(function (n) {
        this.u[n] = gl.getUniformLocation(this.program, n);
      }, this);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    // NPOT 贴图的安全配置：钳边 + 线性过滤 + 不用 mipmap
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
  };

  GridDistortion.prototype.setTexture = function (source) {
    var gl = this.gl;
    if (!gl) return this;
    var self = this;

    function upload(src) {
      var w = src.naturalWidth || src.videoWidth || src.width;
      var h = src.naturalHeight || src.videoHeight || src.height;
      gl.bindTexture(gl.TEXTURE_2D, self.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      self.imgW = w;
      self.imgH = h;
      self.imageReady = true;
    }

    if (typeof source === 'string') {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { upload(img); };
      img.src = source;
    } else if (source && (source.tagName === 'IMG')) {
      if (source.complete && source.naturalWidth) upload(source);
      else source.addEventListener('load', function () { upload(source); });
    } else if (source && source.width) {
      upload(source);
    }
    return this;
  };

  GridDistortion.prototype._bindEvents = function () {
    var self = this;
    var target = this.canvas.parentElement || this.canvas;
    this.pointerTarget = target;

    this._onMove = function (e) {
      var r = target.getBoundingClientRect();
      self.mouse.tx = (e.clientX - r.left) / r.width;
      self.mouse.ty = 1 - (e.clientY - r.top) / r.height;
      self.hoverTarget = 1;
    };
    this._onLeave = function () { self.hoverTarget = 0; };

    target.addEventListener('pointermove', this._onMove, { passive: true });
    target.addEventListener('pointerleave', this._onLeave, { passive: true });

    if (global.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self.resize(); });
      this._ro.observe(target);
    } else {
      this._onResize = function () { self.resize(); };
      global.addEventListener('resize', this._onResize);
    }

    if (global.IntersectionObserver) {
      this._io = new IntersectionObserver(function (en) {
        self.visible = en[0].isIntersecting;
      }, { threshold: 0 });
      this._io.observe(this.canvas);
    }
  };

  GridDistortion.prototype.resize = function () {
    if (!this.gl) return;
    var t = this.pointerTarget || this.canvas.parentElement || this.canvas;
    var w = t.clientWidth || this.canvas.clientWidth || 1;
    var h = t.clientHeight || this.canvas.clientHeight || 1;
    var dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);

    var pw = Math.max(1, Math.round(w * dpr));
    var ph = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
      this.gl.viewport(0, 0, pw, ph);
    }
    this.cssW = w;
    this.cssH = h;
    this.dpr = dpr;
  };

  GridDistortion.prototype.start = function () {
    var self = this;
    this.startTime = performance.now();
    if (this.reduced) {
      this.hover = 0;
      this.render(performance.now());
      return;
    }
    function frame(now) {
      if (self.destroyed) return;
      if (self.visible) self.render(now);
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };

  GridDistortion.prototype.render = function (now) {
    var gl = this.gl;
    if (!gl || !this.imageReady) return;
    var o = this.opts;

    this.resize();

    // 未悬停时以极缓慢的圆周运动维持一点点「呼吸」，完全静止会显得很死
    var t = (now - this.startTime) / 1000;
    if (o.idleCenter && this.hover < 0.02) {
      this.mouse.tx = 0.5 + Math.cos(t * 0.35) * 0.16;
      this.mouse.ty = 0.5 + Math.sin(t * 0.27) * 0.14;
    }

    this.mouse.x += (this.mouse.tx - this.mouse.x) * o.followEase;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * o.followEase;
    this.hover += (this.hoverTarget - this.hover) * o.hoverEase;

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uImg, this.imgW, this.imgH);
    gl.uniform2f(this.u.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.u.uTime, t);
    gl.uniform1f(this.u.uHover, this.hover);
    gl.uniform1f(this.u.uStrength, o.strength);
    gl.uniform1f(this.u.uRadius, o.radius);
    gl.uniform1f(this.u.uWaveFreq, o.waveFreq);
    gl.uniform1f(this.u.uWaveAmp, o.waveAmp);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  GridDistortion.prototype.set = function (patch) {
    Object.assign(this.opts, patch || {});
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'image')) {
      this.setTexture(patch.image);
    }
    if (this.reduced) this.render(performance.now());
    return this;
  };

  GridDistortion.prototype.destroy = function () {
    this.destroyed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    var target = this.pointerTarget;
    if (target && this._onMove) {
      target.removeEventListener('pointermove', this._onMove);
      target.removeEventListener('pointerleave', this._onLeave);
    }
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this._onResize) global.removeEventListener('resize', this._onResize);
  };

  GridDistortion.createTextTexture = createTextTexture;
  global.WaveDistortion = GridDistortion;
})(window);
