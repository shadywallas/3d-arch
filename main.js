(function () {
  const T = window.THREE;

  // State
  const props = {
    slatWidth: 2.5,
    slatDepth: 5,
    slatOffset: 0,
    gap: 4,
    slatCount: 5,
    woodTone: 'Oak',
    autoRotate: false,
    showSpec: true,
  };

  // ---- Layout math ----
  function layout() {
    const baseLen = 65;
    const pitch = props.slatWidth + props.gap;
    const slatCount = props.slatCount;
    const used = slatCount > 0 ? (slatCount + 1) * props.gap + slatCount * props.slatWidth : 0;
    const endMargin = Math.max(0, baseLen - used);
    return { baseLen, pitch, slatCount, endMargin };
  }

  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }

  function updateSpec() {
    const L = layout();
    document.getElementById('spec-section').textContent = fmt(props.slatWidth) + ' × ' + fmt(props.slatDepth) + ' cm';
    document.getElementById('spec-gap').textContent = fmt(props.gap) + ' cm';
    document.getElementById('spec-count').textContent = L.slatCount + ' slats';
    document.getElementById('spec-margin').textContent = fmt(L.endMargin) + ' cm';
  }

  // ---- Wood palettes ----
  function palette() {
    if (props.woodTone === 'Walnut') return { base: '#5d3f29', grain: '#3a2414', light: '#7c5836', rough: 0.55 };
    if (props.woodTone === 'Ash')    return { base: '#cdb791', grain: '#9c7f55', light: '#e3d3b3', rough: 0.62 };
    if (props.woodTone === 'Smoked') return { base: '#3a342e', grain: '#211d18', light: '#52493f', rough: 0.5 };
    return { base: '#bd8e57', grain: '#7c5128', light: '#d8b787', rough: 0.58 }; // Oak
  }

  function woodTexture(renderer) {
    const p = palette();
    const w = 320, h = 1280;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = p.base; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    g.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const draw = (count, color, maxAlpha, wMin, wMax, seed) => {
      // deterministic grain lines using LCG — Math.random() would differ each render
      let s = seed;
      const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
      for (let i = 0; i < count; i++) {
        const x0 = rand() * w;
        const phase = rand() * Math.PI * 2;
        const freq = 0.004 + rand() * 0.01;
        const amp = 1 + rand() * 3;
        ctx.beginPath();
        ctx.lineWidth = wMin + rand() * (wMax - wMin);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.03 + rand() * maxAlpha;
        let started = false;
        for (let y = -10; y <= h + 10; y += 9) {
          const drift = (x0 - w / 2) * 0.0006 * y;
          const xx = x0 + Math.sin(y * freq + phase) * amp + drift;
          if (!started) { ctx.moveTo(xx, y); started = true; } else ctx.lineTo(xx, y);
        }
        ctx.stroke();
      }
    };
    draw(190, p.grain, 0.10, 0.4, 1.1, 42);
    draw(70,  p.light, 0.07, 0.5, 1.4, 137);
    draw(40,  p.grain, 0.16, 0.6, 1.8, 251);
    ctx.globalAlpha = 0.05;
    let sp = 999;
    const sr = () => { sp = (sp * 1664525 + 1013904223) & 0xffffffff; return (sp >>> 0) / 0xffffffff; };
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = sr() > 0.5 ? p.grain : p.light;
      ctx.fillRect(sr() * w, sr() * h, 1, 1 + sr());
    }
    ctx.globalAlpha = 1;
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
    return tex;
  }

  function woodMaterial(realH, tileH, renderer, hGrain) {
    const p = palette();
    const tex = woodTexture(renderer);
    if (hGrain) {
      tex.repeat.set(Math.max(1, realH / tileH), 1);
      tex.rotation = Math.PI / 2;
      tex.center.set(0.5, 0.5);
    } else {
      tex.repeat.set(1, Math.max(1, realH / tileH));
    }
    return new T.MeshStandardMaterial({ map: tex, roughness: p.rough, metalness: 0.04 });
  }

  // ---- Procedural textures ----
  function tileTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#dedad2'; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#d4cfc6';
    [[0, 0], [256, 256]].forEach(([ox, oy]) => ctx.fillRect(ox, oy, 254, 254));
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2;
    [256].forEach(v => {
      ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(512, v); ctx.stroke();
    });
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(7, 10);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }

  function artworkTexture() {
    const c = document.createElement('canvas'); c.width = 300; c.height = 240;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f5f0e8'; ctx.fillRect(0, 0, 300, 240);
    [
      ['#c8503a', 20,  20,  100, 80,  0.82],
      ['#3a6ac8', 125, 15,  90,  110, 0.78],
      ['#e8c040', 22,  110, 72,  100, 0.75],
      ['#6aaa6a', 215, 130, 60,  90,  0.72],
      ['#c07840', 100, 125, 68,  82,  0.70],
      ['#5a6aaa', 175, 50,  50,  70,  0.65],
      ['#c8a030', 28,  72,  52,  32,  0.60],
      ['#a83838', 220, 30,  40,  55,  0.55],
    ].forEach(([color, x, y, w, h, a]) => {
      ctx.fillStyle = color; ctx.globalAlpha = a; ctx.fillRect(x, y, w, h);
    });
    ctx.globalAlpha = 1;
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }

  // ---- Three.js init ----
  const host = document.getElementById('canvas-host');
  const W = host.clientWidth || window.innerWidth;
  const H = host.clientHeight || window.innerHeight;

  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color(0xf0ede8);
  scene.fog = new T.Fog(0xf0ede8, 900, 1500);

  const camera = new T.PerspectiveCamera(58, W / H, 1, 3000);
  camera.position.set(60, 128, 740);

  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.target.set(80, 105, 80);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 80;
  controls.maxDistance = 1200;
  controls.maxPolarAngle = Math.PI / 2 + 0.12;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.4;
  controls.update();

  // ---- Lighting ----
  scene.add(new T.HemisphereLight(0xfff8f0, 0xe8e2d8, 0.55));
  scene.add(new T.AmbientLight(0xffffff, 0.18));

  const key = new T.DirectionalLight(0xfff8ee, 0.88);
  key.position.set(-180, 320, 300);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  const sk = key.shadow.camera;
  sk.left = -400; sk.right = 500; sk.top = 450; sk.bottom = -50; sk.near = 1; sk.far = 1800;
  sk.updateProjectionMatrix();
  scene.add(key);

  const fill = new T.DirectionalLight(0xfff5e8, 0.28);
  fill.position.set(100, 400, 100);
  scene.add(fill);

  const rim = new T.DirectionalLight(0xe0ecff, 0.16);
  rim.position.set(200, 100, -200);
  scene.add(rim);

  [[-80, 278, 380], [150, 278, 380], [-80, 278, 580], [150, 278, 580], [-80, 278, 720], [150, 278, 720]].forEach(([x, y, z]) => {
    const pt = new T.PointLight(0xfff8ee, 0.55, 380, 1.5);
    pt.position.set(x, y, z);
    scene.add(pt);
    const disc = new T.Mesh(
      new T.CircleGeometry(7, 16),
      new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8ee, emissiveIntensity: 1.8, side: T.DoubleSide })
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, 278, z);
    scene.add(disc);
  });

  // ---- Room geometry ----
  const wallMat  = new T.MeshStandardMaterial({ color: 0xf0ede8, roughness: 0.92, metalness: 0 });
  const ceilMat  = new T.MeshStandardMaterial({ color: 0xf5f4f2, roughness: 0.96, metalness: 0 });
  const corrMat  = new T.MeshStandardMaterial({ color: 0xe8e4de, roughness: 0.92, metalness: 0 });
  const floorMat = new T.MeshStandardMaterial({ map: tileTexture(), roughness: 0.86, metalness: 0.02 });

  const floor = new T.Mesh(new T.PlaneGeometry(720, 940), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(95, 0.5, 350);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new T.Mesh(new T.PlaneGeometry(720, 940), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(95, 280, 350);
  scene.add(ceil);

  const backWall = new T.Mesh(new T.BoxGeometry(720, 285, 8), wallMat);
  backWall.position.set(95, 140, 814);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new T.Mesh(new T.BoxGeometry(8, 285, 940), wallMat);
  leftWall.position.set(-226, 140, 350);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new T.Mesh(new T.BoxGeometry(8, 285, 940), wallMat);
  rightWall.position.set(463, 140, 350);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Divider wall: 155 cm opening (65 cm base + 90 cm walkable).
  // 20 cm thick to match base depth — front faces coplanar at z=20.
  const divL = new T.Mesh(new T.BoxGeometry(222, 285, 20), wallMat);
  divL.position.set(-111, 140, 10);
  scene.add(divL);

  const divR = new T.Mesh(new T.BoxGeometry(308, 285, 20), wallMat);
  divR.position.set(309, 140, 10);
  scene.add(divR);

  const corrWall = new T.Mesh(new T.BoxGeometry(720, 285, 8), corrMat);
  corrWall.position.set(95, 140, -112);
  scene.add(corrWall);

  const coveMat = new T.MeshStandardMaterial({ color: 0xfafaf8, emissive: 0xfff8e8, emissiveIntensity: 0.55 });
  const cove = new T.Mesh(new T.BoxGeometry(560, 10, 20), coveMat);
  cove.position.set(80, 277, 755);
  scene.add(cove);

  const skirtMat = new T.MeshStandardMaterial({ color: 0xfaf8f4, roughness: 0.7 });
  [
    [new T.BoxGeometry(720, 7, 5), 95,   3.5, 811],
    [new T.BoxGeometry(5, 7, 940), -223, 3.5, 350],
  ].forEach(([geo, x, y, z]) => {
    const m = new T.Mesh(geo, skirtMat); m.position.set(x, y, z); scene.add(m);
  });

  // ---- Furniture ----
  function addM(geo, mat, x, y, z, shadow = true) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    scene.add(m); return m;
  }

  const sofaMat  = new T.MeshStandardMaterial({ color: 0x68655f, roughness: 0.88 });
  const cushMat  = new T.MeshStandardMaterial({ color: 0x5a5752, roughness: 0.92 });
  const throwMat = new T.MeshStandardMaterial({ color: 0xdedad4, roughness: 0.96 });
  const whiteMat = new T.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.68, metalness: 0.02 });

  addM(new T.BoxGeometry(230, 40, 100),  sofaMat,  20,  20,  490);
  addM(new T.BoxGeometry(230, 52, 18),   sofaMat,  20,  46,  538);
  addM(new T.BoxGeometry(18, 30, 100),   sofaMat, -88,  35,  490);
  addM(new T.BoxGeometry(18, 30, 100),   sofaMat, 128,  35,  490);
  [-90, 20, 128].forEach(x => addM(new T.BoxGeometry(68, 12, 88),  cushMat, x, 43, 487));
  [-90, 20, 128].forEach(x => addM(new T.BoxGeometry(68, 48, 14),  cushMat, x, 50, 532));
  addM(new T.BoxGeometry(90, 5, 70),     throwMat, -75, 50,  478);

  addM(new T.BoxGeometry(90, 40, 190),   sofaMat, -130, 20,  435);
  addM(new T.BoxGeometry(18, 30, 190),   sofaMat, -173, 35,  435);
  addM(new T.BoxGeometry(80, 14, 165),   cushMat, -130, 45,  430);

  addM(new T.CylinderGeometry(58, 58, 5, 48),  whiteMat, 20, 37, 360);
  addM(new T.CylinderGeometry(18, 23, 37, 20), whiteMat, 20, 18, 360);
  addM(new T.CylinderGeometry(5, 5, 14, 14),
    new T.MeshStandardMaterial({ color: 0x3a5c2a, roughness: 0.9 }), 30, 46, 352);
  addM(new T.CylinderGeometry(4, 6, 20, 14),
    new T.MeshStandardMaterial({ color: 0xeae4d8, roughness: 0.7 }), 5, 45, 368);

  const rugC = document.createElement('canvas'); rugC.width = rugC.height = 256;
  const rCtx = rugC.getContext('2d');
  rCtx.fillStyle = '#eeeae2'; rCtx.fillRect(0, 0, 256, 256);
  rCtx.strokeStyle = 'rgba(186,178,160,0.4)'; rCtx.lineWidth = 3;
  [13, 22].forEach(i => rCtx.strokeRect(i, i, 256 - 2 * i, 256 - 2 * i));
  const rug = new T.Mesh(
    new T.PlaneGeometry(340, 280),
    new T.MeshStandardMaterial({ map: new T.CanvasTexture(rugC), roughness: 0.96 })
  );
  rug.rotation.x = -Math.PI / 2; rug.position.set(10, 1, 430); rug.receiveShadow = true;
  scene.add(rug);

  const artMat = new T.MeshStandardMaterial({ map: artworkTexture() });
  addM(new T.PlaneGeometry(122, 98), new T.MeshStandardMaterial({ color: 0xfaf9f7 }), 20, 170, 810, false);
  addM(new T.PlaneGeometry(110, 88), artMat, 20, 170, 811, false);

  addM(new T.BoxGeometry(90, 20, 14),
    new T.MeshStandardMaterial({ color: 0xf0ede8, roughness: 0.8 }), -224, 261, 500);

  const corrLight = new T.PointLight(0xfff8ee, 0.28, 200, 2);
  corrLight.position.set(55, 200, -65);
  scene.add(corrLight);

  // ---- Partition model ----
  let modelGroup = null;

  function buildModel() {
    if (modelGroup) {
      scene.remove(modelGroup);
      modelGroup.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }

    const grp = new T.Group();
    const totalH = 243.5;
    const baseH = 20, baseD = 20;
    const L = layout();
    const { baseLen, pitch, slatCount } = L;
    const slatW = props.slatWidth, slatD = props.slatDepth;
    const slatH = totalH - baseH;
    const baseX0 = 0;

    const baseMat = woodMaterial(baseLen, 90, renderer, true);
    const base = new T.Mesh(new T.BoxGeometry(baseLen, baseH, baseD), baseMat);
    base.position.set(baseX0 + baseLen / 2, baseH / 2, baseD / 2);
    base.castShadow = base.receiveShadow = true;
    grp.add(base);

    const slatGeo = new T.BoxGeometry(slatW, slatH, slatD);
    for (let i = 0; i < slatCount; i++) {
      const m = woodMaterial(slatH, 130, renderer, false);
      const slat = new T.Mesh(slatGeo, m);
      const x = baseX0 + props.gap + slatW / 2 + i * pitch;
      const slatZ = baseD - props.slatOffset - slatD / 2;
      slat.position.set(x, baseH + slatH / 2, slatZ);
      slat.castShadow = slat.receiveShadow = true;
      grp.add(slat);
    }

    modelGroup = grp;
    scene.add(grp);
  }

  buildModel();
  updateSpec();

  // ---- Render loop ----
  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();

  // ---- Resize ----
  window.addEventListener('resize', () => {
    const nw = host.clientWidth, nh = host.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });

  // ---- Controls wiring ----
  function bindSlider(id, valId, propKey) {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    el.addEventListener('input', () => {
      props[propKey] = parseFloat(el.value);
      val.textContent = el.value;
      buildModel();
      updateSpec();
    });
  }

  const soSlider = document.getElementById('so');
  const soVal = document.getElementById('so-val');

  function updateOffsetMax() {
    const max = Math.max(0, 20 - props.slatDepth);
    soSlider.max = max;
    if (props.slatOffset > max) {
      props.slatOffset = max;
      soSlider.value = max;
      soVal.textContent = max;
    }
  }

  bindSlider('sw', 'sw-val', 'slatWidth');

  document.getElementById('sd').addEventListener('input', e => {
    props.slatDepth = parseFloat(e.target.value);
    document.getElementById('sd-val').textContent = e.target.value;
    updateOffsetMax();
    buildModel();
    updateSpec();
  });

  soSlider.addEventListener('input', () => {
    props.slatOffset = parseFloat(soSlider.value);
    soVal.textContent = soSlider.value;
    buildModel();
  });

  bindSlider('gap', 'gap-val', 'gap');
  bindSlider('sc', 'sc-val', 'slatCount');

  updateOffsetMax();

  document.getElementById('tone').addEventListener('change', e => {
    props.woodTone = e.target.value;
    buildModel();
  });

  const btnRotate = document.getElementById('btn-rotate');
  btnRotate.addEventListener('click', () => {
    props.autoRotate = !props.autoRotate;
    controls.autoRotate = props.autoRotate;
    btnRotate.textContent = props.autoRotate ? 'On' : 'Off';
    btnRotate.classList.toggle('active', props.autoRotate);
  });

  const btnSpec = document.getElementById('btn-spec');
  const specPanel = document.getElementById('spec-panel');
  btnSpec.addEventListener('click', () => {
    props.showSpec = !props.showSpec;
    specPanel.style.display = props.showSpec ? 'block' : 'none';
    btnSpec.textContent = props.showSpec ? 'On' : 'Off';
    btnSpec.classList.toggle('active', props.showSpec);
  });
})();
