// --- SceneConfig 및 Canvas 배경 이미지 모듈 (v13 호환) ---

Hooks.on("renderSceneConfig", async (app, html) => {
  if (!app.isEditable) return;
  const scene = app.document;
  const currentImage = scene.getFlag("rils-scene-bg", "backgroundImage") || "";

  const $form = $(html); // html 사용

  if ($form.find(".rils-scene-bg-group").length === 0) {
    const $injection = $(`
      <div class="form-group rils-scene-bg-group">
        <label>배경 이미지</label>
        <div class="form-fields">
          <input type="text" name="flags.rils-scene-bg.backgroundImage" value="${currentImage}" placeholder="배경 이미지 경로를 입력하세요">
          <button type="button" class="file-picker">파일 선택</button>
        </div>
        <p class="notes">배경 색상을 덮어씁니다.</p>
      </div>
    `);

    // --- 배경 색상 뒤에 삽입 ---
    const $target = $form
      .find('color-picker[name="backgroundColor"]')
      .closest(".form-group");
    if ($target.length) {
      $target.after($injection);
    } else {
      $form.append($injection); // 백업: 없으면 마지막에 추가
    }
  }

  const $bgGroup = $form.find(".rils-scene-bg-group");

  // 파일 선택 버튼
  $bgGroup.find(".file-picker").on("click", () => {
    const picker = new FilePicker({
      type: "image",
      current: $bgGroup
        .find('input[name="flags.rils-scene-bg.backgroundImage"]')
        .val(),
      callback: (path) => {
        $bgGroup
          .find('input[name="flags.rils-scene-bg.backgroundImage"]')
          .val(path);
      },
    });
    picker.render(true);
  });

  // 저장 시 플래그 적용
  app.setFlagOnSubmit = async () => {
    const inputVal = $bgGroup
      .find('input[name="flags.rils-scene-bg.backgroundImage"]')
      .val();
    if (scene.setFlag) {
      await scene.setFlag("rils-scene-bg", "backgroundImage", inputVal || null);
    }
  };

  // submit 이벤트 바인딩
  $form.closest("form").on("submit", async (event) => {
    event.preventDefault();
    if (app.setFlagOnSubmit) await app.setFlagOnSubmit();
    app.submit(); // 기본 SceneConfig submit 처리
  });
});

Hooks.on("canvasReady", (canvas) => {
  const scene = canvas.scene;
  const bgImage = scene.getFlag("rils-scene-bg", "backgroundImage");
  if (!bgImage) return;

  // 기존 Sprite 제거
  canvas.stage.children
    .filter((c) => c?.rilsSceneBgSprite)
    .forEach((c) => canvas.stage.removeChild(c));

  const tex = PIXI.Texture.from(bgImage);
  const sprite = new PIXI.Sprite(tex);

  sprite.width = canvas.dimensions.sceneWidth;
  sprite.height = canvas.dimensions.sceneHeight;
  sprite.zIndex = -100;
  sprite.alpha = 1;
  sprite.interactive = false;
  sprite.buttonMode = false;

  sprite.rilsSceneBgSprite = true;
  canvas.stage.addChildAt(sprite, 0);
});
